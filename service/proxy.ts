/**
 * The proxy handler: a dumb HTTPS proxy, deliberately knowing nothing about
 * GitLab. The Panel hands it a base URL, a personal access token and the
 * request to make; it performs the call and returns a status and a body.
 *
 * Pure and injectable so it can be tested through the one seam it has — the
 * `fetch` it is given. The loopback server around it is a shell.
 */

export type ProxyRequest = {
  baseUrl: string;
  token: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string>;
  body?: string;
};

export type ProxyResult =
  | { ok: true; status: number; body: string; truncated: boolean; error?: undefined }
  | { ok: false; status?: undefined; body?: undefined; truncated?: undefined; error: string };

export type ProxyFetch = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}) => Promise<{ status: number; text(): Promise<string> }>;

/** The request budget. Matches the host's own ~20 s ceiling. */
export const PROXY_TIMEOUT_MS = 20_000;

/** Matches the host's response cap, so the proxy never returns more than the bridge would. */
export const PROXY_BODY_MAX = 256_000;

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/**
 * A base URL is accepted as a bare host or a full origin, and refused unless it
 * is `https` with no embedded credentials and no path beyond the root.
 */
export function normalizeBaseUrl(baseUrl: string): string | null {
  const raw = baseUrl.trim();
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
  return url.origin;
}

/** The absolute target URL: the normalized origin, the path, then the query. */
export function buildTargetUrl(
  baseUrl: string,
  path: string,
  query: Record<string, string>,
): string {
  const origin = normalizeBaseUrl(baseUrl);
  if (!origin) throw new Error('invalid base URL');
  const url = new URL(path.startsWith('/') ? path : `/${path}`, origin);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url.toString();
}

/** The token is a secret: it must never survive into anything the Panel sees. */
function redact(text: string, token: string): string {
  if (!token) return text;
  return text.split(token).join('[redacted]');
}

export async function handleProxy(request: ProxyRequest, fetchImpl: ProxyFetch): Promise<ProxyResult> {
  const origin = normalizeBaseUrl(request.baseUrl);
  if (!origin) {
    return { ok: false, error: 'The GitLab host must be an https origin with no credentials or path.' };
  }
  if (!METHODS.includes(request.method)) {
    return { ok: false, error: `Unsupported method ${request.method}.` };
  }

  const url = buildTargetUrl(origin, request.path, request.query ?? {});
  const headers: Record<string, string> = { Authorization: `Bearer ${request.token}` };
  if (request.body != null) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(url, {
      method: request.method,
      headers,
      ...(request.body != null ? { body: request.body } : {}),
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'request failed';
    return { ok: false, error: redact(`Could not reach ${origin}: ${message}`, request.token) };
  } finally {
    clearTimeout(timer);
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: 'The GitLab host returned no readable body.' };
  }

  const truncated = text.length > PROXY_BODY_MAX;
  const body = truncated ? text.slice(0, PROXY_BODY_MAX) : text;
  return { ok: true, status: response.status, body: redact(body, request.token), truncated };
}
