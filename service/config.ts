/**
 * The Extension's configuration store.
 *
 * The Proxy service owns the Extension's configuration — the Configured host
 * (defaulting to `gitlab.com`), the Project override and one Access token per
 * host — and persists it as a `0600` file in the user's config directory. Pure
 * and injectable through its one seam, the filesystem, so it is tested without
 * disk; the loopback server around it is a shell.
 */

import { dirname, posix, win32 } from 'node:path';
import { HOST_ERROR, normalizeBaseUrl } from './proxy';

/** The environment the config path is resolved from, injected so tests choose a platform. */
export type Env = Record<string, string | undefined>;

export const DEFAULT_HOST = 'gitlab.com';

/** A Watched Ref: the one Ref a project is watched on, when it was set, and any poll error. */
export type Watch = { ref: string; addedAt: string; error?: string };

/**
 * A Terminal event: a Pipeline on a Watched Ref reaching a settled Status. The
 * identity is host + project + ref + pipelineId + status, so the same outcome
 * recorded twice is one event.
 */
export type Event = {
  host: string;
  project: string;
  ref: string;
  pipelineId: number;
  status: string;
  at: string;
};

/** How many Terminal events the log keeps; the oldest is dropped past this. */
export const EVENT_LOG_MAX = 200;

export type Config = {
  /** The Configured host, a normalized authority such as `gitlab.com`. */
  host: string;
  /** The Project override, or `''` when unset. */
  project: string;
  /** One Access token per normalized host. */
  tokens: Record<string, string>;
  /** One Watched Ref per normalized `host/project` key. */
  watches: Record<string, Watch>;
  /** The bounded Terminal event log, oldest first. */
  events: Event[];
  /** How many events have ever been recorded; the cursor `eventsAfter` reads past. */
  eventSeq: number;
  /** How many recorded events a surface has marked seen; the watermark it advances. */
  seen: number;
};

/**
 * The filesystem seam: read, write, chmod and directory create. A write applies
 * `mode` only when it creates the file, so the store `chmod`s after every write
 * to leave the file at `0600` even when it already existed.
 */
export type ConfigFs = {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string, mode: number): Promise<void>;
  chmod(path: string, mode: number): Promise<void>;
  mkdir(path: string): Promise<void>;
};

export function defaultConfig(): Config {
  return { host: DEFAULT_HOST, project: '', tokens: {}, watches: {}, events: [], eventSeq: 0, seen: 0 };
}

/**
 * The configuration file's path for a platform: XDG on Linux (falling back to
 * `~/.config`), Application Support on macOS, APPDATA on Windows.
 */
export function configPath(env: Env, platform: string = process.platform): string {
  if (platform === 'win32') {
    const base = env.APPDATA ?? env.USERPROFILE;
    if (!base) throw new Error('APPDATA is not set.');
    return win32.join(base, 'gitlab-pipelines', 'config.json');
  }
  if (platform === 'darwin') {
    if (!env.HOME) throw new Error('HOME is not set.');
    return posix.join(env.HOME, 'Library', 'Application Support', 'gitlab-pipelines', 'config.json');
  }
  const xdg = env.XDG_CONFIG_HOME;
  const base = xdg ? xdg : env.HOME ? posix.join(env.HOME, '.config') : undefined;
  if (!base) throw new Error('HOME is not set.');
  return posix.join(base, 'gitlab-pipelines', 'config.json');
}

/**
 * A Configured host from a bare host or a full origin, as a lowercase authority
 * (`gitlab.com`, `gitlab.example.com:8443`). Refused unless it is `https` with no
 * credentials and no path beyond the root.
 */
export function normalizeHost(input: string): string | null {
  const origin = normalizeBaseUrl(input);
  if (!origin) return null;
  return new URL(origin).host;
}

/**
 * The valid token entries of a stored map, keyed by normalized host. An entry
 * with a malformed host or a non-string value counts as dropped, so a writer can
 * refuse it while a reader ignores it.
 */
function normalizeTokens(raw: unknown): { tokens: Record<string, string>; dropped: number } {
  const tokens: Record<string, string> = {};
  let dropped = 0;
  if (typeof raw === 'object' && raw !== null) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const normalized = normalizeHost(key);
      if (normalized && typeof value === 'string' && value) tokens[normalized] = value;
      else dropped += 1;
    }
  }
  return { tokens, dropped };
}

