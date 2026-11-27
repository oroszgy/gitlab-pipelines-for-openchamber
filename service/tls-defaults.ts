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
 * stays one call and tests need no real TLS. Best-effort by design: if the
 * platform store cannot be read, or installing the merged list fails, keep
 * Node's defaults and let the service start. One proxied request then fails
 * with a readable TLS error instead of the whole Proxy service disappearing.
 */

/** The narrow TLS surface both Node 24.5+ and the tests provide. */
export type TlsCaSurface = {
  getCACertificates?: (type: 'default' | 'system') => string[];
  setDefaultCACertificates?: (certificates: readonly string[]) => void;
};

export type TlsDiagnostic = (line: string) => void;

/** Fixed text: a failure must never write a certificate, token or path out. */
const KEPT_DEFAULTS = 'Proxy service: could not add the system CA store; keeping the default CAs.\n';

/**
 * Adds the system CA certificates after Node's defaults, once, for this thread.
 * A runtime without the TLS APIs is left untouched; any failure is swallowed
 * after at most one diagnostic line, so startup always continues.
 */
export function installSystemCAs(
  surface: TlsCaSurface,
  report: TlsDiagnostic = (line) => process.stderr.write(line),
): void {
  const { getCACertificates, setDefaultCACertificates } = surface;
  if (typeof getCACertificates !== 'function' || typeof setDefaultCACertificates !== 'function') {
    return;
  }

  let merged: string[];
  try {
    merged = [...getCACertificates('default'), ...getCACertificates('system')];
  } catch {
    diagnose(report);
    return;
  }

  try {
    setDefaultCACertificates(merged);
  } catch {
    diagnose(report);
  }
}

/** A diagnostic must never stop the service from binding. */
function diagnose(report: TlsDiagnostic): void {
  try {
    report(KEPT_DEFAULTS);
  } catch {
    // Nothing left to report to.
  }
}
