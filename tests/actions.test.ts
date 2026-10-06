import { describe, expect, test } from 'bun:test';
import {
  allowedActions,
  canCancel,
  canRunPipeline,
  cancelRoleOf,
  jobActions,
  menuState,
  pipelineActions,
  type Capability,
} from '../panel/actions';

const capability = (overrides: Partial<Capability> = {}): Capability => ({
  accessLevel: 30,
  canWrite: true,
  cancelRole: 'developer',
  ...overrides,
});

describe('cancelRoleOf', () => {
  test('reads the two restrictive roles and defaults everything else to developer', () => {
    expect(cancelRoleOf('maintainer')).toBe('maintainer');
    expect(cancelRoleOf('no_one')).toBe('no_one');
    expect(cancelRoleOf('developer')).toBe('developer');
    expect(cancelRoleOf(null)).toBe('developer');
    expect(cancelRoleOf(undefined)).toBe('developer');
    expect(cancelRoleOf('something-else')).toBe('developer');
  });
});

describe('jobActions', () => {
  test('offers Retry on a completed Job in any final state', () => {
    for (const status of ['failed', 'canceled', 'success']) {
      expect(jobActions(status, capability())).toContain('retry-job');
    }
  });

  test('offers Play only on a manual Job', () => {
    expect(jobActions('manual', capability())).toEqual(['play-job']);
    expect(jobActions('failed', capability())).not.toContain('play-job');
  });

  test('offers Cancel on the active, not-yet-complete statuses', () => {
    for (const status of [
      'created',
      'pending',
      'preparing',
      'running',
      'waiting_for_resource',
      'waiting_for_callback',
    ]) {
      expect(jobActions(status, capability())).toContain('cancel-job');
    }
  });

  test('offers Force cancel on a canceling Job, replacing Cancel', () => {
    const maintainer = jobActions('canceling', capability({ accessLevel: 40 }));
    expect(maintainer).toContain('force-cancel-job');
    expect(maintainer).not.toContain('cancel-job');
  });

  test('offers nothing on a status with no action', () => {
    expect(jobActions('skipped', capability())).toEqual([]);
    expect(jobActions('unknown', capability())).toEqual([]);
  });
});

describe('pipelineActions', () => {
  test('offers Retry pipeline on a failed or canceled Pipeline only', () => {
    expect(pipelineActions('failed', capability())).toContain('retry-pipeline');
    expect(pipelineActions('canceled', capability())).toContain('retry-pipeline');
    // Retrying a successful pipeline is a documented no-op, so it is not offered.
    expect(pipelineActions('success', capability())).toEqual([]);
  });

  test('offers Cancel pipeline on the active statuses', () => {
    for (const status of ['created', 'pending', 'preparing', 'running', 'canceling', 'waiting_for_resource']) {
      expect(pipelineActions(status, capability())).toContain('cancel-pipeline');
    }
  });
});

describe('role and restriction thresholds', () => {
  test('a role below Developer gets nothing', () => {
    const reporter = capability({ accessLevel: 20 });
    expect(jobActions('failed', reporter)).toEqual([]);
    expect(pipelineActions('failed', reporter)).toEqual([]);
    expect(canRunPipeline(reporter)).toBe(false);
  });

  test('an unknown or absent membership gets nothing', () => {
    const none = capability({ accessLevel: null });
    expect(jobActions('failed', none)).toEqual([]);
    expect(canRunPipeline(none)).toBe(false);
  });

  test('a Maintainer-only cancel restriction withholds Cancel from a Developer', () => {
    expect(canCancel(capability({ cancelRole: 'maintainer', accessLevel: 30 }))).toBe(false);
    expect(jobActions('running', capability({ cancelRole: 'maintainer', accessLevel: 30 }))).toEqual([]);
    expect(jobActions('running', capability({ cancelRole: 'maintainer', accessLevel: 40 }))).toContain('cancel-job');
  });

  test('no_one removes Cancel and Force cancel for everyone', () => {
    const owner = capability({ cancelRole: 'no_one', accessLevel: 50 });
    expect(jobActions('running', owner)).toEqual([]);
    expect(jobActions('canceling', owner)).toEqual([]);
    expect(pipelineActions('running', owner)).toEqual([]);
  });

  test('Force cancel needs Maintainer', () => {
    expect(jobActions('canceling', capability({ accessLevel: 30 }))).toEqual([]);
  });
});

describe('canRunPipeline', () => {
  test('is offered to a Developer when the token can write or its scope is unknown', () => {
    expect(canRunPipeline(capability({ canWrite: true }))).toBe(true);
    expect(canRunPipeline(capability({ canWrite: null }))).toBe(true);
  });

  test('is withheld from a read-scoped token and from a low role', () => {
    expect(canRunPipeline(capability({ canWrite: false }))).toBe(false);
    expect(canRunPipeline(capability({ accessLevel: 20 }))).toBe(false);
  });
});

describe('menuState', () => {
  test('is hidden when the status has no action', () => {
    expect(menuState('job', 'skipped', capability())).toEqual({ state: 'hidden' });
  });

  test('is hidden when the role is too low, even for an actionable status', () => {
    expect(menuState('job', 'failed', capability({ accessLevel: 20 }))).toEqual({ state: 'hidden' });
  });

  test('is disabled when the token is read-scoped', () => {
    expect(menuState('job', 'failed', capability({ canWrite: false }))).toEqual({
      state: 'disabled',
      reason: 'scope',
    });
  });

  test('is ready with the items otherwise', () => {
    expect(menuState('job', 'failed', capability())).toEqual({ state: 'ready', items: ['retry-job'] });
  });

  test('allowedActions dispatches on the kind', () => {
    expect(allowedActions('pipeline', 'failed', capability())).toContain('retry-pipeline');
    expect(allowedActions('job', 'failed', capability())).toContain('retry-job');
  });
});
