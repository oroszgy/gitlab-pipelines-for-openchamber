/** Presentation formatters. Pure: they take values, never a clock they own. */

/** First 7 characters of a commit SHA. */
export function shortSha(sha: string | null | undefined): string {
  return (sha ?? '').slice(0, 7);
}

/** ISO date string → epoch ms, or null when absent/unparseable. */
export function toEpoch(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * GitLab-style duration: `45s`, `2m 30s`, `1h 04m`.
 * Round to the nearest second; negative and absent values render empty.
 */
export function duration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '';
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${String(rem).padStart(2, '0')}s` : `${m}m`;
  const hr = Math.floor(m / 60);
  const min = m % 60;
  return `${hr}h ${String(min).padStart(2, '0')}m`;
}

/** Elapsed seconds between two epochs, as a GitLab duration. */
export function elapsed(startMs: number, endMs: number): string {
  return duration((endMs - startMs) / 1000);
}

/**
 * Relative age: `just now` under 10s, then `Ns ago`, `Nm ago`, `Nh ago`,
 * `Nd ago`, `Nmo ago`.
 */
export function ago(epochMs: number, now: number = Date.now()): string {
  const diff = Math.max(0, Math.round((now - epochMs) / 1000));
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

/** The last `count` lines of a trace, joined back with their newlines. */
export function tailLines(text: string | null | undefined, count: number): string[] {
  if (text == null || text === '') return [];
  const lines = text.split('\n');
  if (count <= 0) return [];
  return lines.slice(-count);
}
