/**
 * The Panel's view of the service-owned state: the configuration and the
 * notifications transport.
 *
 * The Proxy service holds the Configured host, the Project override and one
 * Access token per host; the Panel receives only the host, the override and
 * whether a token exists. The token itself never leaves the service, so nothing
 * here ever carries one. The parsers are pure; the small request wrappers send
 * through an injected `ServiceSender`, so both are tested through the host seam.
 */

import {
  SERVICE_EVENTS_PATH,
  SERVICE_EVENTS_SEEN_PATH,
  SERVICE_WATCH_PATH,
} from './config';
import type { HostRequest, HostResponse } from './host-port';

/** The configuration as the service returns it: never a token, only presence per host. */
export type ServiceConfig = {
  host: string;
  project: string;
  hasToken: Record<string, boolean>;
};

/** Whether the named host has an Access token in the service's store. */
export function hasToken(config: ServiceConfig, host: string): boolean {
  return config.hasToken[host] === true;
}

/**
 * A Configured host from a bare host or a full origin, as a lowercase authority
 * (`gitlab.com`, `gitlab.example.com:8443`). Null unless it is `https` with no
 * embedded credentials and no path beyond the root, so a typo cannot send the
 * token anywhere unintended.
 */
export function normalizeHostInput(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const withScheme = raw.includes('://') ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  if (url.search || url.hash) return null;
  return url.host;
}

/**
 * The configuration out of a `/config` response body, or null when the body is
 * not the service's envelope. A host absent from `hasToken` has no token.
 */
export function parseConfigEnvelope(body: string): ServiceConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const config = (parsed as { config?: unknown }).config;
  if (typeof config !== 'object' || config === null) return null;
  const record = config as Record<string, unknown>;
  if (typeof record.host !== 'string' || typeof record.project !== 'string') return null;
  const hasTokenMap: Record<string, boolean> = {};
  if (typeof record.hasToken === 'object' && record.hasToken !== null) {
    for (const [key, value] of Object.entries(record.hasToken)) {
      if (value === true) hasTokenMap[key] = true;
    }
  }
  return { host: record.host, project: record.project, hasToken: hasTokenMap };
}

/**
 * The service answers a proxied call with its own envelope (`{status, body}`),
 * and a failure with `{error, code?}`. Turn the envelope back into a host
 * response; a `no-token` failure keeps its code so the Panel can tell a missing
 * token apart from a transport error.
 */
export function parseProxyEnvelope(response: HostResponse): HostResponse {
  let parsed: {
    status?: number;
    body?: string;
    error?: string;
    code?: string;
    truncated?: boolean;
    headers?: Record<string, string>;
  };
  try {
    parsed = JSON.parse(response.body) as typeof parsed;
  } catch {
    // Not our envelope: hand the raw response straight through.
    return { status: response.status, body: response.body };
  }
  if (typeof parsed.status === 'number') {
    const headers: Record<string, string> = {};
    if (parsed.headers && typeof parsed.headers === 'object') {
      for (const [key, value] of Object.entries(parsed.headers)) {
        if (typeof value === 'string') headers[key] = value;
      }
    }
    return {
      status: parsed.status,
      body: parsed.body ?? '',
      ...(typeof parsed.truncated === 'boolean' ? { truncated: parsed.truncated } : {}),
      ...(Object.keys(headers).length ? { headers } : {}),
    };
  }
  if (parsed.error) {
    const error = new Error(parsed.error) as Error & { code?: string };
    if (parsed.code) error.code = parsed.code;
    throw error;
  }
  return { status: response.status, body: response.body };
}

/** Why a configuration write failed, in the user's words. */
export function serviceErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (code === 'NO_SERVICE' || code === 'SERVICE_FAILED' || code === 'NOT_GRANTED') {
    return 'The Proxy service is not available. Open Settings → Extensions and allow this extension’s service, then try again.';
  }
  return 'The configuration could not be saved.';
}

