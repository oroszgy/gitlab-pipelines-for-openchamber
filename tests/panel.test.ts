import { afterEach, describe, expect, test } from 'bun:test';
import type { HostRequest, HostResponse } from '../panel/host-port';
import { mountPanel, type PanelHandle } from '../panel/panel';
import type { Job, Pipeline } from '../panel/types';
import { FakeHost, FakeTimers, GIT_CONFIG, flush, readyContext } from './fakes';

const HOST = 'https://gitlab.com';

afterEach(() => {
  document.body.replaceChildren();
});

function pipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 1,
    iid: 1,
    status: 'success',
    source: 'push',
    ref: 'main',
    sha: 'abcdef1234567890',
    web_url: 'https://gitlab.com/group/project/-/pipelines/1',
    created_at: '2026-09-30T11:50:00Z',
    updated_at: '2026-09-30T11:58:00Z',
    started_at: '2026-09-30T11:50:00Z',
    finished_at: '2026-09-30T11:52:00Z',
    duration: 120,
    ...overrides,
  };
}

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    name: 'build',
    stage: 'build',
    status: 'success',
    allow_failure: false,
    duration: 10,
    created_at: '2026-09-30T11:50:00Z',
    started_at: '2026-09-30T11:50:00Z',
    finished_at: '2026-09-30T11:50:10Z',
    web_url: 'https://gitlab.com/group/project/-/jobs/1',
    ...overrides,
  };
}

function configuredHost(): FakeHost {
  const host = new FakeHost();
  host.files.set('.git/config', GIT_CONFIG);
  host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
  host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
  host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
  return host;
}

function handlerFor(data: {
  pipelines?: Pipeline[];
  jobs?: Job[];
  trace?: string;
  fail?: HostResponse;
}): (request: HostRequest) => HostResponse {
  return (request) => {
    if (data.fail) return data.fail;
    if (request.path.endsWith('/pipelines')) {
      return { status: 200, body: JSON.stringify(data.pipelines ?? []) };
    }
    if (request.path.endsWith('/jobs')) {
      return { status: 200, body: JSON.stringify(data.jobs ?? []) };
    }
    if (request.path.endsWith('/trace')) {
      return { status: 200, body: data.trace ?? '' };
    }
    return { status: 404, body: '' };
  };
}

async function mount(
  host: FakeHost,
  timers: FakeTimers,
  ready = readyContext(),
): Promise<{ root: HTMLElement; panel: PanelHandle }> {
  const root = document.createElement('div');
  document.body.append(root);
  const panel = mountPanel(root, host, { apiOrigin: HOST, timers });
  host.emitReady(ready);
  await flush();
  return { root, panel };
}

function text(root: HTMLElement): string {
  return root.textContent ?? '';
}

function pipelineRequests(host: FakeHost): HostRequest[] {
  return host.requests.filter((request) => request.path.endsWith('/pipelines'));
}

describe('project resolution in the header', () => {
  test('shows the resolved host, project path and current ref', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('gitlab.com/group/project');
    expect(text(root)).toContain('main');
    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
  });

  test('no project open degrades the header and offers the setting', async () => {
    const host = configuredHost();
    host.handler = handlerFor({});
    const { root } = await mount(host, new FakeTimers(), readyContext({ directory: null }));
    expect(text(root)).toContain('No project open');
    expect(root.querySelector('.gp-project')?.hasAttribute('hidden')).toBe(true);
    expect(text(root)).toContain('Project');
  });

  test('a project that is not a repo says so', async () => {
    const host = new FakeHost();
    host.handler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Not a Git repository');
    expect(text(root)).toContain('Project');
  });

  test('a remote on another host is reported with no phantom path', async () => {
    const host = configuredHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@github.com:me/proj.git\n');
    host.handler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Different GitLab host');
    expect(text(root)).toContain('github.com/me/proj');
    expect(root.querySelector('.gp-project')?.hasAttribute('hidden')).toBe(true);
    expect(text(root)).not.toContain('gitlab.com/group');
  });

  test('a linked worktree is its own state, not "not a repo"', async () => {
    const host = configuredHost();
    host.files.delete('.git/config');
    host.files.delete('.git/HEAD');
    host.files.set('.git', 'gitdir: /primary/.git/worktrees/wt\n');
    host.worktrees = [{ directory: '/repo', name: 'wt', branch: 'feature/x', status: 'ready' }];
    host.handler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Linked worktree');
    expect(text(root)).toContain('Current ref: feature/x');
    expect(text(root)).not.toContain('Not a Git repository');
    expect(text(root)).toContain('Project');
  });
});

