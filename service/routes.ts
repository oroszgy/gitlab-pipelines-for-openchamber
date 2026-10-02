/**
 * The service's configuration and proxy routes, as pure handlers.
 *
 * The loopback shell owns transport — binding `127.0.0.1`, enforcing the
 * host-issued bearer and moving JSON in and out — and hands each request here
 * with the configuration store's filesystem seam and the proxy's `fetch`
 * injected, so the routes are tested without a socket, a disk or a network.
 */

import {
  clearToken,
  readConfig,
  resolveToken,
  saveConfig,
  setToken,
  type Config,
  type ConfigFs,
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

/** A `/proxy` request: the GitLab call only. The token is resolved by the service. */
export type ProxyRouteRequest = Omit<ProxyRequest, 'token'>;

/** A host with no token is its own state, so the failure carries a code to map. */
export const NO_TOKEN_ERROR = 'No Access token is configured for this GitLab host.';

export type ProxyRouteResult =
  | { ok: true; status: number; body: string; truncated: boolean }
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
      token,
    },
    fetchImpl,
  );
}
