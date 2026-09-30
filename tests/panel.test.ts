import { afterEach, describe, expect, test } from 'bun:test';
import { HOST_BODY_CAP, LOG_MAX_LINES } from '../panel/config';
import type { HostRequest, HostResponse } from '../panel/host-port';
import { isAtBottom, mountPanel, type PanelHandle } from '../panel/panel';
import type { Job, Pipeline } from '../panel/types';
import { FakeHost, FakeTimers, GIT_CONFIG, flush, job, pipeline, readyContext } from './fakes';

const HOST = 'https://gitlab.com';

afterEach(() => {
  document.body.replaceChildren();
});

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
  const panel = mountPanel(root, host, { apiOrigin: HOST, timers });  host.emitReady(ready);
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
  test('opens the whole log wrapped, with a full-log link, and closes back', async () => {
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
    // Scrolling replaces the old 40-line peek, so lines beyond 40 are now present.
    expect(body?.textContent).toContain('line 1\n');
    expect(body?.textContent).toContain('line 45');
    expect(root.querySelector('.gp-drawer-link')?.textContent).toContain('View full log in GitLab');

    (root.querySelector('.gp-drawer-close') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer')).toBeNull();
    expect(root.querySelector('.gp-row')).not.toBeNull();
  });

  test('a log over the line cap says older lines are not shown', async () => {
    const host = configuredHost();
    const trace = Array.from({ length: LOG_MAX_LINES + 5 }, (_, index) => `line ${index + 1}`).join('\n');
    host.handler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-notice')?.textContent).toContain('Older lines not shown');
    expect(root.querySelector('.gp-drawer-body')?.textContent).not.toContain('line 1\n');
  });

  test('a log at the host body cap says GitLab capped it', async () => {
    const host = configuredHost();
    const trace = 'x'.repeat(HOST_BODY_CAP);
    host.handler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-notice')?.textContent).toContain('capped log');
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

describe('live log while a job runs', () => {
  test('refetches the open log while its job is active', async () => {
    const host = configuredHost();
    let trace = 'line 1';
    host.handler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify([job({ id: 9, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/trace')) return { status: 200, body: trace };
      return { status: 404, body: '' };
    };
    const timers = new FakeTimers();
    const { root } = await mount(host, timers);
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-body')?.textContent).toBe('line 1');

    trace = 'line 1\nline 2';
    timers.advance(5000);
    await flush();
    expect(root.querySelector('.gp-drawer-body')?.textContent).toContain('line 2');
  });

  test('does not refetch a settled job’s log, even while the pipeline polls', async () => {
    const host = configuredHost();
    host.handler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify([job({ id: 9, status: 'success' })]) };
      }
      if (request.path.endsWith('/trace')) return { status: 200, body: 'line 1' };
      return { status: 404, body: '' };
    };
    const timers = new FakeTimers();
    const { root, panel } = await mount(host, timers);
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(panel.isPolling()).toBe(true);

    const before = host.requests.filter((request) => request.path.endsWith('/trace')).length;
    timers.advance(5000);
    await flush();
    const after = host.requests.filter((request) => request.path.endsWith('/trace')).length;
    expect(after).toBe(before);
  });
});

describe('isAtBottom', () => {
  test('is true at the bottom and within the threshold', () => {
    expect(isAtBottom({ scrollTop: 100, scrollHeight: 300, clientHeight: 200 })).toBe(true);
    expect(isAtBottom({ scrollTop: 80, scrollHeight: 300, clientHeight: 200 })).toBe(true);
  });
  test('is false once scrolled further up', () => {
    expect(isAtBottom({ scrollTop: 40, scrollHeight: 300, clientHeight: 200 })).toBe(false);
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

describe('custom host mode', () => {
  function customHost(): FakeHost {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.example.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    return host;
  }

  test('routes GitLab fetches through the service and carries the token in the body', async () => {
    const host = customHost();
    host.serviceHandler = (request) => {
      const payload = JSON.parse(request.body ?? '{}') as { path?: string };
      if (payload.path?.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify({ status: 200, body: JSON.stringify([pipeline()]) }) };
      }
      return { status: 200, body: JSON.stringify({ status: 404, body: '' }) };
    };
    const root = document.createElement('div');
    document.body.append(root);
    const panel = mountPanel(root, host, { apiOrigin: HOST, timers: new FakeTimers() });
    host.emitReady(readyContext({ settings: { host: 'gitlab.example.com', token: 'pat' } }));
    await flush();

    expect(host.requests).toHaveLength(0);
    expect(host.serviceRequests.length).toBeGreaterThan(0);
    const first = host.serviceRequests[0];
    expect(first?.path).toBe('/proxy');
    expect(first?.query?.baseUrl).toBe('https://gitlab.example.com');
    const body = JSON.parse(first?.body ?? '{}') as { token?: string; path?: string };
    expect(body.token).toBe('pat');
    expect(body.path).toContain('/pipelines');
    expect(text(root)).toContain('Passed');
    panel.dispose();
  });

  test('keeps using the host bridge for the built-in host', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline()] });
    await mount(host, new FakeTimers(), readyContext({ settings: { host: 'gitlab.com' } }));
    expect(host.serviceRequests).toHaveLength(0);
    expect(host.requests.length).toBeGreaterThan(0);
  });
});

describe('switching hosts', () => {
  function customHost(): FakeHost {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.example.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    return host;
  }

  test('clearing the host returns to the built-in path with no foreign data', async () => {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.example.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    host.handler = handlerFor({ pipelines: [pipeline({ id: 1, ref: 'builtin' })] });
    host.serviceHandler = () => ({
      status: 200,
      body: JSON.stringify({ status: 200, body: JSON.stringify([pipeline({ id: 9, ref: 'custom' })]) }),
    });

    const root = document.createElement('div');
    document.body.append(root);
    const panel = mountPanel(root, host, { apiOrigin: HOST, timers: new FakeTimers() });
    host.emitReady(readyContext({ settings: { host: 'gitlab.example.com', token: 'pat' } }));
    await flush();
    expect(text(root)).toContain('custom');

    // Clearing the setting returns to the built-in host — here the remote is on
    // the custom host, so the built-in path reports the mismatch and clears data.
    host.emitReady(readyContext({ settings: {} }));
    await flush();

    expect(text(root)).not.toContain('custom');
    expect(text(root)).toContain('Different GitLab host');
    expect(root.querySelector('.gp-row')).toBeNull();
    panel.dispose();
  });

  test('a switch drops cached jobs from the previous host', async () => {
    const host = customHost();
    host.serviceHandler = (request) => {
      const body = JSON.parse(request.body ?? '{}') as { path?: string };
      if (body.path?.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify({ status: 200, body: JSON.stringify([pipeline({ id: 7 })]) }) };
      }
      if (body.path?.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify({ status: 200, body: JSON.stringify([job({ id: 3, name: 'old-job' })]) }) };
      }
      return { status: 200, body: JSON.stringify({ status: 404, body: '' }) };
    };
    const root = document.createElement('div');
    document.body.append(root);
    const panel = mountPanel(root, host, { apiOrigin: HOST, timers: new FakeTimers() });
    host.emitReady(readyContext({ settings: { host: 'gitlab.example.com', token: 'pat' } }));
    await flush();
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('old-job');

    host.emitReady(readyContext({ settings: {} }));
    await flush();
    expect(text(root)).not.toContain('old-job');
    panel.dispose();
  });

  test('the header names a custom host', async () => {
    const host = customHost();
    host.serviceHandler = () => ({ status: 200, body: JSON.stringify({ status: 200, body: '[]' }) });
    const root = document.createElement('div');
    document.body.append(root);
    const panel = mountPanel(root, host, { apiOrigin: HOST, timers: new FakeTimers() });
    host.emitReady(readyContext({ settings: { host: 'gitlab.example.com', token: 'pat' } }));
    await flush();
    expect(root.querySelector('.gp-foot-host')?.textContent).toContain('gitlab.example.com');
    expect(root.querySelector('.gp-host-tag')?.textContent).toBe('Custom host');
    panel.dispose();
  });

  test('the built-in mode shows no custom marker', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());
    expect(root.querySelector('.gp-foot-host')).toBeNull();
    expect(root.querySelector('.gp-host-tag')).toBeNull();
  });
});

