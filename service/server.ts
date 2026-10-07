/**
 * The proxy service's loopback shell, as a testable module.
 *
 * The routes' logic lives in `routes.ts`, `proxy.ts` and `git-config.ts`; this
 * module owns the transport decisions around them — the host-issued bearer, the
 * request-body cap and the mapping of an unexpected failure to a `500` — so
 * they can be driven without a socket. `main.ts` only binds the port and wires
 * the real filesystem and `fetch` in.
 */

import type { ConfigFs } from './config';
import { resolveGitConfig, type GitConfigFs } from './git-config';
import type { Poller } from './poller';
import type { ProxyFetch } from './proxy';
import {
  advanceSeenRoute,
  proxyWithConfig,
  readConfigRoute,
  readEventsRoute,
  readWatchRoute,
  writeConfigRoute,
  writeEventRoute,
  writeTokenRoute,
  writeWatchRoute,
  type ProxyRouteRequest,
} from './routes';

const HEALTH_ROUTE = '/health';
const CONFIG_ROUTE = '/config';
const TOKEN_ROUTE = '/token';
const WATCH_ROUTE = '/watch';
const EVENTS_ROUTE = '/events';
const EVENTS_SEEN_ROUTE = '/events/seen';
const GIT_CONFIG_ROUTE = '/git-config';
const PROXY_ROUTE = '/proxy';

/** The largest request body the service will read, in bytes. */
export const REQUEST_BODY_MAX = 256_000;

/** Raised when a request body exceeds the cap, so the shell can answer `413`. */
class BodyTooLargeError extends Error {}

/**
 * The port the host issued. A missing, non-integer or out-of-range value is a
 * clear startup error naming the variable, not an opaque `NaN` listen crash.
 */
export function parsePort(raw: string | undefined): number {
  const value = (raw ?? '').trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`OPENCHAMBER_SERVICE_PORT must be an integer port, got ${JSON.stringify(raw ?? '')}.`);
  }
  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error(`OPENCHAMBER_SERVICE_PORT must be between 1 and 65535, got ${port}.`);
  }
  return port;
}

/** The minimal request the shell needs: a method, a URL, headers and a body. */
export type ServiceRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array>;
};

/** Everything the shell needs from the outside world, injected so tests fake it. */
export type ServiceDeps = {
  token: string;
  configFs: ConfigFs;
  configPath: string;
  gitConfigFs: GitConfigFs;
  fetchImpl: ProxyFetch;
  /** The service's background poller, started and stopped by `main.ts`. */
  poller?: Poller;
};

export type ServiceResponse = { status: number; body: string };

function json(status: number, payload: unknown): ServiceResponse {
  return { status, body: JSON.stringify(payload) };
}

function authorized(request: ServiceRequest, token: string): boolean {
  return token.length > 0 && request.headers.authorization === `Bearer ${token}`;
}

/**
 * Read the body up to the cap, then stop and raise. An oversized body is never
 * fully buffered: each chunk is counted before it is kept.
 */
async function readBody(request: ServiceRequest): Promise<string> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > REQUEST_BODY_MAX) throw new BodyTooLargeError();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Parse a JSON request body, or `null` when it is not a JSON object. */
async function readJson(request: ServiceRequest): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await readBody(request)) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch (error) {
    if (error instanceof BodyTooLargeError) throw error;
    return null;
  }
}

