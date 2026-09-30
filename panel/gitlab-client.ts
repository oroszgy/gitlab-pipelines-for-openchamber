import { PER_PAGE } from './config';
import type { HostPort, HostRequest, HostResponse } from './host-port';
import type { Job, Pipeline, Scope } from './types';

/** A typed failure, mapped from an HTTP status or a host error. */
export type ClientFailure =
  | { kind: 'disconnected' }
  | { kind: 'unauthorized' }
  | { kind: 'not-found' }
  | { kind: 'http'; status: number }
  | { kind: 'network' };

/**
 * The one call a GitLab fetch makes. In built-in mode this is the host request
 * bridge; in custom-host mode it is the proxy service. Kept narrow so the client
 * never sees the transport, only "send this and give me a status and a body".
 */
export type Requester = (request: HostRequest) => Promise<HostResponse>;

/**
 * Wrap a host port as a `Requester`. Host ports are objects, so a bare method
 * reference would lose its `this`; this keeps the call bound.
 */
export function fromHostPort(port: HostPort): Requester {
  return (request) => port.request(request);
}

export type ClientResult<T> = { ok: true; data: T } | { ok: false; failure: ClientFailure };

export type BuiltRequest = {
  path: string;
  query: Record<string, string>;
};

/** `/api/v4/projects/:encoded-path` — GitLab accepts the URL-encoded path or a numeric id. */
export function projectBase(project: string): string {
  return `/api/v4/projects/${encodeURIComponent(project)}`;
}

export function pipelinesRequest(
  project: string,
  options: { scope: Scope; ref?: string | null; perPage?: number } = { scope: 'all' },
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
  return { path: `${projectBase(project)}/pipelines`, query };
}

export function jobsRequest(project: string, pipelineId: number): BuiltRequest {
  return {
    path: `${projectBase(project)}/pipelines/${pipelineId}/jobs`,
    query: { per_page: '100' },
  };
}

export function traceRequest(project: string, jobId: number): BuiltRequest {
  return { path: `${projectBase(project)}/jobs/${jobId}/trace`, query: {} };
}

/** HTTP status → typed failure, or null for a success. */
export function mapHttpStatus(status: number): ClientFailure | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return { kind: 'unauthorized' };
  if (status === 404) return { kind: 'not-found' };
  return { kind: 'http', status };
}

export function isDisconnectedError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'DISCONNECTED'
  );
}

type CallResult = { ok: true; status: number; body: string } | { ok: false; failure: ClientFailure };

async function call(requester: Requester, request: HostRequest): Promise<CallResult> {
  let response;
  try {
    response = await requester(request);
  } catch (error) {
    return { ok: false, failure: isDisconnectedError(error) ? { kind: 'disconnected' } : { kind: 'network' } };
  }
  const failure = mapHttpStatus(response.status);
  if (failure) return { ok: false, failure };
  return { ok: true, status: response.status, body: response.body };
}

function parseJson<T>(body: string, status: number): ClientResult<T> {
  try {
    return { ok: true, data: JSON.parse(body) as T };
  } catch {
    return { ok: false, failure: { kind: 'http', status } };
  }
}

export async function fetchPipelines(
  requester: Requester,
  project: string,
  options: { scope: Scope; ref?: string | null; perPage?: number },
): Promise<ClientResult<Pipeline[]>> {
  const request = pipelinesRequest(project, options);
  const result = await call(requester, { method: 'GET', ...request });
  if (!result.ok) return result;
  return parseJson<Pipeline[]>(result.body, result.status);
}

export async function fetchJobs(
  requester: Requester,
  project: string,
  pipelineId: number,
): Promise<ClientResult<Job[]>> {
  const request = jobsRequest(project, pipelineId);
  const result = await call(requester, { method: 'GET', ...request });
  if (!result.ok) return result;
  return parseJson<Job[]>(result.body, result.status);
}

export async function fetchTrace(
  requester: Requester,
  project: string,
  jobId: number,
): Promise<ClientResult<string>> {
  const request = traceRequest(project, jobId);
  const result = await call(requester, { method: 'GET', ...request });
  if (!result.ok) {
    // A job with no trace answers 404; treat that as an empty log, not an error.
    if (result.failure.kind === 'not-found') return { ok: true, data: '' };
    return result;
  }
  return { ok: true, data: result.body };
}
