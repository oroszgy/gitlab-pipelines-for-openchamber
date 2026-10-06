/**
 * The Panel's view of the service-owned configuration.
 *
 * The Proxy service holds the Configured host, the Project override and one
 * Access token per host; the Panel receives only the host, the override and
 * whether a token exists. The token itself never leaves the service, so nothing
 * here ever carries one. Pure, so it is tested through the host seam.
 */

import type { HostResponse } from './host-port';

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
  let parsed: { status?: number; body?: string; error?: string; code?: string; truncated?: boolean };
  try {
    parsed = JSON.parse(response.body) as typeof parsed;
  } catch {
    // Not our envelope: hand the raw response straight through.
    return { status: response.status, body: response.body };
  }
  if (typeof parsed.status === 'number') {
    return {
      status: parsed.status,
      body: parsed.body ?? '',
      ...(typeof parsed.truncated === 'boolean' ? { truncated: parsed.truncated } : {}),
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
