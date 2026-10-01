import type { TriggerRow } from './downstream';
import type { Job } from './types';

export type StageGroup = {
  stage: string;
  jobs: Job[];
  /** Trigger rows in the Stage, rendered after the build Jobs. */
  triggers: TriggerRow[];
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
 *
 * Trigger rows join their Stage alongside the build Jobs, after them, and count
 * toward `done/total`; a Trigger job that has its Downstream pipeline may
 * introduce a Stage the build Jobs never named.
 */
export function groupJobsByStage(
  jobs: readonly Job[] = [],
  triggers: readonly TriggerRow[] = [],
): StageGroup[] {
  const order: string[] = [];
  const byStage = new Map<string, { jobs: Job[]; triggers: TriggerRow[] }>();
  const bucketFor = (stage: string) => {
    let bucket = byStage.get(stage);
    if (!bucket) {
      bucket = { jobs: [], triggers: [] };
      byStage.set(stage, bucket);
      order.push(stage);
    }
    return bucket;
  };
  for (const job of jobs) bucketFor(job.stage).jobs.push(job);
  for (const trigger of triggers) bucketFor(trigger.stage).triggers.push(trigger);
  return order.map((stage) => {
    const bucket = byStage.get(stage) ?? { jobs: [], triggers: [] };
    return {
      stage,
      jobs: bucket.jobs,
      triggers: bucket.triggers,
      done:
        bucket.jobs.filter(isDoneJob).length +
        bucket.triggers.filter((trigger) => DONE.has(trigger.status)).length,
      total: bucket.jobs.length + bucket.triggers.length,
    };
  });
}