describe('pipeline list', () => {
  test('lists pipelines newest first with a two-line row', async () => {
    const host = configuredHost();
    host.handler = handlerFor({
      pipelines: [
        pipeline({ id: 2, iid: 12, ref: 'newer', sha: '1111111aaaa', status: 'failed' }),
        pipeline({ id: 1, iid: 11, ref: 'older', sha: '2222222bbbb' }),
      ],
    });
    const { root } = await mount(host, new FakeTimers());
    const rows = root.querySelectorAll('.gp-row');
    expect(rows.length).toBe(2);
    const first = rows[0] as HTMLElement;
    expect(first.textContent).toContain('newer');
    expect(first.textContent).toContain('1111111');
    expect(first.textContent).toContain('#12');
    expect(first.textContent).toContain('Failed');
  });

  test('shows a merge-request marker on the second line', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline({ merge_request: { iid: 5 } })] });
    const { root } = await mount(host, new FakeTimers());
    expect(root.querySelector('.gp-row-sub')?.textContent).toContain('!5');
  });

  test('keeps the source on the second line even when the pipeline has a name', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline({ name: 'nightly', source: 'schedule' })] });
    const { root } = await mount(host, new FakeTimers());
    const subtitle = root.querySelector('.gp-row-sub')?.textContent ?? '';
    expect(subtitle).toContain('nightly');
    expect(subtitle).toContain('schedule');
  });

  test('no pipelines for the ref is an empty state, not an error', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [] });
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('No pipelines for this ref');
  });

  test('a disconnected token is a typed state', async () => {
    const host = configuredHost();
    host.handler = () => {
      const error = new Error('disconnected') as Error & { code: string };
      error.code = 'DISCONNECTED';
      throw error;
    };
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('GitLab not connected');
  });
});

describe('expanding a pipeline', () => {
  test('shows jobs grouped by stage with done/total', async () => {
    const host = configuredHost();
    host.handler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [
        job({ id: 1, stage: 'build', name: 'compile', status: 'success' }),
        job({ id: 2, stage: 'build', name: 'package', status: 'failed', allow_failure: true }),
        job({ id: 3, stage: 'test', name: 'unit', status: 'running' }),
      ],
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    const stages = root.querySelectorAll('.gp-stage');
    expect(stages.length).toBe(2);
    expect(stages[0]?.textContent).toContain('build');
    expect(stages[0]?.textContent).toContain('2/2');
    expect(stages[1]?.textContent).toContain('test');
    expect(stages[1]?.textContent).toContain('0/1');
    const labels = Array.from(root.querySelectorAll('.gp-job .gp-icon')).map((icon) =>
      icon.getAttribute('aria-label'),
    );
    expect(labels).toContain('Failed (allowed)');
  });

  test('collapsing does not refetch jobs', async () => {    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job()] });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    const before = host.requests.filter((request) => request.path.endsWith('/jobs')).length;
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    const after = host.requests.filter((request) => request.path.endsWith('/jobs')).length;
    expect(after).toBe(before);
    expect(root.querySelector('.gp-jobs')).toBeNull();
  });

  test('offers a link back to GitLab when expanded', async () => {
    const host = configuredHost();
    host.handler = handlerFor({
      pipelines: [pipeline({ id: 7, web_url: 'https://gitlab.com/group/project/-/pipelines/7' })],
      jobs: [job()],
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    const link = root.querySelector('.gp-jobs-link') as HTMLAnchorElement;
    expect(link.textContent).toContain('View pipeline in GitLab');
    link.click();
    await flush();
    expect(host.openUrls).toContain('https://gitlab.com/group/project/-/pipelines/7');
  });

  test('a failed jobs fetch is an error, not an empty list', async () => {
    const host = configuredHost();
    host.handler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      }
      if (request.path.endsWith('/jobs')) return { status: 500, body: '' };
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('Could not load jobs');
    expect(text(root)).not.toContain('No jobs reported yet');
  });
});

