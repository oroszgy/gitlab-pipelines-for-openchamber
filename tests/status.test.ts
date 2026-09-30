import { describe, expect, test } from 'bun:test';
import { ACTIVE_STATUSES, isActiveStatus, jobStatusInfo, statusInfo } from '../panel/status';

describe('statusInfo', () => {
  const cases: Array<[string, string, string, string]> = [
    ['success', 'Passed', 'success', 'check'],
    ['failed', 'Failed', 'error', 'cross'],
    ['running', 'Running', 'info', 'loader'],
    ['pending', 'Pending', 'warning', 'clock'],
    ['created', 'Created', 'neutral', 'circle'],
    ['preparing', 'Preparing', 'warning', 'loader'],
    ['scheduled', 'Scheduled', 'neutral', 'calendar'],
    ['waiting_for_resource', 'Waiting for resource', 'neutral', 'pause'],
    ['waiting_for_callback', 'Waiting for callback', 'neutral', 'hourglass'],
    ['canceling', 'Canceling', 'warning', 'loader'],
    ['canceled', 'Canceled', 'neutral', 'slash'],
    ['skipped', 'Skipped', 'neutral', 'skip'],
    ['manual', 'Manual', 'primary', 'play'],
  ];

  for (const [status, label, tone, glyph] of cases) {
    test(`${status} → ${label}/${tone}/${glyph}`, () => {
      expect(statusInfo(status)).toMatchObject({ label, tone, glyph });
    });
  }

  test('falls back for an unknown status', () => {
    expect(statusInfo('something_new')).toEqual({ label: 'Unknown', tone: 'neutral', glyph: 'dot' });
  });

  test('every known status is distinguishable by label and glyph', () => {
    const seen = new Map<string, string>();
    for (const [status] of cases) {
      const info = statusInfo(status);
      const key = `${info.label}\u0000${info.glyph}`;
      expect(seen.has(key)).toBe(false);
      seen.set(key, status);
    }
  });

  test('only the running glyph animates', () => {
    expect(statusInfo('running').animate).toBe(true);
    for (const status of ['preparing', 'canceling', 'pending']) {
      expect(statusInfo(status).animate).toBeUndefined();
    }
  });

  test('skipped is muted', () => {
    expect(statusInfo('skipped').muted).toBe(true);
  });
});

describe('jobStatusInfo', () => {
  test('a failed job with allow_failure reads as a warning', () => {
    expect(jobStatusInfo({ status: 'failed', allow_failure: true })).toMatchObject({
      label: 'Failed (allowed)',
      tone: 'warning',
      glyph: 'cross',
    });
  });
  test('a plain failed job stays an error', () => {
    expect(jobStatusInfo({ status: 'failed', allow_failure: false }).tone).toBe('error');
  });
});

describe('isActiveStatus', () => {
  test('the active set', () => {
    for (const status of ACTIVE_STATUSES) expect(isActiveStatus(status)).toBe(true);
  });
  test('settled statuses', () => {
    for (const status of ['success', 'failed', 'canceled', 'skipped', 'manual', 'scheduled']) {
      expect(isActiveStatus(status)).toBe(false);
    }
  });
  test('null is not active', () => {
    expect(isActiveStatus(null)).toBe(false);
  });
});