/** The refusal for a watch that names no project to key on. */
const PROJECT_ERROR = 'A project is required to watch.';

/** The refusal for a watch that names no Ref to poll. */
const REF_ERROR = 'A Ref is required to watch.';

/**
 * The configuration key for a project's watch: the normalized host and the
 * project path joined by `/`. A host never contains a `/`, so the first `/` is
 * the separator and the key stays unambiguous.
 */
function watchKey(
  host: string,
  project: string,
): { ok: true; key: string } | { ok: false; error: string } {
  const normalized = normalizeHost(host);
  if (!normalized) return { ok: false, error: HOST_ERROR };
  const trimmed = project.trim();
  if (!trimmed) return { ok: false, error: PROJECT_ERROR };
  return { ok: true, key: `${normalized}/${trimmed}` };
}

/** A stored watch, or null when it is not a Ref and an added-at. A malformed error is dropped. */
function normalizeWatch(value: unknown): Watch | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.ref !== 'string' ||
    record.ref === '' ||
    typeof record.addedAt !== 'string' ||
    record.addedAt === ''
  ) {
    return null;
  }
  const watch: Watch = { ref: record.ref, addedAt: record.addedAt };
  if (typeof record.error === 'string' && record.error !== '') watch.error = record.error;
  return watch;
}

/**
 * The valid watch entries of a stored map, keyed by normalized host+project. An
 * entry whose key no longer parses, or whose value is not a Ref and an added-at,
 * counts as dropped, so a reader ignores it while a writer refuses it.
 */
function normalizeWatches(raw: unknown): { watches: Record<string, Watch>; dropped: number } {
  const watches: Record<string, Watch> = {};
  let dropped = 0;
  if (typeof raw === 'object' && raw !== null) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const slash = key.indexOf('/');
      const host = slash === -1 ? '' : key.slice(0, slash);
      const project = slash === -1 ? '' : key.slice(slash + 1);
      const parsedKey = watchKey(host, project);
      const watch = parsedKey.ok ? normalizeWatch(value) : null;
      if (parsedKey.ok && watch) watches[parsedKey.key] = watch;
      else dropped += 1;
    }
  }
  return { watches, dropped };
}

/** The identity of a Terminal event: the same outcome recorded twice is one event. */
export function eventIdentity(event: Event): string {
  const host = normalizeHost(event.host) ?? event.host;
  return JSON.stringify([host, event.project, event.ref, event.pipelineId, event.status]);
}

/** Whether a stored value is a well-formed Terminal event. */
export function isEvent(value: unknown): value is Event {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.host === 'string' &&
    normalizeHost(record.host) !== null &&
    typeof record.project === 'string' &&
    record.project.trim() !== '' &&
    typeof record.ref === 'string' &&
    record.ref.trim() !== '' &&
    typeof record.pipelineId === 'number' &&
    Number.isFinite(record.pipelineId) &&
    typeof record.status === 'string' &&
    record.status !== '' &&
    typeof record.at === 'string' &&
    record.at !== ''
  );
}

/**
 * The valid Terminal events of a stored log, oldest first, at most
 * `EVENT_LOG_MAX` of them. A malformed entry, or one keyed by a host that no
 * longer normalizes, counts as dropped, so a reader ignores it while a writer
 * refuses it.
 */
function normalizeEvents(raw: unknown): { events: Event[]; dropped: number } {
  const events: Event[] = [];
  let dropped = 0;
  if (Array.isArray(raw)) {
    for (const value of raw) {
      if (!isEvent(value)) {
        dropped += 1;
        continue;
      }
      events.push({ ...value, host: normalizeHost(value.host) ?? value.host });
    }
  }
  return { events: events.slice(Math.max(0, events.length - EVENT_LOG_MAX)), dropped };
}

/** A stored cursor, floored at the number of retained events so it is never behind them. */
function normalizeEventSeq(raw: unknown, retained: number): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= retained ? raw : retained;
}

/**
 * A stored seen marker, floored at zero and never past the recorded events. An
 * older config with no marker reads as zero, so nothing is seen yet.
 */
