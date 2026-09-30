import { describe, expect, test } from 'bun:test';
import { groupJobsByStage, isDoneJob } from '../panel/stage-groups';
import type { Job } from '../panel/types';

function job(overrides: Partial<Job> & { id: number; stage: string; status: string }): Job {
  return {
    name: `job-${overrides.id}`,
    allow_failure: false,
    duration: null,
    created_at: null,
    started_at: null,
    finished_at: null,
    web_url: '',
    ...overrides,
  };
}

describe('groupJobsByStage', () => {
  test('orders stages by first appearance and keeps job order', () => {
    const groups = groupJobsByStage([
      job({ id: 1, stage: 'test', status: 'success' }),
      job({ id: 2, stage: 'build', status: 'success' }),
      job({ id: 3, stage: 'test', status: 'failed' }),
    ]);
    expect(groups.map((group) => group.stage)).toEqual(['test', 'build']);
    expect(groups[0]?.jobs.map((entry) => entry.id)).toEqual([1, 3]);
  });

  test('counts done against total', () => {
    const groups = groupJobsByStage([
      job({ id: 1, stage: 'build', status: 'success' }),
      job({ id: 2, stage: 'build', status: 'failed', allow_failure: true }),
      job({ id: 3, stage: 'build', status: 'running' }),
      job({ id: 4, stage: 'build', status: 'skipped' }),
    ]);
    expect(groups[0]).toMatchObject({ done: 3, total: 4 });
  });

  test('manual jobs are not done', () => {
    const groups = groupJobsByStage([job({ id: 1, stage: 'deploy', status: 'manual' })]);
    expect(groups[0]).toMatchObject({ done: 0, total: 1 });
  });

  test('an empty job list yields no stages', () => {
    expect(groupJobsByStage([])).toEqual([]);
    expect(groupJobsByStage()).toEqual([]);
  });
});

describe('isDoneJob', () => {
  test('terminal statuses are done', () => {
    expect(isDoneJob(job({ id: 1, stage: 's', status: 'success' }))).toBe(true);
    expect(isDoneJob(job({ id: 2, stage: 's', status: 'canceled' }))).toBe(true);
    expect(isDoneJob(job({ id: 3, stage: 's', status: 'skipped' }))).toBe(true);
  });
  test('moving statuses are not', () => {
    expect(isDoneJob(job({ id: 4, stage: 's', status: 'running' }))).toBe(false);
    expect(isDoneJob(job({ id: 5, stage: 's', status: 'pending' }))).toBe(false);
    expect(isDoneJob(job({ id: 6, stage: 's', status: 'manual' }))).toBe(false);
  });
});
