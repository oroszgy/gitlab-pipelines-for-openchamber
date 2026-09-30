import type { Job } from './types';

export type StageGroup = {
  stage: string;
  jobs: Job[];
  /** Jobs in a terminal state: success, failed (allowed or not), canceled, skipped. */
  done: number;
  total: number;
};

const DONE = new Set(['success', 'failed', 'canceled', 'skipped']);

export function isDoneJob(job: Job): boolean {
  return DONE.has(job.status);
}

/**
 * A flat Job list → ordered Stage groups. Stage order is first-appearance in
 * the list GitLab returned (which is stage order); job order is preserved.
 */
export function groupJobsByStage(jobs: readonly Job[] = []): StageGroup[] {
  const order: string[] = [];
  const byStage = new Map<string, Job[]>();
  for (const job of jobs) {
    let bucket = byStage.get(job.stage);
    if (!bucket) {
      bucket = [];
      byStage.set(job.stage, bucket);
      order.push(job.stage);
    }
    bucket.push(job);
  }
  return order.map((stage) => {
    const stageJobs = byStage.get(stage) ?? [];
    return {
      stage,
      jobs: stageJobs,
      done: stageJobs.filter(isDoneJob).length,
      total: stageJobs.length,
    };
  });
}
