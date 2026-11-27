/**
 * Trust the OS certificate store in the Proxy service.
 *
 * The host spawns the service without Node's CA options (`--use-system-ca` is
 * not passed), so a self-managed GitLab behind a private CA the OS already
 * trusts fails verification with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Before the
 * first outbound request, append the system certificates to Node's bundled
 * defaults; the setter replaces the whole list, so both sets are passed in
 * order.
 *
 * The TLS surface is injected — the shape `node:tls` already has — so the shell
 * stays one call and tests need no real TLS.
 */

/** The narrow TLS surface both Node 24.5+ and the tests provide. */
export type TlsCaSurface = {
  getCACertificates?: (type: 'default' | 'system') => string[];
  setDefaultCACertificates?: (certificates: readonly string[]) => void;
};

/**
 * Adds the system CA certificates after Node's defaults, once, for this thread.
 * A runtime without both TLS APIs is left untouched.
 */
export function installSystemCAs(surface: TlsCaSurface): void {
  const { getCACertificates, setDefaultCACertificates } = surface;
  if (typeof getCACertificates !== 'function' || typeof setDefaultCACertificates !== 'function') {
    return;
  }

  setDefaultCACertificates([...getCACertificates('default'), ...getCACertificates('system')]);
}
