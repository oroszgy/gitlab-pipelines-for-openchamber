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

/**
 * The slice of an outbound response the proxy needs: a reader it can stop
 * early, so a huge body is never fully resident in memory.
 */
export type ProxyBodyStream = {
  getReader(): {
    read(): Promise<{ done: boolean; value?: Uint8Array }>;
    cancel?(): Promise<void> | void;
  };
};

export type ProxyFetch = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}) => Promise<{ status: number; body?: ProxyBodyStream | null; text(): Promise<string> }>;

/** The request budget. Matches the host's own ~20 s ceiling. */
export const PROXY_TIMEOUT_MS = 20_000;

/** Matches the host's response cap, so the proxy never returns more than the bridge would. */
export const PROXY_BODY_MAX = 256_000;

/** GitLab access is read-only, and this is where that is enforced: only `GET`. */
const METHODS: readonly string[] = ['GET'];

/** The refusal shared by base-URL normalization and stored-host validation. */
export const HOST_ERROR = 'The GitLab host must be an https origin with no credentials or path.';

/**
 * The refusal for a path that resolves off the configured host. A protocol-
 * relative or backslash path would otherwise pick a new authority while the
 * request still carried the token.
 */
export const PATH_ERROR = 'The proxy path must stay on the configured GitLab host.';

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

/**
 * Read a response body up to the cap, then stop. Reading through the stream —
 * rather than `response.text()` — is what keeps a huge GitLab response from
 * being fully resident before it is trimmed: at most the cap plus one chunk is
 * ever held. When there is no stream (a bodyless response), fall back to the
 * whole text and trim, so the cap still holds.
 */
async function readCapped(response: {
  body?: ProxyBodyStream | null;
  text(): Promise<string>;
}): Promise<{ text: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return text.length > PROXY_BODY_MAX
      ? { text: text.slice(0, PROXY_BODY_MAX), truncated: true }
      : { text, truncated: false };
  }

  const decoder = new TextDecoder();
  let text = '';
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) text += decoder.decode(value, { stream: true });
    if (text.length > PROXY_BODY_MAX) {
      truncated = true;
      text = text.slice(0, PROXY_BODY_MAX);
      if (reader.cancel) await reader.cancel();
      break;
    }
  }
  if (!truncated) text += decoder.decode();
  return { text, truncated };
}

export async function handleProxy(request: ProxyRequest, fetchImpl: ProxyFetch): Promise<ProxyResult> {
  const origin = normalizeBaseUrl(request.baseUrl);
  if (!origin) {
    return { ok: false, error: HOST_ERROR };
  }
  if (!METHODS.includes(request.method)) {
    return { ok: false, error: `Unsupported method ${request.method}.` };
  }

  const url = buildTargetUrl(origin, request.path, request.query ?? {});
  if (new URL(url).origin !== origin) {
    return { ok: false, error: PATH_ERROR };
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${request.token}` };
  if (request.body != null) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  let response;
  let text: string;
  let truncated: boolean;
  try {
    // The abort stays live until the whole body is read, so a slow body cannot
    // hang the request after its headers arrive (US13).
    response = await fetchImpl(url, {
      method: request.method,
      headers,
      ...(request.body != null ? { body: request.body } : {}),
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'request failed';
    return { ok: false, error: redact(`Could not reach ${origin}: ${message}`, request.token) };
  }

  try {
    ({ text, truncated } = await readCapped(response));
  } catch {
    return { ok: false, error: 'The GitLab host returned no readable body.' };
  } finally {
    clearTimeout(timer);
  }

  return { ok: true, status: response.status, body: redact(text, request.token), truncated };
}