describe('the job log drawer', () => {
  test('opens the last 40 lines wrapped, with a full-log link, and closes back', async () => {
    const host = configuredHost();
    const trace = Array.from({ length: 45 }, (_, index) => `line ${index + 1}`).join('\n');
    host.handler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();

    const drawer = root.querySelector('.gp-drawer');
    expect(drawer).not.toBeNull();
    const body = root.querySelector('.gp-drawer-body');
    expect(body?.textContent).toContain('line 45');
    expect(body?.textContent).not.toContain('line 5\n');
    expect(root.querySelector('.gp-drawer-link')?.textContent).toContain('View full log in GitLab');

    (root.querySelector('.gp-drawer-close') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer')).toBeNull();
    expect(root.querySelector('.gp-row')).not.toBeNull();
  });

  test('closing the drawer restores the list scroll position', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })] });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();

    const scroll = root.querySelector('.gp-scroll') as HTMLElement;
    scroll.scrollTop = 96;
    (root.querySelector('.gp-drawer-close') as HTMLElement).click();
    await flush();

    expect((root.querySelector('.gp-scroll') as HTMLElement).scrollTop).toBe(96);
  });

  test('a missing trace is a clear state', async () => {
    const host = configuredHost();
    host.handler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      if (request.path.endsWith('/jobs')) return { status: 200, body: JSON.stringify([job({ id: 9 })]) };
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('No log output yet');
  });

  test('a failed log fetch is an error, not "no output"', async () => {
    const host = configuredHost();
    host.handler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      }
      if (request.path.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify([job({ id: 9 })]) };
      }
      if (request.path.endsWith('/trace')) return { status: 500, body: '' };
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('Could not load the log');
    expect(text(root)).not.toContain('No log output yet');
  });
});

describe('branch / all refs scope', () => {
  test('switching scope refetches once without the ref filter', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline()] });
    const { root, panel } = await mount(host, new FakeTimers());
    expect(pipelineRequests(host)).toHaveLength(1);
    expect(pipelineRequests(host)[0]?.query?.ref).toBe('main');

    panel.setScope('all');
    await flush();

    const requests = pipelineRequests(host);
    expect(requests).toHaveLength(2);
    expect(requests[1]?.query?.ref).toBeUndefined();
    const active = root.querySelector('[role="tab"][aria-selected="true"]');
    expect(active?.textContent).toContain('All refs');
  });

  test('the scope control is hidden on a failure state', async () => {
    const host = configuredHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@github.com:me/proj.git\n');
    host.handler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());
    expect(root.querySelector('.gp-scope')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('[role="tablist"]')).toBeNull();
  });
});

describe('adaptive polling and freshness', () => {
  test('polls while running and stops once settled', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline({ status: 'running', finished_at: null })] });
    const timers = new FakeTimers();
    const { panel, root } = await mount(host, timers);
    expect(panel.isPolling()).toBe(true);
    expect(root.querySelector('.gp-updated')).not.toBeNull();
    expect(timers.pendingDelays()).toContain(5000);

    host.handler = handlerFor({ pipelines: [pipeline({ status: 'success' })] });
    timers.advance(5000);
    await flush();

    expect(panel.isPolling()).toBe(false);
    expect(text(root)).toContain('Passed');
  });

  test('a slow response cannot overwrite a newer one', async () => {
    const host = configuredHost();
    let release: ((response: HostResponse) => void) | null = null;
    host.handler = (request) => {
      if (!request.path.endsWith('/pipelines')) return { status: 404, body: '' };
      if (release == null) {
        return new Promise<HostResponse>((resolve) => {
          release = resolve;
        });
      }
      return { status: 200, body: JSON.stringify([pipeline({ id: 3, ref: 'newer' })]) };
    };

    const { root, panel } = await mount(host, new FakeTimers());
    panel.refresh();
    await flush();
    expect(text(root)).toContain('newer');

    if (release) (release as (response: HostResponse) => void)({
      status: 200,
      body: JSON.stringify([pipeline({ id: 1, ref: 'older' })]),
    });
    await flush();
    expect(text(root)).toContain('newer');
    expect(text(root)).not.toContain('older');
  });
});

describe('project override setting', () => {
  test('a pinned project is used instead of the derived one', async () => {
    const host = new FakeHost();
    host.handler = handlerFor({ pipelines: [] });
    const { root } = await mount(
      host,
      new FakeTimers(),
      readyContext({ directory: null, settings: { project: 'group/pinned' } }),
    );
    expect(text(root)).toContain('gitlab.com/group/pinned');
    expect(text(root)).not.toContain('No project open');
  });

  test('clearing the override returns to the derived project', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [] });
    const { root } = await mount(
      host,
      new FakeTimers(),
      readyContext({ settings: { project: 'group/pinned' } }),
    );
    expect(text(root)).toContain('gitlab.com/group/pinned');

    host.emitReady(readyContext({ settings: {} }));
    await flush();
    expect(text(root)).toContain('gitlab.com/group/project');
    expect(text(root)).not.toContain('pinned');
  });
});