async function route(request: ServiceRequest, deps: ServiceDeps): Promise<ServiceResponse> {
  if (!authorized(request, deps.token)) return json(401, { error: 'unauthorized' });

  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const method = request.method ?? 'GET';

  if (url.pathname === HEALTH_ROUTE) return json(200, { status: 'ok' });

  if (url.pathname === CONFIG_ROUTE) {
    if (method === 'GET') {
      return json(200, { config: await readConfigRoute(deps.configFs, deps.configPath) });
    }
    const body = await readJson(request);
    if (!body) return json(400, { error: 'invalid request body' });
    const result = await writeConfigRoute(deps.configFs, deps.configPath, body);
    if (!result.ok) return json(400, { error: result.error });
    return json(200, { config: result.view });
  }

  if (url.pathname === TOKEN_ROUTE) {
    const body = await readJson(request);
    if (!body) return json(400, { error: 'invalid request body' });
    const result = await writeTokenRoute(deps.configFs, deps.configPath, body);
    if (!result.ok) return json(400, { error: result.error });
    return json(200, { config: result.view });
  }

  if (url.pathname === WATCH_ROUTE) {
    if (method === 'GET') {
      return json(200, {
        watch: await readWatchRoute(deps.configFs, deps.configPath, {
          host: url.searchParams.get('host'),
          project: url.searchParams.get('project'),
        }),
      });
    }
    if (method !== 'PUT') return json(404, { error: 'not found' });
    const body = await readJson(request);
    if (!body) return json(400, { error: 'invalid request body' });
    const result = await writeWatchRoute(deps.configFs, deps.configPath, body);
    if (!result.ok) return json(400, { error: result.error });
    return json(200, { watch: result.watch });
  }

  if (url.pathname === EVENTS_ROUTE) {
    if (method === 'GET') {
      return json(
        200,
        await readEventsRoute(deps.configFs, deps.configPath, {
          after: url.searchParams.get('after'),
        }),
      );
    }
    if (method !== 'POST') return json(404, { error: 'not found' });
    const body = await readJson(request);
    if (!body) return json(400, { error: 'invalid request body' });
    const result = await writeEventRoute(deps.configFs, deps.configPath, body);
    if (!result.ok) return json(400, { error: result.error });
    return json(200, { event: result.event, recorded: result.recorded });
  }

  if (url.pathname === EVENTS_SEEN_ROUTE) {
    if (method !== 'PUT') return json(404, { error: 'not found' });
    const body = await readJson(request);
    if (!body) return json(400, { error: 'invalid request body' });
    const result = await advanceSeenRoute(deps.configFs, deps.configPath, body);
    if (!result.ok) return json(400, { error: result.error });
    return json(200, { seen: result.seen, unseen: result.unseen });
  }

  if (url.pathname === GIT_CONFIG_ROUTE) {
    // Parse the body directly, so this route's contract stays as ADR-0005 froze it.
    let body: { directory?: unknown };
    try {
      body = JSON.parse(await readBody(request)) as { directory?: unknown };
    } catch (error) {
      if (error instanceof BodyTooLargeError) throw error;
      return json(400, { error: 'invalid request body' });
    }
    const directory = typeof body.directory === 'string' ? body.directory : '';
    const result = await resolveGitConfig({ directory }, deps.gitConfigFs);
    if (!result.ok) return json(404, { error: result.error });
    return json(200, { config: result.config });
  }

  if (url.pathname !== PROXY_ROUTE) return json(404, { error: 'not found' });

  const body = await readJson(request);
  if (!body) return json(400, { error: 'invalid request body' });
  const result = await proxyWithConfig(
    deps.configFs,
    deps.configPath,
    body as ProxyRouteRequest,
    deps.fetchImpl,
  );
  if (!result.ok) {
    return json(502, { error: result.error, ...(result.code ? { code: result.code } : {}) });
  }
  return json(200, {
    status: result.status,
    body: result.body,
    truncated: result.truncated,
    headers: result.headers,
  });
}

/**
 * Serve one request. Any unexpected failure is answered as a `500` rather than
 * left to reject, so the request is never left unanswered and no internal
 * detail reaches the caller. An oversized body is the one case answered as
 * `413`.
 */
export async function handleRequest(request: ServiceRequest, deps: ServiceDeps): Promise<ServiceResponse> {
  try {
    return await route(request, deps);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return json(413, { error: 'The request body is too large.' });
    }
    return json(500, { error: 'The service could not complete the request.' });
  }
}
