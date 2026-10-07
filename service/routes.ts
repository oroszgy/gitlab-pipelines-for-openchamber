/**
 * The service's configuration and proxy routes, as pure handlers.
 *
 * The loopback shell owns transport — binding `127.0.0.1`, enforcing the
 * host-issued bearer and moving JSON in and out — and hands each request here
 * with the configuration store's filesystem seam and the proxy's `fetch`
 * injected, so the routes are tested without a socket, a disk or a network.
 */

import {
  advanceSeen,
  appendEvent,
  clearToken,
  clearWatch,
  eventCursor,
  eventsAfter,
  isEvent,
  normalizeEvent,
  readConfig,
  resolveToken,
  resolveWatch,
  saveConfig,
  setToken,
  setWatch,
  unseenCount,
  type Config,
  type ConfigFs,
  type Event,
  type Watch,
} from './config';
import {
  HOST_ERROR,
  handleProxy,
  normalizeBaseUrl,
  type ProxyFetch,
  type ProxyRequest,
} from './proxy';

/**
 * The configuration as the Panel sees it: never a token, only whether one is
 * present per host. A host absent from `hasToken` has none.
 */
export type ConfigView = {
  host: string;
  project: string;
  hasToken: Record<string, boolean>;
};

/** Project a stored configuration into the token-free view the Panel receives. */
export function configView(config: Config): ConfigView {
  const hasToken: Record<string, boolean> = {};
  for (const host of Object.keys(config.tokens)) hasToken[host] = true;
  return { host: config.host, project: config.project, hasToken };
}

export type ConfigRouteResult = { ok: true; view: ConfigView } | { ok: false; error: string };

/** Read the configuration for the Panel. */
export async function readConfigRoute(fs: ConfigFs, path: string): Promise<ConfigView> {
  return configView(await readConfig(fs, path));
}

/** Set the Configured host and Project override, keeping every stored token. */
export async function writeConfigRoute(
  fs: ConfigFs,
  path: string,
  input: { host?: unknown; project?: unknown },
): Promise<ConfigRouteResult> {
  const current = await readConfig(fs, path);
  const host = typeof input.host === 'string' ? input.host : current.host;
  const project = typeof input.project === 'string' ? input.project : current.project;
  return persist(fs, path, { ...current, host, project });
}

/**
 * Set or clear the Access token for a host. A string sets it; an explicit
 * `null` clears it. A blank or absent token is refused rather than treated as a
 * clear, so a left-empty masked field — or a malformed request — cannot wipe a
 * stored token. An absent host uses the Configured host, so the Panel never has
 * to repeat it.
 */
export async function writeTokenRoute(
  fs: ConfigFs,
  path: string,
  input: { host?: unknown; token?: unknown },
): Promise<ConfigRouteResult> {
  const current = await readConfig(fs, path);
  const host = typeof input.host === 'string' && input.host.trim() ? input.host : current.host;
  const change =
    input.token === null
      ? clearToken(current, host)
      : setToken(current, host, typeof input.token === 'string' ? input.token : '');
  if (!change.ok) return { ok: false, error: change.error };
  return persist(fs, path, change.config);
}

async function persist(fs: ConfigFs, path: string, config: Config): Promise<ConfigRouteResult> {
  const saved = await saveConfig(fs, path, config);
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true, view: configView(saved.config) };
}

/** A non-blank string from a request field, or null so the Configured value stands. */
function named(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** The watch as the Panel sees it: the Ref and when it was set, or null. */
export type WatchView = Watch | null;

export type WatchRouteResult = { ok: true; watch: WatchView } | { ok: false; error: string };

/** Read the Watched Ref for a host and project, or null when none is set. */
export async function readWatchRoute(
  fs: ConfigFs,
  path: string,
  input: { host?: unknown; project?: unknown },
): Promise<WatchView> {
  const config = await readConfig(fs, path);
  const host = named(input.host) ?? config.host;
  const project = named(input.project) ?? config.project;
  return resolveWatch(config, host, project);
}

/**
 * Set or clear the Watched Ref for a host and project. A non-blank Ref sets it,
 * replacing any previous Ref for that project; a `null`, empty or absent Ref
 * clears it. An absent host or project uses the Configured one, so the Panel
 * never has to repeat it.
 */
export async function writeWatchRoute(
  fs: ConfigFs,
  path: string,
  input: { host?: unknown; project?: unknown; ref?: unknown },
  now: () => Date = () => new Date(),
): Promise<WatchRouteResult> {
  const current = await readConfig(fs, path);
  const host = named(input.host) ?? current.host;
  const project = named(input.project) ?? current.project;
  const ref = typeof input.ref === 'string' ? input.ref.trim() : '';
  const change = ref
    ? setWatch(current, host, project, ref, now().toISOString())
    : clearWatch(current, host, project);
  if (!change.ok) return { ok: false, error: change.error };
  const saved = await saveConfig(fs, path, change.config);
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true, watch: resolveWatch(saved.config, host, project) };
}

/**
 * The Terminal events a surface reads, with enough to recompute its badge: the
 * events recorded after its cursor, the newest cursor to advance to, and the
 * Unseen count.
 */