// ---------------------------------------------------------------------------
// Notifications: the Watched Ref, the Terminal event log and the watermark
// ---------------------------------------------------------------------------

/** The Watched Ref for a host+project, as the service returns it; an `error` is a watch that broke. */
export type WatchedRef = { ref: string; addedAt: string; error?: string };

/**
 * A Terminal event: a Pipeline on a Watched Ref reaching a settled Status. The
 * identity is host + project + ref + pipelineId + status, exactly as the service
 * dedupes them, so a re-read never counts twice. See ADR-0011.
 */
export type TerminalEvent = {
  host: string;
  project: string;
  ref: string;
  pipelineId: number;
  status: string;
  at: string;
};

/** The Terminal events after a cursor, with the cursor to advance to and the Unseen count. */
export type TerminalEventView = { events: TerminalEvent[]; cursor: number; unseen: number };

/** The service's seen marker after a watermark write. */
export type SeenMarker = { seen: number; unseen: number };

/** The one sender every notifications call goes through: the port's `serviceRequest`. */
export type ServiceSender = (input: HostRequest) => Promise<HostResponse>;

/** A Terminal event's identity: what makes two reads of the same outcome one event. */
export function eventIdentity(event: TerminalEvent): string {
  return [event.host, event.project, event.ref, event.pipelineId, event.status].join('\u0000');
}

/**
 * Whether a Terminal event raises a toast. Only failed/canceled do; success is
 * badge-only, so it never interrupts the developer (spec, "Badge and toasts").
 */
export function isFailureEvent(event: TerminalEvent): boolean {
  return event.status === 'failed' || event.status === 'canceled';
}

function parseEvent(value: unknown): TerminalEvent | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.host !== 'string' ||
    typeof record.project !== 'string' ||
    typeof record.ref !== 'string' ||
    typeof record.status !== 'string' ||
    typeof record.at !== 'string' ||
    typeof record.pipelineId !== 'number' ||
    !Number.isFinite(record.pipelineId)
  ) {
    return null;
  }
  return {
    host: record.host,
    project: record.project,
    ref: record.ref,
    pipelineId: record.pipelineId,
    status: record.status,
    at: record.at,
  };
}

/**
 * The watch out of a `/watch` response body: `{ watch }`, where a null watch
 * means none is set. Returns null when the body is not the service's envelope.
 */
export function parseWatchEnvelope(body: string): { watch: WatchedRef | null } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const watch = (parsed as { watch?: unknown }).watch;
  if (watch === null) return { watch: null };
  if (typeof watch !== 'object' || watch === null) return null;
  const record = watch as Record<string, unknown>;
  if (typeof record.ref !== 'string' || record.ref === '' || typeof record.addedAt !== 'string') {
    return null;
  }
  return {
    watch: {
      ref: record.ref,
      addedAt: record.addedAt,
      ...(typeof record.error === 'string' ? { error: record.error } : {}),
    },
  };
}

/** The Terminal events out of a `/events` body, or null when it is not the envelope. */
export function parseEventsEnvelope(body: string): TerminalEventView | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.events)) return null;
  if (typeof record.cursor !== 'number' || typeof record.unseen !== 'number') return null;
  const events: TerminalEvent[] = [];
  for (const value of record.events) {
    const event = parseEvent(value);
    if (event) events.push(event);
  }
  return { events, cursor: record.cursor, unseen: record.unseen };
}

/** The seen marker out of a `/events/seen` body, or null when it is not the envelope. */
export function parseSeenEnvelope(body: string): SeenMarker | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  if (typeof record.seen !== 'number' || typeof record.unseen !== 'number') return null;
  return { seen: record.seen, unseen: record.unseen };
}

/** Whether a service response is an ordinary success. */
function serviceOk(response: HostResponse): boolean {
  return response.status >= 200 && response.status < 300;
}

/**
 * Why a notifications call returned no payload. A service built before the
 * notifications routes existed answers `404`, which is `older-service`; every
 * other failure — a transport error, a non-2xx, an unparseable body — is
 * `unavailable`. Callers degrade on the former and stay quiet on the latter.
 */
