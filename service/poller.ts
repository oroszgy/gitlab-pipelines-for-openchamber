/**
 * The service's background poller.
 *
 * It polls each Watched Ref on a slower floor than the Panel, adaptively
 * widening as the active Pipeline ages, and records a Terminal event for every
 * settled Pipeline it has not recorded before. It calls GitLab through the same
 * `proxyWithConfig`/`handleProxy` path as a Panel request, so it inherits the
 * body cap, the `redirect: 'manual'` handling and the response-header
 * allowlist — and never holds a token itself, resolving one per call from the
 * configuration.
 *
 * Pure where it matters: the clock and `fetch` are injected, `pollOnce` is a
 * single pass a test can drive directly, and `createPoller` only adds the
 * timer around it.
 */

import {
  appendEvent,
  clearWatchError,
  readConfig,
  saveConfig,
  setWatchError,
  type ConfigFs,
  type Event,
} from './config';
import type { ProxyFetch } from './proxy';
import { proxyWithConfig } from './routes';

/** The slow floor the unattended poller runs at. The Panel's own interval is much shorter. */
export const SERVICE_POLL_INTERVAL_MS = 60_000;

/** The Pipeline statuses that settle a run: a Terminal event is one of these. */
export const TERMINAL_STATUSES: readonly string[] = ['success', 'failed', 'canceled'];

const TERMINAL = new Set(TERMINAL_STATUSES);

/** Whether a Pipeline Status has settled for good. */
export function isTerminalStatus(status: string | null | undefined): boolean {
  return status != null && TERMINAL.has(status);
}

/** How recently GitLab moved a project, so its redirect is not followed. */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** The recorded error for a project whose GitLab path has moved. It is not followed. */
export const MOVED_PROJECT_ERROR = 'The GitLab project has moved.';

/** How many Pipelines of a Ref one poll reads. The newest are first. */
const PIPELINES_PER_PAGE = 20;

/** `/api/v4/projects/:encoded-path` — GitLab accepts the URL-encoded path. */
function pipelinePath(project: string): string {
  return `/api/v4/projects/${encodeURIComponent(project)}/pipelines`;
}

/**
 * `Retry-After` in milliseconds: delta-seconds or an HTTP date. Null when absent
 * or unparseable; a date in the past floors at zero. Mirrors the Panel's parser.
 */
export function parseRetryAfterMs(value: string | null | undefined, nowMs: number): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - nowMs);
}

/**
 * The adaptive rule, mirroring the Panel's: a long-running Pipeline backs off so
 * an all-night run is not polled at full rate. `elapsedMs` is the age of the
 * activity being watched.
 */
export function widenedDelay(baseMs: number, elapsedMs: number): number {
  const backoff = elapsedMs > 10 * 60_000 ? 3 : elapsedMs > 2 * 60_000 ? 2 : 1;
  return baseMs * backoff;
}

/**
 * A rate-limited poll's retry delay: honour `Retry-After` when GitLab sent it,
 * otherwise widen the ordinary delay so the poller backs off on its own.
 */
export function rateLimitedDelay(baseMs: number, retryAfterMs: number | null): number {
  return retryAfterMs != null ? Math.max(baseMs, retryAfterMs) : baseMs * 2;
}

/**
 * A Pipeline as the poller needs it: an id, a Status, when it was created, and
 * when it last settled. `settledAt` is `updated_at`, falling back to
 * `created_at` when GitLab omits it.
 */
type PipelineSummary = {
  id: number;
  status: string;
  createdAt: string | null;
  settledAt: string | null;
};

/** Parse the Pipeline-list body, ignoring anything that is not `{id, status}`. */
function parsePipelines(body: string): PipelineSummary[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const pipelines: PipelineSummary[] = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'number' || typeof record.status !== 'string') continue;
    const created = typeof record.created_at === 'string' ? record.created_at : null;
    const updated = typeof record.updated_at === 'string' ? record.updated_at : null;
    pipelines.push({
      id: record.id,
      status: record.status,
      createdAt: created,
      settledAt: updated ?? created,
    });
  }
  return pipelines;
}

