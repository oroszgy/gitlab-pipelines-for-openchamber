/**
 * The one Status → tone/label/glyph map, shared by Pipeline rows, Job rows and
 * Stage chips. `glyph` names a shape; the panel owns the SVG for each name.
 */

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type Glyph = 'check' | 'cross' | 'clock' | 'circle' | 'loader' | 'hourglass' | 'slash' | 'skip' | 'play' | 'dot';

export type StatusInfo = {
  label: string;
  tone: Tone;
  glyph: Glyph;
  /** The spinner ring; the only animated glyph. */
  animate?: boolean;
  /** Dimmed, e.g. skipped jobs. */
  muted?: boolean;
};

const TABLE: Record<string, StatusInfo> = {
  success: { label: 'Passed', tone: 'success', glyph: 'check' },
  failed: { label: 'Failed', tone: 'error', glyph: 'cross' },
  running: { label: 'Running', tone: 'info', glyph: 'loader', animate: true },
  pending: { label: 'Pending', tone: 'warning', glyph: 'clock' },
  created: { label: 'Created', tone: 'neutral', glyph: 'circle' },
  preparing: { label: 'Preparing', tone: 'warning', glyph: 'loader' },
  scheduled: { label: 'Scheduled', tone: 'neutral', glyph: 'clock' },
  waiting_for_resource: { label: 'Waiting', tone: 'neutral', glyph: 'hourglass' },
  waiting_for_callback: { label: 'Waiting', tone: 'neutral', glyph: 'hourglass' },
  canceling: { label: 'Canceling', tone: 'warning', glyph: 'loader' },
  canceled: { label: 'Canceled', tone: 'neutral', glyph: 'slash' },
  skipped: { label: 'Skipped', tone: 'neutral', glyph: 'skip', muted: true },
  manual: { label: 'Manual', tone: 'primary', glyph: 'play' },
};

const FALLBACK: StatusInfo = { label: 'Unknown', tone: 'neutral', glyph: 'dot' };

export function statusInfo(status: string | null | undefined): StatusInfo {
  if (!status) return FALLBACK;
  return TABLE[status] ?? FALLBACK;
}

/** A Job that failed but is allowed to fail reads as a warning, not an error. */
export function jobStatusInfo(job: { status: string; allow_failure?: boolean }): StatusInfo {
  const info = statusInfo(job.status);
  if (job.status === 'failed' && job.allow_failure) {
    return { ...info, label: 'Failed (allowed)', tone: 'warning' };
  }
  return info;
}

/** Statuses where a Pipeline or Job is still moving. Shared with `poll`. */
export const ACTIVE_STATUSES: readonly string[] = [
  'pending',
  'running',
  'created',
  'preparing',
  'canceling',
  'waiting_for_resource',
  'waiting_for_callback',
];

const ACTIVE = new Set(ACTIVE_STATUSES);

export function isActiveStatus(status: string | null | undefined): boolean {
  return status != null && ACTIVE.has(status);
}
