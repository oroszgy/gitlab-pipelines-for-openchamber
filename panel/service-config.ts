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
 * Read the Watched Ref for a host+project. Null on any transport failure or a
 * service too old to know the route (a 404), so the Panel degrades quietly
 * rather than breaking (degradation is refined in notifications/07).
 */
export async function getWatch(
  send: ServiceSender,
  host: string,
  project: string,
): Promise<{ watch: WatchedRef | null } | null> {
  try {
    const response = await send({ method: 'GET', path: SERVICE_WATCH_PATH, query: { host, project } });
    if (!serviceOk(response)) return null;
    return parseWatchEnvelope(response.body);
  } catch {
    return null;
  }
}

/** Set (`ref`) or clear (`null`) the Watched Ref for a host+project; null when the write did not land. */
export async function putWatch(
  send: ServiceSender,
  host: string,
  project: string,
  ref: string | null,
): Promise<{ watch: WatchedRef | null } | null> {
  try {
    const response = await send({
      method: 'PUT',
      path: SERVICE_WATCH_PATH,
      body: JSON.stringify({ host, project, ref }),
    });
    if (!serviceOk(response)) return null;
    return parseWatchEnvelope(response.body);
  } catch {
    return null;
  }
}

/** Read the Terminal events after a cursor; null on any transport failure or an unknown route. */
export async function getEvents(
  send: ServiceSender,
  after: number,
): Promise<TerminalEventView | null> {
  try {
    const response = await send({
      method: 'GET',
      path: SERVICE_EVENTS_PATH,
      query: { after: String(after) },
    });
    if (!serviceOk(response)) return null;
    return parseEventsEnvelope(response.body);
  } catch {
    return null;
  }
}

/** Advance the seen watermark to a cursor; null when the write did not land. */
export async function putSeen(send: ServiceSender, cursor: number): Promise<SeenMarker | null> {
  try {
    const response = await send({
      method: 'PUT',
      path: SERVICE_EVENTS_SEEN_PATH,
      body: JSON.stringify({ cursor }),
    });
    if (!serviceOk(response)) return null;
    return parseSeenEnvelope(response.body);
  } catch {
    return null;
  }
}