/**
 * Whether a Pipeline settled within the watch's lifetime, so a pre-watch outcome
 * is not toasted when a watch is first set. Timestamps are compared as epoch
 * milliseconds, so equivalent ISO spellings (`Z` vs an offset) order correctly.
 *
 * A missing or unparseable settle time cannot be shown to be after the watch was
 * set, so it is skipped: the conservative choice for a feature whose whole point
 * is to avoid notifying about outcomes the user never opted into. A watch whose
 * own `addedAt` is unparseable is the one case where recording is preferred, so a
 * corrupt timestamp does not silently swallow every event.
 */
function settledAfterWatch(settleTime: string | null, addedAt: string): boolean {
  const addedAtMs = Date.parse(addedAt);
  if (Number.isNaN(addedAtMs)) return true;
  if (settleTime == null) return false;
  const settleMs = Date.parse(settleTime);
  if (Number.isNaN(settleMs)) return false;
  return settleMs >= addedAtMs;
}

/** The age of the oldest still-moving Pipeline, or 0 when everything has settled. */
function activityAgeMs(pipelines: PipelineSummary[], nowMs: number): number {
  let age = 0;
  for (const pipeline of pipelines) {
    if (isTerminalStatus(pipeline.status)) continue;
    const created = pipeline.createdAt == null ? Number.NaN : Date.parse(pipeline.createdAt);
    if (Number.isNaN(created)) continue;
    age = Math.max(age, nowMs - created);
  }
  return age;
}

/** The host and project a watch key (`host/project`) names, or null when malformed. */
function parseWatchKey(key: string): { host: string; project: string } | null {
  const slash = key.indexOf('/');
  if (slash <= 0) return null;
  const host = key.slice(0, slash);
  const project = key.slice(slash + 1);
  if (!host || !project) return null;
  return { host, project };
}

/** A request for one Watched Ref's Pipeline list. */
function pipelinesRequest(host: string, project: string, ref: string) {
  return {
    baseUrl: host,
    method: 'GET' as const,
    path: pipelinePath(project),
    query: { ref, per_page: String(PIPELINES_PER_PAGE) },
  };
}

export type PollOutcome = {
  /** Milliseconds before the next poll: the floor, widened by age or a 429. */
  delayMs: number;
  /** Whether a `429` paused this poll and widened the next one. */
  paused: boolean;
  /** How many new Terminal events were recorded. */
  recorded: number;
};

export type PollContext = {
  fs: ConfigFs;
  path: string;
  fetchImpl: ProxyFetch;
  /** The clock, injected so tests fix the time. Defaults to the wall clock. */
  now?: () => Date;
  /** The slow floor, overridable for tests. */
  intervalMs?: number;
};

/** One recorded error update, applied after the network pass. */
type ErrorUpdate = { host: string; project: string; error: string | null };

/**
 * Poll every Watched Ref once. With no watches this makes no GitLab call at all.
 * A `429` pauses; a moved project is recorded as a watch error rather than
 * followed; a settled Pipeline is recorded once, deduped by identity.
 */