describe('custom host failures and grants', () => {
  function customHost(): FakeHost {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.example.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    return host;
  }

  async function mountWith(host: FakeHost, settings: Record<string, string>) {
    const root = document.createElement('div');
    document.body.append(root);
    const panel = mountPanel(root, host, { apiOrigin: HOST, timers: new FakeTimers() });
    host.emitReady(readyContext({ settings }));
    await flush();
    return { root, panel };
  }

  test('a malformed host is a typed failure, not a fallback', async () => {
    const host = customHost();
    const { root, panel } = await mountWith(host, { host: 'not a host!!', token: 'pat' });
    expect(text(root)).toContain('Invalid GitLab host');
    expect(host.requests).toHaveLength(0);
    expect(host.serviceRequests).toHaveLength(0);
    panel.dispose();
  });

  test('a non-https host is refused rather than silently upgraded', async () => {
    const host = customHost();
    const { root, panel } = await mountWith(host, { host: 'http://gitlab.example.com', token: 'pat' });
    expect(text(root)).toContain('Invalid GitLab host');
    expect(host.serviceRequests).toHaveLength(0);
    panel.dispose();
  });

  test('a host with embedded credentials or a path is refused', async () => {
    const host = customHost();
    const credentialed = await mountWith(host, { host: 'https://u:p@gitlab.example.com', token: 'pat' });
    expect(text(credentialed.root)).toContain('Invalid GitLab host');
    credentialed.panel.dispose();
    const pathed = await mountWith(host, { host: 'https://gitlab.example.com/gitlab', token: 'pat' });
    expect(text(pathed.root)).toContain('Invalid GitLab host');
    pathed.panel.dispose();
  });

  test('a custom host with no token has its own state', async () => {
    const host = customHost();
    const { root, panel } = await mountWith(host, { host: 'gitlab.example.com' });
    expect(text(root)).toContain('No token for this host');
    expect(text(root)).not.toContain('GitLab not connected');
    expect(host.serviceRequests).toHaveLength(0);
    panel.dispose();
  });

  test('an ungranted service is a service state pointing at Settings', async () => {
    const host = customHost();
    host.serviceHandler = () => {
      const error = new Error('no service') as Error & { code: string };
      error.code = 'NO_SERVICE';
      throw error;
    };
    const { root, panel } = await mountWith(host, { host: 'gitlab.example.com', token: 'pat' });
    expect(text(root)).toContain('Proxy service unavailable');
    expect(text(root)).toContain('Extensions');
    panel.dispose();
  });

  test('a failed proxy request is an error, not an empty list', async () => {
    const host = customHost();
    host.serviceHandler = () => {
      throw new Error('REQUEST_FAILED');
    };
    const { root, panel } = await mountWith(host, { host: 'gitlab.example.com', token: 'pat' });
    expect(text(root)).toContain('Could not reach GitLab');
    expect(text(root)).not.toContain('No pipelines');
    panel.dispose();
  });

  test('a 502 envelope from the proxy shell is a network error, not an HTTP one', async () => {
    const host = customHost();
    // The shell answers a handler failure with 502 and an `error` envelope.
    host.serviceHandler = () => ({ status: 502, body: JSON.stringify({ error: 'Could not reach https://gitlab.example.com: boom' }) });
    const { root, panel } = await mountWith(host, { host: 'gitlab.example.com', token: 'pat' });
    expect(text(root)).toContain('Could not reach GitLab');
    expect(text(root)).not.toContain('unexpected response');
    panel.dispose();
  });

  test('the built-in path is unaffected with no service grant', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline()] });
    host.serviceHandler = () => {
      const error = new Error('no service') as Error & { code: string };
      error.code = 'NO_SERVICE';
      throw error;
    };
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Passed');
    expect(host.serviceRequests).toHaveLength(0);
  });

  test('an ordinary refresh keeps the list and the open log', async () => {
    const host = configuredHost();
    host.handler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace: 'line 1' });
    const { root, panel } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer')).not.toBeNull();

    panel.refresh();
    await flush();
    // The same Configured host: a refresh must not close the drawer or drop rows.
    expect(root.querySelector('.gp-drawer')).not.toBeNull();
    expect(root.querySelectorAll('.gp-row').length).toBe(1);
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