export type EventsView = {
  events: Event[];
  /** The newest cursor: advancing the seen marker to it makes `unseen` zero. */
  cursor: number;
  /** How many Terminal events are recorded since the seen marker. */
  unseen: number;
};

/** A non-negative integer cursor from a query value or body field, or 0 when absent or malformed. */
function cursorFrom(value: unknown): number {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : 0;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return 0;
}

/**
 * Read the Terminal events after a cursor. Absent or malformed, the cursor is
 * treated as 0, so a surface that has never read gets the whole retained log.
 */
export async function readEventsRoute(
  fs: ConfigFs,
  path: string,
  input: { after?: unknown },
): Promise<EventsView> {
  const config = await readConfig(fs, path);
  return {
    events: eventsAfter(config, cursorFrom(input.after)),
    cursor: eventCursor(config),
    unseen: unseenCount(config),
  };
}

/** A Terminal event a mounted surface observed, as the request body carries it. */
export type EventRouteInput = {
  host?: unknown;
  project?: unknown;
  ref?: unknown;
  pipelineId?: unknown;
  status?: unknown;
  at?: unknown;
};

export type EventRouteResult =
  | { ok: true; event: Event; recorded: boolean }
  | { ok: false; error: string };

/**
 * Record a Terminal event a mounted surface observed itself. It is deduped by
 * identity through `appendEvent`, so posting one the poller already recorded
 * changes nothing and answers `recorded: false`. A missing `at` is stamped with
 * the current time.
 */
export async function writeEventRoute(
  fs: ConfigFs,
  path: string,
  input: EventRouteInput,
  now: () => Date = () => new Date(),
): Promise<EventRouteResult> {
  const at = typeof input.at === 'string' && input.at ? input.at : now().toISOString();
  const candidate = {
    host: typeof input.host === 'string' ? input.host : '',
    project: typeof input.project === 'string' ? input.project.trim() : '',
    ref: typeof input.ref === 'string' ? input.ref.trim() : '',
    pipelineId:
      typeof input.pipelineId === 'number' && Number.isFinite(input.pipelineId)
        ? input.pipelineId
        : Number.NaN,
    status: typeof input.status === 'string' ? input.status : '',
    at,
  };
  if (!isEvent(candidate)) return { ok: false, error: 'A valid Terminal event is required.' };

  const current = await readConfig(fs, path);
  const next = appendEvent(current, candidate);
  if (next === current) return { ok: true, event: normalizeEvent(candidate), recorded: false };

  const saved = await saveConfig(fs, path, next);
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true, event: normalizeEvent(candidate), recorded: true };
}

export type SeenRouteResult =
  | { ok: true; seen: number; unseen: number }
  | { ok: false; error: string };

/**
 * Advance the seen marker to a cursor, so a surface that has read and toasted
 * the events up to it marks them seen to every surface. A cursor that is not a
 * non-negative integer is refused; one past the recorded events is clamped, so
 * the count can always be driven to zero. `seen` never moves backwards.
 */
export async function advanceSeenRoute(
  fs: ConfigFs,
  path: string,
  input: { cursor?: unknown },
): Promise<SeenRouteResult> {
  if (typeof input.cursor !== 'number' || !Number.isInteger(input.cursor) || input.cursor < 0) {
    return { ok: false, error: 'A non-negative cursor is required.' };
  }
  const current = await readConfig(fs, path);
  const next = advanceSeen(current, input.cursor);
  if (next === current) return { ok: true, seen: current.seen, unseen: unseenCount(current) };

  const saved = await saveConfig(fs, path, next);
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true, seen: saved.config.seen, unseen: unseenCount(saved.config) };
}

/** A `/proxy` request: the GitLab call only. The token is resolved by the service. */
export type ProxyRouteRequest = Omit<ProxyRequest, 'token'>;

/** A host with no token is its own state, so the failure carries a code to map. */
export const NO_TOKEN_ERROR = 'No Access token is configured for this GitLab host.';

export type ProxyRouteResult =
  | { ok: true; status: number; body: string; truncated: boolean; headers: Record<string, string> }
  | { ok: false; code?: 'no-token'; error: string };

/**
 * Resolve the token for the request's host from configuration and attach it.
 * The caller never supplies a token. A malformed or non-`https` base URL is
 * refused before anything else, and a host with no token is a typed `no-token`
 * error, never an empty success.
 */
export async function proxyWithConfig(
  fs: ConfigFs,
  path: string,
  request: ProxyRouteRequest,
  fetchImpl: ProxyFetch,
): Promise<ProxyRouteResult> {
  const origin = normalizeBaseUrl(typeof request.baseUrl === 'string' ? request.baseUrl : '');
  if (!origin) return { ok: false, error: HOST_ERROR };

  const config = await readConfig(fs, path);
  const token = resolveToken(config, origin);
  if (!token) return { ok: false, code: 'no-token', error: NO_TOKEN_ERROR };

  return handleProxy(
    {
      baseUrl: origin,
      method: request.method,
      path: request.path,
      ...(request.query ? { query: request.query } : {}),
      ...(request.body != null ? { body: request.body } : {}),
      ...(request.headers ? { headers: request.headers } : {}),
      token,
    },
    fetchImpl,
  );
}
