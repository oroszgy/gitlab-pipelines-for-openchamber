import { isActiveStatus } from './status';
import { POLL_INTERVAL_MS } from './config';

export type PollDecision = {
  active: boolean;
  /** Milliseconds until the next poll, or null when polling should stop. */
  delayMs: number | null;
};

export type PollOptions = {
  /** Base interval between polls while active. */
  intervalMs?: number;
  /** How long the current activity has been observed, used for a mild back-off. */
  elapsedMs?: number;
};

/**
 * The adaptive rule: keep polling while any shown Status is still moving, and
 * stop when everything is settled. A long-running Pipeline backs off, so an
 * all-night run is not polled at full rate.
 */
export function pollDecision(
  statuses: Iterable<string | null | undefined>,
  options: PollOptions = {},
): PollDecision {
  const active = shouldPoll(statuses);
  if (!active) return { active: false, delayMs: null };
  const base = options.intervalMs ?? POLL_INTERVAL_MS;
  const elapsed = options.elapsedMs ?? 0;
  const backoff = elapsed > 10 * 60_000 ? 3 : elapsed > 2 * 60_000 ? 2 : 1;
  return { active: true, delayMs: base * backoff };
}

export function shouldPoll(statuses: Iterable<string | null | undefined>): boolean {
  for (const status of statuses) {
    if (isActiveStatus(status)) return true;
  }
  return false;
}

/** Convenience: the next delay, or null. */
export function nextPollDelay(
  statuses: Iterable<string | null | undefined>,
  options: PollOptions = {},
): number | null {
  return pollDecision(statuses, options).delayMs;
}