function normalizeSeen(raw: unknown, eventSeq: number): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? Math.min(raw, eventSeq) : 0;
}

/**
 * Read the configuration, yielding the default when the file is absent or
 * unreadable, or when its contents are not valid JSON — a corrupt file starts
 * the user fresh rather than making the Extension unusable. A stored host,
 * token key or watch key that no longer normalizes is dropped rather than
 * carried forward.
 */
export async function readConfig(fs: ConfigFs, path: string): Promise<Config> {
  let raw: string;
  try {
    raw = await fs.readFile(path);
  } catch {
    return defaultConfig();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultConfig();
  }
  if (typeof parsed !== 'object' || parsed === null) return defaultConfig();

  const record = parsed as Record<string, unknown>;
  const host = typeof record.host === 'string' ? normalizeHost(record.host) : null;
  const project = typeof record.project === 'string' ? record.project : '';
  const events = normalizeEvents(record.events).events;
  const eventSeq = normalizeEventSeq(record.eventSeq, events.length);

  return {
    host: host ?? DEFAULT_HOST,
    project,
    tokens: normalizeTokens(record.tokens).tokens,
    watches: normalizeWatches(record.watches).watches,
    events,
    eventSeq,
    seen: normalizeSeen(record.seen, eventSeq),
  };
}

/** A change to the configuration, or the reason it was refused. */
export type ConfigChange = { ok: true; config: Config } | { ok: false; error: string };

/** Set or replace the Access token for a host. */
export function setToken(config: Config, host: string, token: string): ConfigChange {
  const normalized = normalizeHost(host);
  if (!normalized) return { ok: false, error: HOST_ERROR };
  const value = token.trim();
  if (!value) return { ok: false, error: 'An Access token is required.' };
  return { ok: true, config: { ...config, tokens: { ...config.tokens, [normalized]: value } } };
}

/** Remove the Access token for a host, leaving every other host's token in place. */
export function clearToken(config: Config, host: string): ConfigChange {
  const normalized = normalizeHost(host);
  if (!normalized) return { ok: false, error: HOST_ERROR };
  const tokens = { ...config.tokens };
  delete tokens[normalized];
  return { ok: true, config: { ...config, tokens } };
}

/** The Access token for a host, or null when there is none. */
export function resolveToken(config: Config, host: string): string | null {
  const normalized = normalizeHost(host);
  if (!normalized) return null;
  return config.tokens[normalized] ?? null;
}

/**
 * Set one Watched Ref for a host and project, replacing any previous Ref for
 * that project. A blank Ref is refused rather than treated as a clear, so only
 * an explicit clear removes a watch.
 */
export function setWatch(
  config: Config,
  host: string,
  project: string,
  ref: string,
  addedAt: string,
): ConfigChange {
  const resolved = watchKey(host, project);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const value = ref.trim();
  if (!value) return { ok: false, error: REF_ERROR };
  return {
    ok: true,
    config: { ...config, watches: { ...config.watches, [resolved.key]: { ref: value, addedAt } } },
  };
}

/** Remove the watch for a host and project, leaving every other project's watch in place. */
export function clearWatch(config: Config, host: string, project: string): ConfigChange {
  const resolved = watchKey(host, project);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const watches = { ...config.watches };
  delete watches[resolved.key];
  return { ok: true, config: { ...config, watches } };
}

/** The watch for a host and project, or null when there is none. */
export function resolveWatch(config: Config, host: string, project: string): Watch | null {
  const resolved = watchKey(host, project);
  if (!resolved.ok) return null;
  return config.watches[resolved.key] ?? null;
}

/**
 * Record a poll error against a project's watch, so a moved project is visible
 * without being followed. A project with no watch is left alone.
 */
export function setWatchError(config: Config, host: string, project: string, error: string): Config {
  const resolved = watchKey(host, project);
  if (!resolved.ok) return config;
  const watch = config.watches[resolved.key];
  if (!watch) return config;
  return {
    ...config,
    watches: { ...config.watches, [resolved.key]: { ref: watch.ref, addedAt: watch.addedAt, error } },
  };
}