export async function pollOnce(context: PollContext): Promise<PollOutcome> {
  const { fs, path, fetchImpl } = context;
  const now = context.now ?? (() => new Date());
  const intervalMs = context.intervalMs ?? SERVICE_POLL_INTERVAL_MS;

  const startedAt = now();
  const nowMs = startedAt.getTime();

  const config = await readConfig(fs, path);
  const keys = Object.keys(config.watches);
  if (keys.length === 0) return { delayMs: intervalMs, paused: false, recorded: 0 };

  const events: Event[] = [];
  const errors: ErrorUpdate[] = [];
  let elapsedMs = 0;
  let retryAfterMs: number | null = null;
  let paused = false;

  for (const key of keys) {
    const parsed = parseWatchKey(key);
    const watch = config.watches[key];
    if (!parsed || !watch) continue;

    const result = await proxyWithConfig(
      fs,
      path,
      pipelinesRequest(parsed.host, parsed.project, watch.ref),
      fetchImpl,
    );

    // A host with no token is skipped rather than treated as a failure; there
    // is simply nothing to poll with. A transport error likewise records no
    // event — only a settled Pipeline does.
    if (!result.ok) continue;

    if (result.status === 429) {
      paused = true;
      const retry = parseRetryAfterMs(result.headers['retry-after'], nowMs);
      if (retry != null && (retryAfterMs == null || retry > retryAfterMs)) retryAfterMs = retry;
      // A 429 pauses the whole pass: polling the remaining Refs now would only
      // spend more of a budget GitLab has already refused (ticket #65).
      break;
    }

    // A moved project's redirect is not followed; it is recorded as a watch
    // error for the Panel to explain.
    if (REDIRECT_STATUSES.has(result.status)) {
      if (watch.error !== MOVED_PROJECT_ERROR) {
        errors.push({ host: parsed.host, project: parsed.project, error: MOVED_PROJECT_ERROR });
      }
      continue;
    }

    if (result.status !== 200) continue;

    // A project that answers again heals a previous move error.
    if (watch.error != null) {
      errors.push({ host: parsed.host, project: parsed.project, error: null });
    }

    const pipelines = parsePipelines(result.body);
    elapsedMs = Math.max(elapsedMs, activityAgeMs(pipelines, nowMs));
    const at = startedAt.toISOString();
    for (const pipeline of pipelines) {
      if (!isTerminalStatus(pipeline.status)) continue;
      // Suppress a Pipeline that settled before the user asked to watch it: a
      // running Pipeline carries a late `updated_at` and is still recorded.
      if (!settledAfterWatch(pipeline.settledAt, watch.addedAt)) continue;
      events.push({
        host: parsed.host,
        project: parsed.project,
        ref: watch.ref,
        pipelineId: pipeline.id,
        status: pipeline.status,
        at,
      });
    }
  }

  // Re-read before saving, so a request that set or cleared a watch while the
  // network calls were in flight is not clobbered by writing a stale config.
  let recorded = 0;
  if (events.length > 0 || errors.length > 0) {
    let latest = await readConfig(fs, path);
    for (const update of errors) {
      latest =
        update.error == null
          ? clearWatchError(latest, update.host, update.project)
          : setWatchError(latest, update.host, update.project, update.error);
    }
    for (const event of events) {
      const next = appendEvent(latest, event);
      if (next !== latest) {
        recorded += 1;
        latest = next;
      }
    }
    await saveConfig(fs, path, latest);
  }

  let delayMs = widenedDelay(intervalMs, elapsedMs);
  if (paused) delayMs = rateLimitedDelay(delayMs, retryAfterMs);
  return { delayMs, paused, recorded };
}

/** The timer seam, so a scheduler can be driven without real timers. */
export type PollerTimers = {
  setTimeout(handler: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

/**
 * The running poller: one pass at a time, rescheduling itself at the delay the
 * last pass chose. `start` arms the first poll on the floor; `stop` cancels it.
 */
export type Poller = {
  pollOnce(): Promise<PollOutcome>;
  start(): void;
  stop(): void;
  isRunning(): boolean;
};

const defaultTimers: PollerTimers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createPoller(options: PollContext & { timers?: PollerTimers }): Poller {
  const timers = options.timers ?? defaultTimers;
  const intervalMs = options.intervalMs ?? SERVICE_POLL_INTERVAL_MS;
  let handle: unknown = null;
  let running = false;

  const run = async (): Promise<void> => {
    if (!running) return;
    const outcome = await pollOnce(options);
    if (!running) return;
    schedule(outcome.delayMs);
  };

  const schedule = (delayMs: number): void => {
    handle = timers.setTimeout(() => {
      handle = null;
      void run();
    }, delayMs);
  };

  return {
    pollOnce: () => pollOnce(options),
    start(): void {
      if (running) return;
      running = true;
      schedule(intervalMs);
    },
    stop(): void {
      running = false;
      if (handle !== null) {
        timers.clearTimeout(handle);
        handle = null;
      }
    },
    isRunning: () => running,
  };
}
