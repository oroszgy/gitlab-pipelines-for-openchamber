import { HOST_BODY_CAP, PER_PAGE } from './config';
import type { HostRequest, HostResponse } from './host-port';
import type { Bridge, Job, Pipeline, Scope } from './types';

/** A typed failure, mapped from an HTTP status or a host error. */
export type ClientFailure =
  | { kind: 'no-token' }
  | { kind: 'unauthorized' }
  /** Authenticated but not allowed (403): a scope or role too low. */
  | { kind: 'forbidden' }
  | { kind: 'not-found' }
  | { kind: 'service' }
  /** A redirect; `target` is the moved project's URL, or null when the body is not a recognisable move. */
  | { kind: 'redirect'; target: string | null }
  /** GitLab throttled the call (429); `retryAfterMs` is `Retry-After`, or null. */
  | { kind: 'rate-limited'; retryAfterMs: number | null }
  | { kind: 'http'; status: number }
  | { kind: 'network' };

/**
 * The one call a GitLab fetch makes: a request to the Proxy service, which
 * attaches the Access token itself. Kept narrow so the client never sees the
 * transport, only "send this and give me a status and a body".
 */
export type Requester = (request: HostRequest) => Promise<HostResponse>;

export type ClientResult<T> = { ok: true; data: T; truncated?: boolean } | { ok: false; failure: ClientFailure };

/** A write's outcome: it succeeded, or it failed the same way a read can. */
export type WriteResult = { ok: true; status: number } | { ok: false; failure: ClientFailure };

export type BuiltRequest = {
  path: string;
  query: Record<string, string>;
};

/**
 * A Panel-local request cache for the list endpoints and a settled Trace. It
 * holds the last `ETag` and body per method+path+query, so a repeat sends
 * `If-None-Match` and a `304` reuses what it already has. It dies with the
 * Panel, and is dropped wholesale when the host or token changes. See ADR-0009.
 */
export type CacheEntry = { etag: string; body: string; link?: string };
export type RequestCache = Map<string, CacheEntry>;

/** The most entries the cache keeps; beyond it, the least recently written is dropped. */
export const CACHE_MAX_ENTRIES = 50;

export function newRequestCache(): RequestCache {
  return new Map();
}