/** Clear a project's watch error, leaving its Ref and added-at. A missing watch is left alone. */
export function clearWatchError(config: Config, host: string, project: string): Config {
  const resolved = watchKey(host, project);
  if (!resolved.ok) return config;
  const watch = config.watches[resolved.key];
  if (!watch?.error) return config;
  return {
    ...config,
    watches: { ...config.watches, [resolved.key]: { ref: watch.ref, addedAt: watch.addedAt } },
  };
}

/** A copy of an event with its host normalized, so its identity and storage agree. */
export function normalizeEvent(event: Event): Event {
  return { ...event, host: normalizeHost(event.host) ?? event.host };
}

/**
 * Append a Terminal event to the bounded log, dropping the oldest past the cap.
 * An event whose identity is already recorded is ignored, so re-polling the same
 * settled Pipeline records nothing new. Returns the same `config` when nothing
 * changed, so a caller can detect a no-op by reference.
 */
export function appendEvent(config: Config, event: Event): Config {
  const normalized = normalizeEvent(event);
  const identity = eventIdentity(normalized);
  if (config.events.some((existing) => eventIdentity(existing) === identity)) return config;
  const events = [...config.events, normalized];
  const overflow = Math.max(0, events.length - EVENT_LOG_MAX);
  return {
    ...config,
    events: overflow > 0 ? events.slice(overflow) : events,
    eventSeq: config.eventSeq + 1,
  };
}

/** The cursor a surface has reached: how many events have ever been recorded. */
export function eventCursor(config: Config): number {
  return config.eventSeq;
}

/**
 * The Terminal events recorded since the seen marker: what a surface has not
 * looked at yet, and what the rail badge counts.
 */
export function unseenCount(config: Config): number {
  return Math.max(0, config.eventSeq - config.seen);
}

/**
 * Advance the seen marker to a cursor, never moving it backwards and never past
 * what has been recorded, so a stale surface cannot unsee an event. Returns the
 * same `config` when nothing changed, so a caller can skip a write.
 */
export function advanceSeen(config: Config, cursor: number): Config {
  if (!Number.isInteger(cursor) || cursor <= 0) return config;
  const target = Math.min(cursor, config.eventSeq);
  if (target <= config.seen) return config;
  return { ...config, seen: target };
}

/**
 * The retained events a surface has not read yet: those recorded after its
 * cursor. The log keeps only the newest events, so a cursor older than the
 * retained window yields everything retained rather than a partial page.
 */
export function eventsAfter(config: Config, after: number): Event[] {
  const retained = config.events.length;
  if (retained === 0) return [];
  // The sequence number of `events[0]` given everything ever recorded is
  // `eventSeq`; the retained events are the newest `retained` of them.
  const firstSeq = config.eventSeq - retained + 1;
  const start = after - firstSeq + 1;
  if (start <= 0) return config.events.slice();
  if (start >= retained) return [];
  return config.events.slice(start);
}

/**
 * Persist the configuration as a `0600` file, creating its directory. A host
 * that no longer normalizes, a token keyed by one, a watch keyed by one, or an
 * event keyed by one is refused and nothing is written.
 */
export async function saveConfig(fs: ConfigFs, path: string, config: Config): Promise<ConfigChange> {
  const host = normalizeHost(config.host);
  if (!host) return { ok: false, error: HOST_ERROR };

  const { tokens, dropped } = normalizeTokens(config.tokens);
  if (dropped > 0) return { ok: false, error: 'A token is keyed by an invalid GitLab host.' };

  const normalizedWatches = normalizeWatches(config.watches);
  if (normalizedWatches.dropped > 0) {
    return { ok: false, error: 'A watch is keyed by an invalid GitLab host or project.' };
  }

  const normalizedEvents = normalizeEvents(config.events);
  if (normalizedEvents.dropped > 0) {
    return { ok: false, error: 'An event is malformed.' };
  }

  const eventSeq = normalizeEventSeq(config.eventSeq, normalizedEvents.events.length);
  const next: Config = {
    host,
    project: config.project,
    tokens,
    watches: normalizedWatches.watches,
    events: normalizedEvents.events,
    eventSeq,
    seen: normalizeSeen(config.seen, eventSeq),
  };
  await fs.mkdir(dirname(path));
  await fs.writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 0o600);
  await fs.chmod(path, 0o600);
  return { ok: true, config: next };
}