describe('session handoff', () => {
  function failedRun() {
    return handlerFor({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 9, name: 'unit', stage: 'test', status: 'failed' })],
      trace: 'setting up\nboom: tests failed',
    });
  }

  test('offers the action on the failed job row and in the drawer', async () => {
    const host = configuredHost();
    host.handler = failedRun();
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-job .gp-handoff')).not.toBeNull();

    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer .gp-handoff')).not.toBeNull();
  });

  test('the drawer action also starts a session', async () => {
    const host = configuredHost();
    host.handler = failedRun();
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();

    (root.querySelector('.gp-drawer .gp-handoff') as HTMLElement).click();
    await flush();
    expect(host.startSessions).toHaveLength(1);
    expect(host.startSessions[0]?.id).toBe('job-9');
  });

  test('the row keyboard handler does not hijack the action button', async () => {
    const host = configuredHost();
    host.handler = failedRun();
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();

    const action = root.querySelector('.gp-handoff') as HTMLElement;
    action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    expect(root.querySelector('.gp-drawer')).toBeNull();
  });

  test('starting a session seeds it from the job, opens it and does not open the drawer', async () => {
    const host = configuredHost();
    host.handler = failedRun();
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();

    (root.querySelector('.gp-handoff') as HTMLElement).click();
    await flush();

    expect(host.startSessions).toHaveLength(1);
    const request = host.startSessions[0];
    expect(request?.providerId).toBe('gitlab-pipelines');
    expect(request?.id).toBe('job-9');
    expect(request?.navigation).toBe('open');
    expect(request?.text).toContain('- Job: unit (test)');
    expect(request?.text).toContain('boom: tests failed');
    expect(root.querySelector('.gp-drawer')).toBeNull();
  });

  test('a skipped send is surfaced, not silent', async () => {
    const host = configuredHost();
    host.handler = failedRun();
    host.startSessionResult = { sessionId: 'ses_1', sent: 'no-model' };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-handoff') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-notice')).not.toBeNull();
    expect(text(root)).toContain('No model is selected');
  });

  test('a host error starting the session is surfaced', async () => {
    const host = configuredHost();
    host.handler = failedRun();
    host.startSessionError = new Error('boom');
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-handoff') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('Could not start a session');
  });

  test('a failed log fetch blocks the handoff with a clear message', async () => {
    const host = configuredHost();
    host.handler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'failed' })]) };
      }
      if (request.path.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify([job({ id: 9, status: 'failed' })]) };
      }
      if (request.path.endsWith('/trace')) return { status: 500, body: '' };
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-handoff') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('Could not read the job log');
    expect(host.startSessions).toHaveLength(0);
  });

  test('is disabled with an explanation when no project is open', async () => {
    const host = new FakeHost();
    host.handler = failedRun();
    const { root } = await mount(
      host,
      new FakeTimers(),
      readyContext({ directory: null, settings: { project: 'group/pinned' } }),
    );
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();

    const action = root.querySelector('.gp-handoff') as HTMLButtonElement;
    expect(action).not.toBeNull();
    expect(action.disabled).toBe(true);
    expect(action.title).toContain('Open a project');

    action.click();
    await flush();
    expect(host.startSessions).toHaveLength(0);
  });

  test('a job that did not fail offers nothing to fix', async () => {
    const host = configuredHost();
    host.handler = handlerFor({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [
        job({ id: 9, status: 'success' }),
        job({ id: 10, name: 'deploy', status: 'canceled' }),
      ],
      trace: 'ok',
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-handoff')).toBeNull();
  });
});
