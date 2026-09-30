import { describe, expect, test } from 'bun:test';
import { GUEST_ATTACH_TEXT_MAX } from '@openchamber/sdk';

import {
  HANDOFF_TRACE_LINES,
  buildHandoff,
  handoffPrompt,
  isHandoffJob,
  type HandoffInput,
} from '../panel/handoff';
import { job, pipeline } from './fakes';

function input(overrides: Partial<HandoffInput> = {}): HandoffInput {
  return {
    providerId: 'gitlab-pipelines',
    project: 'group/project',
    pipeline: pipeline({
      iid: 12,
      status: 'failed',
      ref: 'feature/x',
      web_url: 'https://gitlab.com/group/project/-/pipelines/12',
    }),
    job: job({
      id: 9,
      name: 'unit',
      stage: 'test',
      status: 'failed',
      web_url: 'https://gitlab.com/group/project/-/jobs/9',
    }),
    trace: '',
    ...overrides,
  };
}

describe('isHandoffJob', () => {
  test('is true only for a failed Job', () => {
    expect(isHandoffJob(job({ status: 'failed' }))).toBe(true);
    expect(isHandoffJob(job({ status: 'failed', allow_failure: true }))).toBe(true);
    expect(isHandoffJob(job({ status: 'canceled' }))).toBe(false);
    expect(isHandoffJob(job({ status: 'manual' }))).toBe(false);
    expect(isHandoffJob(job({ status: 'running' }))).toBe(false);
    expect(isHandoffJob(job({ status: 'success' }))).toBe(false);
  });
});

describe('handoffPrompt', () => {
  test('names the Job, Pipeline and links, and says what to do', () => {
    const prompt = handoffPrompt(input());
    expect(prompt).toContain('A GitLab CI job has failed.');
    expect(prompt).toContain('- Project: group/project');
    expect(prompt).toContain('- Pipeline #12 (feature/x @ abcdef1)');
    expect(prompt).toContain('- Job: unit (test)');
    expect(prompt).toContain('- Pipeline: https://gitlab.com/group/project/-/pipelines/12');
    expect(prompt).toContain('- Job log: https://gitlab.com/group/project/-/jobs/9');
    expect(prompt).toContain('Investigate the cause and fix it in this repository.');
    expect(prompt).toContain('infrastructure, a flaky test');
  });

  test('carries only the last 100 lines of the Trace', () => {
    const trace = Array.from({ length: 150 }, (_, index) => `line ${index + 1}`).join('\n');
    const prompt = handoffPrompt(input({ trace }));
    expect(prompt).toContain(`line ${150}`);
    expect(prompt).toContain(`line ${150 - HANDOFF_TRACE_LINES + 1}`);
    expect(prompt).not.toContain(`\nline ${150 - HANDOFF_TRACE_LINES}\n`);
  });

  test('omits the log section when the Trace is empty', () => {
    const prompt = handoffPrompt(input({ trace: '' }));
    expect(prompt).not.toContain('Tail of the job log');
    expect(prompt).not.toContain('```');
    expect(prompt).toContain('Investigate the cause');
  });

  test('clamps a long Trace under the text cap, keeping the end', () => {
    const trace = Array.from({ length: 400 }, (_, index) => `line ${index + 1} ${'x'.repeat(120)}`).join('\n');
    const prompt = handoffPrompt(input({ trace }));
    expect(prompt.length).toBeLessThanOrEqual(GUEST_ATTACH_TEXT_MAX);
    expect(prompt).toContain('line 400 ');
    expect(prompt).toContain('Investigate the cause');
  });

  test('works when the Pipeline is unknown', () => {
    const prompt = handoffPrompt(input({ pipeline: null }));
    expect(prompt).toContain('- Job: unit (test)');
    expect(prompt).not.toContain('- Pipeline #');
  });
});

describe('buildHandoff', () => {
  test('builds a session request seeded from the Job and opens it', () => {
    const request = buildHandoff(input({ trace: 'boom' }));
    expect(request.providerId).toBe('gitlab-pipelines');
    expect(request.id).toBe('job-9');
    expect(request.title).toBe('unit');
    expect(request.url).toBe('https://gitlab.com/group/project/-/jobs/9');
    expect(request.navigation).toBe('open');
    expect(request.text).toContain('boom');
    expect(request.text).toBe(handoffPrompt(input({ trace: 'boom' })));
  });
});