export type NotificationsFailure = 'older-service' | 'unavailable';

/** The outcome of a notifications call: its payload, or the reason there is none. */
export type NotificationsResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: NotificationsFailure };

/** Whether a notifications result failed because the service predates the routes. */
export function isOlderService<T>(result: NotificationsResult<T>): boolean {
  return !result.ok && result.failure === 'older-service';
}

/**
 * The one place a notifications call is made: send it, then map a `404` to an
 * older service and any other failure to an ordinary one. The parser stays pure
 * and only runs on a success.
 */
async function notificationsCall<T>(
  send: ServiceSender,
  request: HostRequest,
  parse: (body: string) => T | null,
): Promise<NotificationsResult<T>> {
  let response: HostResponse;
  try {
    response = await send(request);
  } catch {
    return { ok: false, failure: 'unavailable' };
  }
  if (response.status === 404) return { ok: false, failure: 'older-service' };
  if (!serviceOk(response)) return { ok: false, failure: 'unavailable' };
  const value = parse(response.body);
  if (value === null) return { ok: false, failure: 'unavailable' };
  return { ok: true, value };
}

/**
 * Read the Watched Ref for a host+project. An older service answers `404` (its
 * `older-service` result), so the Panel can explain rather than fail; any other
 * failure leaves the notification state as it was.
 */
export function getWatch(
  send: ServiceSender,
  host: string,
  project: string,
): Promise<NotificationsResult<{ watch: WatchedRef | null }>> {
  return notificationsCall(
    send,
    { method: 'GET', path: SERVICE_WATCH_PATH, query: { host, project } },
    parseWatchEnvelope,
  );
}

/** Set (`ref`) or clear (`null`) the Watched Ref for a host+project. */
export function putWatch(
  send: ServiceSender,
  host: string,
  project: string,
  ref: string | null,
): Promise<NotificationsResult<{ watch: WatchedRef | null }>> {
  return notificationsCall(
    send,
    { method: 'PUT', path: SERVICE_WATCH_PATH, body: JSON.stringify({ host, project, ref }) },
    parseWatchEnvelope,
  );
}

/** Read the Terminal events after a cursor; an `older-service` result means the route is absent. */
export function getEvents(
  send: ServiceSender,
  after: number,
): Promise<NotificationsResult<TerminalEventView>> {
  return notificationsCall(
    send,
    { method: 'GET', path: SERVICE_EVENTS_PATH, query: { after: String(after) } },
    parseEventsEnvelope,
  );
}

/** Advance the seen watermark to a cursor. */
export function putSeen(
  send: ServiceSender,
  cursor: number,
): Promise<NotificationsResult<SeenMarker>> {
  return notificationsCall(
    send,
    { method: 'PUT', path: SERVICE_EVENTS_SEEN_PATH, body: JSON.stringify({ cursor }) },
    parseSeenEnvelope,
  );
}

/** The service's answer to a posted event: the stored event and whether it was new. */
export type RecordedEvent = { event: TerminalEvent; recorded: boolean };

function parseRecordedEventEnvelope(body: string): RecordedEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const event = parseEvent(record.event);
  if (!event || typeof record.recorded !== 'boolean') return null;
  return { event, recorded: record.recorded };
}

/**
 * Record a Terminal event the mounted Panel observed itself, so a running Panel
 * toasts instantly. The service dedupes by identity, so posting one the poller
 * already recorded changes nothing. Best-effort: a `404` (an older service) or
 * any failure leaves the Panel untouched.
 */
export function postEvent(
  send: ServiceSender,
  event: TerminalEvent,
): Promise<NotificationsResult<RecordedEvent>> {
  return notificationsCall(
    send,
    { method: 'POST', path: SERVICE_EVENTS_PATH, body: JSON.stringify(event) },
    parseRecordedEventEnvelope,
  );
}