/** Store an entry, keeping the cache bounded and its ordering least-recently-written first. */
function remember(cache: RequestCache, key: string, entry: CacheEntry): void {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** A request's cache identity: the method and the full path and query. */
function cacheKey(request: HostRequest): string {
  const query = Object.entries(request.query ?? {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return `${request.method ?? 'GET'} ${request.path}?${query}`;
}

/**
 * The `page` named by a `Link: <…>; rel="next"` header, or null when there is
 * no next page. A malformed header is treated as no next page rather than an
 * error: pagination is a convenience, not a requirement.
 */
export function nextPageFromLink(link: string | null | undefined): number | null {
  if (!link) return null;
  for (const part of link.split(',')) {
    const match = /^\s*<([^>]*)>\s*;\s*(.*)$/.exec(part);
    if (!match) continue;
    if (!/rel\s*=\s*"?next"?/i.test(match[2] ?? '')) continue;
    try {
      const page = new URL(match[1] ?? '').searchParams.get('page');
      if (page != null && /^\d+$/.test(page)) return Number(page);
    } catch {
      // A URL GitLab would never emit; treat it as no next page.
    }
    return null;
  }
  return null;
}

/**
 * `Retry-After` in milliseconds: delta-seconds or an HTTP date. Null when absent
 * or unparseable; a date in the past floors at zero.
 */
export function parseRetryAfterMs(value: string | null | undefined, now: number): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - now);
}

/** `/api/v4/projects/:encoded-path` — GitLab accepts the URL-encoded path or a numeric id. */
export function projectBase(project: string): string {
  return `/api/v4/projects/${encodeURIComponent(project)}`;
}

export function pipelinesRequest(
  project: string,
  options: { scope: Scope; ref?: string | null; perPage?: number; page?: number } = { scope: 'all' },
): BuiltRequest {
  const query: Record<string, string> = {
    per_page: String(options.perPage ?? PER_PAGE),
  };
  if (options.scope === 'branch') {
    // Branch scope is the current Ref's own history; GitLab's default (newest id first) is right.
    if (options.ref) query.ref = options.ref;
  } else {
    // All refs is a project-wide feed, so order by most recently updated.
    query.order_by = 'updated_at';
    query.sort = 'desc';
  }
  // Page 1 is the default page GitLab serves with no `page` param; only emit it for older pages.
  if (options.page != null && options.page > 1) query.page = String(options.page);
  return { path: `${projectBase(project)}/pipelines`, query };
}

export function jobsRequest(project: string, pipelineId: number): BuiltRequest {
  return {
    path: `${projectBase(project)}/pipelines/${pipelineId}/jobs`,
    query: { per_page: '100' },
  };
}

export function bridgesRequest(project: string, pipelineId: number): BuiltRequest {
  return {
    path: `${projectBase(project)}/pipelines/${pipelineId}/bridges`,
    query: { per_page: '100' },
  };
}

export function traceRequest(
  project: string,
  jobId: number,
  range?: { offset: number; limit: number },
): BuiltRequest {
  const query: Record<string, string> = {};
  if (range) {
    query.byte_offset = String(range.offset);
    query.byte_limit = String(range.limit);
  }
  return { path: `${projectBase(project)}/jobs/${jobId}/trace`, query };
}

/** The whole project, for its `permissions` and cancel-restriction role. */
export function projectRequest(project: string): BuiltRequest {
  return { path: projectBase(project), query: {} };
}

/** The current Access token's own details, for its `scopes`. */
export function tokenScopesRequest(): BuiltRequest {
  return { path: '/api/v4/personal_access_tokens/self', query: {} };
}

export function retryJobRequest(project: string, jobId: number): BuiltRequest {
  return { path: `${projectBase(project)}/jobs/${jobId}/retry`, query: {} };
}

export function playJobRequest(project: string, jobId: number): BuiltRequest {
  return { path: `${projectBase(project)}/jobs/${jobId}/play`, query: {} };
}

export function cancelJobRequest(project: string, jobId: number): BuiltRequest {
  return { path: `${projectBase(project)}/jobs/${jobId}/cancel`, query: {} };
}

export function retryPipelineRequest(project: string, pipelineId: number): BuiltRequest {
  return { path: `${projectBase(project)}/pipelines/${pipelineId}/retry`, query: {} };
}

export function cancelPipelineRequest(project: string, pipelineId: number): BuiltRequest {
  return { path: `${projectBase(project)}/pipelines/${pipelineId}/cancel`, query: {} };
}

/** Triggering a new Pipeline is the one write scoped to a Ref, not an entity. */
export function triggerPipelineRequest(project: string, ref: string): BuiltRequest {
  return { path: `${projectBase(project)}/pipeline`, query: { ref } };
}

/**
 * The redirect statuses GitLab answers a Moved project with. `300` (Multiple
 * Choices) and `304` (Not Modified) are not redirects to a new resource, so
 * they stay ordinary failures.
 */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * GitLab's documented move response — `This resource has been moved permanently
 * to <url>`. Returns the target URL, or null when the body is not that message.
 * The strictness is deliberate: it is the only reason to trust a redirect as a
 * move, and an unrelated redirect must not be mistaken for one.
 */
export function parseMoveTarget(body: string): string | null {
  const match = /This resource has been moved permanently to\s+(\S+)/.exec(body);
  const raw = match?.[1];
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * The project reference named by a redirect target URL, when that URL is on the
 * effective host — a project id, or an encoded path. GitLab answers a request
 * for a sub-resource with that resource's full location (e.g.
 * `/api/v4/projects/81/pipelines?per_page=100`), so only the first segment after
 * `projects/` names the project; any sub-resource path and query are dropped. A
 * target on another host is refused: following it would name a different
 * instance's project.
 */
export function projectFromRedirectTarget(target: string, host: string): string | null {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if (url.host !== host) return null;
  const match = /^\/api\/v4\/projects\/([^/]+)(?:\/|$)/.exec(url.pathname);
  const reference = match?.[1];
  if (!reference) return null;
  try {
    return decodeURIComponent(reference);
  } catch {
    return null;
  }
}

/** HTTP status → typed failure, or null for a success. */
export function mapHttpStatus(
  status: number,
  headers: Record<string, string> = {},
  now: number = Date.now(),
): ClientFailure | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401) return { kind: 'unauthorized' };
  if (status === 403) return { kind: 'forbidden' };
  if (status === 404) return { kind: 'not-found' };
  if (status === 429) {
    return { kind: 'rate-limited', retryAfterMs: parseRetryAfterMs(headers['retry-after'], now) };
  }
  if (REDIRECT_STATUSES.has(status)) return { kind: 'redirect', target: null };
  return { kind: 'http', status };
}

/** A host error code, when the error carries one. */
export function hostErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * Map a host error to a typed failure. `no-token` is the service refusing a
 * request for a host with no Access token; `NO_SERVICE` (not declared, not
 * granted, not started) and `SERVICE_FAILED` (crashed) mean the Proxy service
 * is unusable; everything else is a plain transport failure.
 */
export function clientFailureFromError(error: unknown): ClientFailure {
  const code = hostErrorCode(error);
  if (code === 'no-token') return { kind: 'no-token' };
  if (code === 'NO_SERVICE' || code === 'SERVICE_FAILED' || code === 'NOT_GRANTED') {
    return { kind: 'service' };
  }
  return { kind: 'network' };
}

type CallResult =
  | {
      ok: true;
      status: number;
      body: string;
      truncated?: boolean;
      headers?: Record<string, string>;
    }
  | { ok: false; failure: ClientFailure };

/**
 * One request, optionally through the cache. When the key is cached, an
 * `If-None-Match` goes out and a `304` reuses the cached body rather than
 * reading it as a failure. A `200` with no `ETag` simply means "not cacheable
 * this time", so the stale entry is dropped.
 */
async function call(
  requester: Requester,
  request: HostRequest,
  cache?: RequestCache,
): Promise<CallResult> {
  const key = cache ? cacheKey(request) : null;
  const cached = key ? cache?.get(key) : undefined;
  const outgoing: HostRequest = cached
    ? { ...request, headers: { ...(request.headers ?? {}), 'if-none-match': cached.etag } }
    : request;
  let response;
  try {
    response = await requester(outgoing);
  } catch (error) {
    return { ok: false, failure: clientFailureFromError(error) };
  }
  if (response.status === 304 && cached && key) {
    // A 304 carries no body; the cached one is still current.
    const headers: Record<string, string> = {
      ...(response.headers ?? {}),
      ...(cached.link ? { link: cached.link } : {}),
    };
    return {
      ok: true,
      status: 304,
      body: cached.body,
      ...(Object.keys(headers).length ? { headers } : {}),
    };
  }
  const failure = mapHttpStatus(response.status, response.headers);
  if (failure) {
    // The status alone cannot say where a redirect points; only the body can.
    if (failure.kind === 'redirect') {
      return { ok: false, failure: { kind: 'redirect', target: parseMoveTarget(response.body) } };
    }
    return { ok: false, failure };
  }
  if (key && cache) {
    const etag = response.headers?.['etag'];
    const link = response.headers?.['link'];
    if (etag) remember(cache, key, { etag, body: response.body, ...(link ? { link } : {}) });
    else cache.delete(key);
  }
  return {
    ok: true,
    status: response.status,
    body: response.body,
    ...(response.truncated != null ? { truncated: response.truncated } : {}),
    ...(response.headers ? { headers: response.headers } : {}),
  };
}

function parseJson<T>(body: string, status: number): ClientResult<T> {
  try {
    return { ok: true, data: JSON.parse(body) as T };
  } catch {
    return { ok: false, failure: { kind: 'http', status } };
  }
}

/** The list options every Pipelines fetch shares. */
export type PipelineOptions = {
  scope: Scope;
  ref?: string | null;
  perPage?: number;
  page?: number;
};

/** A requested page of Pipelines, with the next page's number or null. */
export type PipelinePage = {
  pipelines: Pipeline[];
  nextPage: number | null;
};

export async function fetchPipelines(
  requester: Requester,
  project: string,
  options: PipelineOptions,
  cache?: RequestCache,
): Promise<ClientResult<PipelinePage>> {
  const request = pipelinesRequest(project, options);
  const result = await call(requester, { method: 'GET', ...request }, cache);
  if (!result.ok) return result;
  const parsed = parseJson<Pipeline[]>(result.body, result.status);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    data: { pipelines: parsed.data, nextPage: nextPageFromLink(result.headers?.link) },
  };
}

/** The authenticated account `/api/v4/user` answers, used to show who the token is. */
export type AuthenticatedUser = {
  username?: string | null;
  name?: string | null;
};

export async function fetchUser(requester: Requester): Promise<ClientResult<AuthenticatedUser>> {
  const result = await call(requester, { method: 'GET', path: '/api/v4/user', query: {} });
  if (!result.ok) return result;
  return parseJson<AuthenticatedUser>(result.body, result.status);
}

export async function fetchJobs(
  requester: Requester,
  project: string,
  pipelineId: number,
  cache?: RequestCache,
): Promise<ClientResult<Job[]>> {
  const request = jobsRequest(project, pipelineId);
  const result = await call(requester, { method: 'GET', ...request }, cache);
  if (!result.ok) return result;
  return parseJson<Job[]>(result.body, result.status);
}

export async function fetchBridges(
  requester: Requester,
  project: string,
  pipelineId: number,
  cache?: RequestCache,
): Promise<ClientResult<Bridge[]>> {
  const request = bridgesRequest(project, pipelineId);
  const result = await call(requester, { method: 'GET', ...request }, cache);
  if (!result.ok) return result;
  return parseJson<Bridge[]>(result.body, result.status);
}

export async function fetchTrace(
  requester: Requester,
  project: string,
  jobId: number,
  cache?: RequestCache,
): Promise<ClientResult<string>> {
  const request = traceRequest(project, jobId);
  const result = await call(requester, { method: 'GET', ...request }, cache);
  if (!result.ok) {
    // A job with no trace answers 404; treat that as an empty log, not an error.
    if (result.failure.kind === 'not-found') return { ok: true, data: '' };
    return result;
  }
  return {
    ok: true,
    data: result.body,
    ...(result.truncated != null ? { truncated: result.truncated } : {}),
  };
}

/** The largest Trace window the Panel asks for in one request. */
export const TRACE_BYTE_LIMIT = HOST_BODY_CAP;

/** The UTF-8 byte length of a decoded Trace window, for the next offset. */
export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * One incremental Trace window. `more` says the Panel should ask again: either
 * the service truncated the body (there is more), or the window filled the
 * requested limit (so the Trace likely continues past it).
 */
export type TraceWindow = {
  text: string;
  nextOffset: number;
  more: boolean;
};

/**
 * Fetch the Trace from `offset` as a byte window. Used while a Job is running,
 * so a long log accumulates window by window instead of being re-read whole.
 * See ADR-0010.
 */
export async function fetchTraceRange(
  requester: Requester,
  project: string,
  jobId: number,
  offset: number,
  limit: number = TRACE_BYTE_LIMIT,
): Promise<ClientResult<TraceWindow>> {
  const request = traceRequest(project, jobId, { offset, limit });
  const result = await call(requester, { method: 'GET', ...request });
  if (!result.ok) {
    if (result.failure.kind === 'not-found') {
      return { ok: true, data: { text: '', nextOffset: offset, more: false } };
    }
    return result;
  }
  const bytes = utf8Length(result.body);
  return {
    ok: true,
    data: {
      text: result.body,
      nextOffset: offset + bytes,
      more: result.truncated === true || bytes >= limit,
    },
  };
}

/**
 * The project's detail: `permissions` says whether the user may write, and
 * `ci_restrict_pipeline_cancellation_role` whether Cancel is allowed at all.
 */
export type ProjectDetail = {
  id: number;
  path_with_namespace?: string | null;
  permissions?: {
    project_access?: { access_level?: number } | null;
    group_access?: { access_level?: number } | null;
  } | null;
  ci_restrict_pipeline_cancellation_role?: string | null;
};

/** The current Access token's own scopes, for deciding whether writes are possible. */
export type TokenScopes = {
  scopes?: string[] | null;
};

export async function fetchProject(
  requester: Requester,
  project: string,
): Promise<ClientResult<ProjectDetail>> {
  const result = await call(requester, { method: 'GET', ...projectRequest(project) });
  if (!result.ok) return result;
  return parseJson<ProjectDetail>(result.body, result.status);
}

/**
 * The token's scopes. A failure is not "no scopes": a non-personal token, or an
 * instance that refuses the self route, leaves the scopes *unknown*, and the
 * caller must allow the attempt rather than hide the action.
 */
export async function fetchTokenScopes(requester: Requester): Promise<ClientResult<TokenScopes>> {
  const result = await call(requester, { method: 'GET', ...tokenScopesRequest() });
  if (!result.ok) return result;
  return parseJson<TokenScopes>(result.body, result.status);
}

/** A write call's one seam: send a POST and report success by status alone. */
async function send(
  requester: Requester,
  request: BuiltRequest,
  body?: string,
): Promise<WriteResult> {
  const result = await call(requester, {
    method: 'POST',
    path: request.path,
    query: request.query,
    ...(body != null ? { body } : {}),
  });
  if (!result.ok) return result;
  return { ok: true, status: result.status };
}

export function retryJob(requester: Requester, project: string, jobId: number): Promise<WriteResult> {
  return send(requester, retryJobRequest(project, jobId));
}

export function playJob(requester: Requester, project: string, jobId: number): Promise<WriteResult> {
  return send(requester, playJobRequest(project, jobId));
}

/** Cancel a Job; the call takes no body. */
export function cancelJob(requester: Requester, project: string, jobId: number): Promise<WriteResult> {
  return send(requester, cancelJobRequest(project, jobId));
}

/** Finish off a Job already stuck in `canceling`; needs Maintainer. */
export function forceCancelJob(
  requester: Requester,
  project: string,
  jobId: number,
): Promise<WriteResult> {
  return send(requester, cancelJobRequest(project, jobId), JSON.stringify({ force: true }));
}

export function retryPipeline(
  requester: Requester,
  project: string,
  pipelineId: number,
): Promise<WriteResult> {
  return send(requester, retryPipelineRequest(project, pipelineId));
}

export function cancelPipeline(
  requester: Requester,
  project: string,
  pipelineId: number,
): Promise<WriteResult> {
  return send(requester, cancelPipelineRequest(project, pipelineId));
}

export function triggerPipeline(requester: Requester, project: string, ref: string): Promise<WriteResult> {
  return send(requester, triggerPipelineRequest(project, ref));
}
