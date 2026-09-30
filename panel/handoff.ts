import type { StartSessionRequest } from '@openchamber/sdk';
import { GUEST_ATTACH_TEXT_MAX } from '@openchamber/sdk';

import { shortSha, tailLines } from './format';
import type { Job, Pipeline } from './types';

/**
 * Session handoff: turn a failed Job into a seeded OpenChamber session.
 *
 * Pure: it takes the Job and its Trace and returns a `StartSessionRequest`.
 * Only the 16 000-char text cap is enforced here; the host clamps the rest of
 * the `StartSessionRequest` fields itself.
 */

/** How much of a Job's Trace rides along. The end is where the failure surfaces. */
export const HANDOFF_TRACE_LINES = 100;

const HANDOFF_INSTRUCTION =
  'Investigate the cause and fix it in this repository. If the failure is infrastructure, a flaky ' +
  'test, or a runner/network/registry problem, say so plainly instead of inventing a code change.';

export type HandoffInput = {
  /** The Panel's provider id. */
  providerId: string;
  /** The GitLab project path the Job belongs to. */
  project: string;
  /** The Pipeline the Job belongs to, when known. */
  pipeline: Pipeline | null;
  job: Job;
  /** The Job's Trace; may be empty when GitLab returned no output. */
  trace: string;
};

/** Whether a Job offers the handoff: only a genuine failure, including an allowed one. */
export function isHandoffJob(job: Job): boolean {
  return job.status === 'failed';
}

/**
 * The seeded prompt: identifiers and links, then the Trace tail, then what to
 * do. Clamped under the SDK's text cap by keeping the end of the tail.
 */
export function handoffPrompt(input: HandoffInput): string {
  const lines = ['A GitLab CI job has failed.', ''];
  lines.push(`- Project: ${input.project}`);
  if (input.pipeline) {
    lines.push(
      `- Pipeline #${input.pipeline.iid} (${input.pipeline.ref || '—'} @ ${shortSha(input.pipeline.sha)})`,
    );
  }
  lines.push(`- Job: ${input.job.name} (${input.job.stage})`);
  if (input.pipeline?.web_url) lines.push(`- Pipeline: ${input.pipeline.web_url}`);
  if (input.job.web_url) lines.push(`- Job log: ${input.job.web_url}`);

  const head = lines.join('\n');
  const foot = `\n\n${HANDOFF_INSTRUCTION}`;
  const tail = tailLines(input.trace, HANDOFF_TRACE_LINES).join('\n');
  if (tail === '') return `${head}${foot}`;

  const wrap = (body: string): string => `${head}\n\nTail of the job log:\n\n\`\`\`\n${body}\n\`\`\`${foot}`;

  const prompt = wrap(tail);
  if (prompt.length <= GUEST_ATTACH_TEXT_MAX) return prompt;
  // Over the cap: drop whole characters from the front of the tail, keeping the
  // failure at the end. One trim is enough — wrap adds a fixed prefix and suffix.
  const trimmed = tail.slice(prompt.length - GUEST_ATTACH_TEXT_MAX);
  return trimmed === '' ? `${head}${foot}` : wrap(trimmed);
}

/** The request that starts the session. Omits `projectId`, so the host uses the open project. */
export function buildHandoff(input: HandoffInput): StartSessionRequest {
  return {
    providerId: input.providerId,
    id: `job-${input.job.id}`,
    title: input.job.name || `Job #${input.job.id}`,
    url: input.job.web_url ?? '',
    text: handoffPrompt(input),
    navigation: 'open',
  };
}
