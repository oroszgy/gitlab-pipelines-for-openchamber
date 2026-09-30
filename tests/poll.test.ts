import { describe, expect, test } from 'bun:test';
import { ACTIVE_STATUSES } from '../panel/status';
import { nextPollDelay, pollDecision, shouldPoll } from '../panel/poll';

describe('shouldPoll', () => {
  test('is true when any status is still moving', () => {
    for (const status of ACTIVE_STATUSES) {
      expect(shouldPoll([status])).toBe(true);
    }
    expect(shouldPoll(['success', 'running', 'failed'])).toBe(true);
  });

  test('is false when everything is settled', () => {
    expect(shouldPoll(['success', 'failed', 'canceled', 'skipped', 'manual', 'scheduled'])).toBe(false);
    expect(shouldPoll([])).toBe(false);
  });
});

describe('nextPollDelay', () => {
  test('stops (null) once nothing is active', () => {
    expect(nextPollDelay(['success', 'failed'])).toBeNull();
    expect(pollDecision(['success'])).toEqual({ active: false, delayMs: null });
  });

  test('uses the base interval while active', () => {
    expect(nextPollDelay(['running'])).toBe(5000);
    expect(nextPollDelay(['pending'], { intervalMs: 2000 })).toBe(2000);
  });

  test('backs off for a long-running pipeline', () => {
    expect(nextPollDelay(['running'], { elapsedMs: 3 * 60_000 })).toBe(10_000);
    expect(nextPollDelay(['running'], { elapsedMs: 11 * 60_000 })).toBe(15_000);
  });
});
