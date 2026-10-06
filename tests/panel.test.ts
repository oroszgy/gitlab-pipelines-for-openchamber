import { afterEach, describe, expect, test } from 'bun:test';
import { HOST_BODY_CAP, LOG_MAX_LINES } from '../panel/config';
import type { HostRequest, HostResponse } from '../panel/host-port';
import { isAtBottom, mountPanel, type PanelHandle } from '../panel/panel';
import type { Bridge, Job, Pipeline } from '../panel/types';
import {
  FakeHost,
  FakeTimers,
  GIT_CONFIG,
  bridge,
  downstreamPipeline,
  flush,
  job,
  pipeline,
  readyContext,
} from './fakes';

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
  host.tokens['gitlab.com'] = 'pat';
  return host;
}

function handlerFor(data: {
  pipelines?: Pipeline[];
  jobs?: Job[];
  bridges?: Bridge[];
  trace?: string;
  traceTruncated?: boolean;
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
    if (request.path.endsWith('/bridges')) {
      return { status: 200, body: JSON.stringify(data.bridges ?? []) };
    }
    if (request.path.endsWith('/trace')) {
      return {
        status: 200,
        body: sliceTrace(data.trace ?? '', request),
        ...(data.traceTruncated != null ? { truncated: data.traceTruncated } : {}),
      };
    }
    return { status: 404, body: '' };
  };
}

/**
 * A Trace as GitLab's `byte_offset`/`byte_limit` would return it. A settled
 * fetch sends no range, so it gets the whole body.
 */
function sliceTrace(full: string, request: HostRequest): string {
  const offset = Number(request.query?.byte_offset ?? 0);
  const limit = Number(request.query?.byte_limit ?? full.length);
  return full.slice(offset, offset + limit);
}

async function mount(
  host: FakeHost,
  timers: FakeTimers,
  ready = readyContext(),
): Promise<{ root: HTMLElement; panel: PanelHandle }> {
  const root = document.createElement('div');
  document.body.append(root);
  const panel = mountPanel(root, host, { timers });  host.emitReady(ready);
  await flush();
  return { root, panel };
}

function text(root: HTMLElement): string {
  return root.textContent ?? '';
}

/** Open the configuration form the way a user would: click the header's gear. */
function openConfig(root: HTMLElement): void {
  (root.querySelector('.gp-config-open') as HTMLElement).click();
}

/** Submit the configuration form the way the sandboxed panel must: by clicking Save. */
function submitConfig(root: HTMLElement): void {
  (root.querySelector('.gp-config-save') as HTMLButtonElement).click();
}

/** Set a form field's value and fire `input`, the way typing would. */
function setField(root: HTMLElement, field: string, value: string): void {
  const input = root.querySelector(`.${field}`) as HTMLInputElement;
  input.value = value;
  const EventCtor = (input.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event;
  input.dispatchEvent(new EventCtor('input', { bubbles: true }));
}

function pipelineRequests(host: FakeHost): HostRequest[] {
  return host.gitlabRequests.filter((request) => request.path.endsWith('/pipelines'));
}

function movedTo(url: string): string {
  return `This resource has been moved permanently to ${url}`;
}

/** Every pipelines call redirects to the next project id, for the hop-cap tests. */
function redirectChainHandler(): (request: HostRequest) => HostResponse {
  return (request) => {
    const match = /\/api\/v4\/projects\/([^/]+)\/pipelines$/.exec(request.path);
    if (!match) return { status: 404, body: '' };
    const current = match[1];
    const next = current === 'group%2Fproject' ? '1' : String(Number(current) + 1);
    return { status: 301, body: movedTo(`https://gitlab.com/api/v4/projects/${next}`) };
  };
}

describe('project resolution in the header', () => {
  test('shows the resolved host, project path and current ref', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('gitlab.com/group/project');
    expect(text(root)).toContain('main');
    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
  });

  test('no project open degrades the header and offers the setting', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({});
    const { root } = await mount(host, new FakeTimers(), readyContext({ directory: null }));
    expect(text(root)).toContain('No project open');
    expect(root.querySelector('.gp-project')?.hasAttribute('hidden')).toBe(true);
    expect(text(root)).toContain('Project');
  });

  test('a project that is not a repo says so', async () => {
    const host = new FakeHost();
    host.gitlabHandler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Not a Git repository');
    expect(text(root)).toContain('Project');
  });

  test('a remote on another host is reported with no phantom path', async () => {
    const host = configuredHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@github.com:me/proj.git\n');
    host.gitlabHandler = handlerFor({});
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
    // The worktree directory is not the registered project; the primary is.
    host.projects = [{ id: 'p1', name: 'project', directory: '/primary' }];
    host.worktrees = [
      { directory: '/repo', name: 'wt', branch: 'feature/x', status: 'ready' },
      { directory: '/primary', name: 'primary', branch: 'main', status: 'ready' },
    ];
    host.gitlabHandler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Linked worktree');
    expect(text(root)).toContain('Current ref: feature/x');
    expect(text(root)).not.toContain('Not a Git repository');
    expect(text(root)).toContain('Project');
  });
});

describe('a linked worktree resolved through the service', () => {
  /** The open project is the worktree `/repo`; its primary checkout is `/primary`. */
  function worktreeHost(): FakeHost {
    const host = new FakeHost();
    host.files.set('.git', 'gitdir: /primary/.git/worktrees/wt\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/primary' }];
    host.worktrees = [
      { directory: '/repo', name: 'wt', branch: 'feature/x', status: 'ready' },
      { directory: '/primary', name: 'primary', branch: 'main', status: 'ready' },
    ];
    host.tokens['gitlab.com'] = 'pat';
    return host;
  }

  test('reads the primary config and lists pipelines on the worktree ref', async () => {
    const host = worktreeHost();
    host.gitConfig = '[remote "origin"]\n\turl = git@gitlab.com:group/project.git\n';
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());

    const gitConfigCall = host.serviceRequests.find((request) => request.path === '/git-config');
    expect(gitConfigCall).toBeDefined();
    const sent = JSON.parse(gitConfigCall?.body ?? '{}') as { directory?: string };
    expect(sent.directory).toBe('/repo');
    expect(text(root)).toContain('gitlab.com/group/project');
    expect(text(root)).toContain('feature/x');
    expect(host.gitlabRequests.some((request) => request.path.endsWith('/pipelines'))).toBe(true);
  });

  test('keeps the linked-worktree state when the service cannot read it', async () => {
    const host = worktreeHost();
    host.gitConfig = null; // the `/git-config` route answers 404
    host.gitlabHandler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());

    expect(text(root)).toContain('Linked worktree');
    expect(text(root)).toContain('Current ref: feature/x');
    expect(host.gitlabRequests).toHaveLength(0);
  });
});

describe('the panel header', () => {
  test('does not repeat the host-provided title', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());
    // The host's title bar already draws the GitLab icon and "GitLab Pipelines";
    // the panel header must not draw them a second time.
    expect(root.querySelector('.gp-brand, .gp-brand-mark, .gp-brand-title')).toBeNull();
    const head = root.querySelector('.gp-head') as HTMLElement;
    expect(text(head)).not.toContain('GitLab Pipelines');
  });

  test('keeps the project path and freshness on one line', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());
    const row = root.querySelector('.gp-head-row') as HTMLElement;
    // The context (`host/project · user`) and the freshness/controls share a row.
    expect(row.querySelector('.gp-project')).not.toBeNull();
    expect(row.querySelector('.gp-updated')).not.toBeNull();
    // The scope controls stay on their own row below.
    expect(row.querySelector('.gp-scope')).toBeNull();
  });
});

describe('pipeline list', () => {
  test('lists pipelines newest first with a two-line row', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
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
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ merge_request: { iid: 5 } })] });
    const { root } = await mount(host, new FakeTimers());
    expect(root.querySelector('.gp-row-sub')?.textContent).toContain('!5');
  });

  test('keeps the source on the second line even when the pipeline has a name', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ name: 'nightly', source: 'schedule' })] });
    const { root } = await mount(host, new FakeTimers());
    const subtitle = root.querySelector('.gp-row-sub')?.textContent ?? '';
    expect(subtitle).toContain('nightly');
    expect(subtitle).toContain('schedule');
  });

  test('no pipelines for the ref is an empty state, not an error', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [] });
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('No pipelines for this ref');
  });

  test('a host with no Access token is its own state', async () => {
    const host = configuredHost();
    delete host.tokens['gitlab.com'];
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('No Access token');
    expect(host.gitlabRequests).toHaveLength(0);
  });
});

describe('expanding a pipeline', () => {
  test('shows jobs grouped by stage with done/total', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
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
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job()] });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    const before = host.gitlabRequests.filter((request) => request.path.endsWith('/jobs')).length;
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    const after = host.gitlabRequests.filter((request) => request.path.endsWith('/jobs')).length;
    expect(after).toBe(before);
    expect(root.querySelector('.gp-jobs')).toBeNull();
  });

  test('offers a link back to GitLab when expanded', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
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
    host.gitlabHandler = (request) => {
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
  test('opens a window of the log wrapped, with a full-log link, and closes back', async () => {
    const host = configuredHost();
    const trace = Array.from({ length: 45 }, (_, index) => `line ${index + 1}`).join('\n');
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();

    const drawer = root.querySelector('.gp-drawer');
    expect(drawer).not.toBeNull();
    // Only the visible window is in the DOM, and follow-tail lands on the end.
    const rendered = root.querySelectorAll('.gp-log-line');
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(45);
    expect([...rendered].some((line) => line.textContent === 'line 45')).toBe(true);
    expect(root.querySelector('.gp-log-find')).not.toBeNull();
    expect(root.querySelector('.gp-log-copy')).not.toBeNull();
    expect(root.querySelector('.gp-drawer-link')?.textContent).toContain('View full log in GitLab');

    (root.querySelector('.gp-drawer-close') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer')).toBeNull();
    expect(root.querySelector('.gp-row')).not.toBeNull();
  });

  test('renders only a screenful of a very large trace', async () => {
    const host = configuredHost();
    const trace = Array.from({ length: 20_000 }, (_, index) => `line ${index + 1}`).join('\n');
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();

    const rendered = [...root.querySelectorAll<HTMLElement>('.gp-log-line')];
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(100);
    // Follow-tail: the newest line is the one on screen.
    expect(rendered.some((line) => line.dataset.line === '19999')).toBe(true);
    expect(rendered.some((line) => line.dataset.line === '0')).toBe(false);
  });

  test('a log over the line cap says older lines are not shown', async () => {
    const host = configuredHost();
    const trace = Array.from({ length: LOG_MAX_LINES + 5 }, (_, index) => `line ${index + 1}`).join('\n');
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
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
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-notice')?.textContent).toContain('capped log');
  });

  test('a short log the service marks truncated says GitLab capped it', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9 })],
      trace: 'a short capped log',
      traceTruncated: true,
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-notice')?.textContent).toContain('capped log');
  });

  test('a log the service marks not truncated shows no capped notice even at the cap', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9 })],
      trace: 'x'.repeat(HOST_BODY_CAP),
      traceTruncated: false,
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-notice')).toBeNull();
  });

  test('an uncapped log at the cap still honours the panel line cap', async () => {
    const host = configuredHost();
    let trace = Array.from({ length: LOG_MAX_LINES + 1 }, (_, index) => `line ${index + 1}`).join('\n');
    trace += 'x'.repeat(HOST_BODY_CAP - trace.length);
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9 })],
      trace,
      traceTruncated: false,
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-notice')?.textContent).toContain('Older lines not shown');
  });

  test('closing the drawer restores the list scroll position', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })] });
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
    host.gitlabHandler = (request) => {
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
    host.gitlabHandler = (request) => {
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
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify([job({ id: 9, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/trace')) return { status: 200, body: sliceTrace(trace, request) };
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
    host.gitlabHandler = (request) => {
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

    const before = host.gitlabRequests.filter((request) => request.path.endsWith('/trace')).length;
    timers.advance(5000);
    await flush();
    const after = host.gitlabRequests.filter((request) => request.path.endsWith('/trace')).length;
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

describe('the log drawer tools', () => {
  async function openLog(host: FakeHost, timers: FakeTimers): Promise<HTMLElement> {
    const { root } = await mount(host, timers);
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    return root;
  }

  function dispatchScroll(body: HTMLElement): void {
    const EventCtor = (body.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event;
    body.dispatchEvent(new EventCtor('scroll'));
  }

  test('find counts matches case-insensitively and steps between them', async () => {
    const host = configuredHost();
    const trace = 'alpha\nbeta\nALPHA\ngamma\nalpha\n';
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
    const timers = new FakeTimers();
    const root = await openLog(host, timers);
    timers.advance(0);

    setField(root, 'gp-log-find', 'alpha');
    timers.advance(200);
    expect(root.querySelector('.gp-log-count')?.textContent).toBe('1/3');
    expect(root.querySelectorAll('.gp-log-line[data-match="true"]').length).toBeGreaterThan(0);

    // Enter steps to the next match, as a keyboard user would.
    (root.querySelector('.gp-log-find') as HTMLInputElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(root.querySelector('.gp-log-count')?.textContent).toBe('2/3');
    (root.querySelector('.gp-log-next') as HTMLElement).click();
    expect(root.querySelector('.gp-log-count')?.textContent).toBe('3/3');
    (root.querySelector('.gp-log-next') as HTMLElement).click();
    expect(root.querySelector('.gp-log-count')?.textContent).toBe('1/3');
    (root.querySelector('.gp-log-prev') as HTMLElement).click();
    expect(root.querySelector('.gp-log-count')?.textContent).toBe('3/3');
  });

  test('a zero-match query shows a count of 0 and does not error', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9 })],
      trace: 'only line\n',
    });
    const timers = new FakeTimers();
    const root = await openLog(host, timers);
    timers.advance(0);

    setField(root, 'gp-log-find', 'nowhere');
    timers.advance(200);
    expect(root.querySelector('.gp-log-count')?.textContent).toBe('0');
    expect(root.querySelectorAll('.gp-log-line[data-match="true"]').length).toBe(0);
  });

  test('Ctrl/Cmd+F focuses find while the drawer is open', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9 })],
      trace: 'line 1\n',
    });
    const root = await openLog(host, new FakeTimers());
    const find = root.querySelector('.gp-log-find') as HTMLInputElement;
    expect(document.activeElement).not.toBe(find);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
    expect(document.activeElement).toBe(find);
  });

  test('Jump to error appears with the index and reaches the last error line', async () => {
    const host = configuredHost();
    const lines = Array.from({ length: 2000 }, (_, index) => `line ${index + 1}`);
    lines[39] = 'error: first failure';
    lines[1199] = 'fatal: the real one';
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9 })],
      trace: lines.join('\n'),
    });
    const timers = new FakeTimers();
    const root = await openLog(host, timers);
    expect(root.querySelector('.gp-log-jump')).toBeNull();

    timers.advance(0);
    const jump = root.querySelector('.gp-log-jump') as HTMLElement;
    expect(jump).not.toBeNull();
    jump.click();

    const rendered = [...root.querySelectorAll<HTMLElement>('.gp-log-line')];
    expect(rendered.some((line) => line.dataset.line === '1199' && line.dataset.error === 'true')).toBe(true);
  });

  test('Jump to error is absent on a clean log', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9 })],
      trace: 'all green\nstill green\n',
    });
    const timers = new FakeTimers();
    const root = await openLog(host, timers);
    timers.advance(0);
    expect(root.querySelector('.gp-log-jump')).toBeNull();
  });

  test('Copy writes the full accumulated trace to the clipboard', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9 })],
      trace: 'one\ntwo\nthree\n',
    });
    const root = await openLog(host, new FakeTimers());

    (root.querySelector('.gp-log-copy') as HTMLElement).click();
    await flush();
    expect(host.clipboard).toEqual(['one\ntwo\nthree\n']);
  });

  test('Copy an empty log writes an empty string without error', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })] });
    const root = await openLog(host, new FakeTimers());
    expect(text(root)).toContain('No log output yet');

    (root.querySelector('.gp-log-copy') as HTMLElement).click();
    await flush();
    expect(host.clipboard).toEqual(['']);
  });

  test('scrolling renders the newly visible window', async () => {
    const host = configuredHost();
    const trace = Array.from({ length: 500 }, (_, index) => `line ${index + 1}`).join('\n');
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace });
    const timers = new FakeTimers();
    const root = await openLog(host, timers);
    timers.advance(0);

    // Follow-tail opens on the end of the log...
    let rendered = [...root.querySelectorAll<HTMLElement>('.gp-log-line')];
    expect(rendered.some((line) => line.dataset.line === '499')).toBe(true);
    expect(rendered.some((line) => line.dataset.line === '0')).toBe(false);

    // ...and scrolling up renders the start, rather than leaving blank spacers.
    const body = root.querySelector('.gp-drawer-body') as HTMLElement;
    body.scrollTop = 0;
    dispatchScroll(body);
    rendered = [...root.querySelectorAll<HTMLElement>('.gp-log-line')];
    expect(rendered.some((line) => line.dataset.line === '0')).toBe(true);
    expect(rendered.some((line) => line.dataset.line === '499')).toBe(false);
  });

  test('follow-tail sticks and the scroll position survives a Poll re-render', async () => {
    const host = configuredHost();
    let trace = Array.from({ length: 200 }, (_, index) => `line ${index + 1}`).join('\n');
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify([job({ id: 9, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/trace')) return { status: 200, body: sliceTrace(trace, request) };
      return { status: 404, body: '' };
    };
    const timers = new FakeTimers();
    const root = await openLog(host, timers);
    timers.advance(0);
    const tail = [...root.querySelectorAll<HTMLElement>('.gp-log-line')];
    expect(tail.some((line) => line.dataset.line === '199')).toBe(true);

    // Read back a position above the tail, then let a Poll re-render.
    const body = root.querySelector('.gp-drawer-body') as HTMLElement;
    body.scrollTop = 360;
    dispatchScroll(body);
    trace = `${trace}\nline 201`;
    timers.advance(5000);
    await flush();

    const rendered = [...root.querySelectorAll<HTMLElement>('.gp-log-line')];
    expect(rendered.length).toBeGreaterThan(0);
    expect(Number(rendered[0]!.dataset.line)).toBeGreaterThan(10);
    expect(rendered.some((line) => line.dataset.line === '200')).toBe(false);
  });
});

describe('branch / all refs scope', () => {
  test('switching scope refetches once without the ref filter', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
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
    host.gitlabHandler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());
    expect(root.querySelector('.gp-scope')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('[role="tablist"]')).toBeNull();
  });
});

describe('adaptive polling and freshness', () => {
  test('polls while running and stops once settled', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ status: 'running', finished_at: null })] });
    const timers = new FakeTimers();
    const { panel, root } = await mount(host, timers);
    expect(panel.isPolling()).toBe(true);
    expect(root.querySelector('.gp-updated')).not.toBeNull();
    expect(timers.pendingDelays()).toContain(5000);

    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ status: 'success' })] });
    timers.advance(5000);
    await flush();

    expect(panel.isPolling()).toBe(false);
    expect(text(root)).toContain('Passed');
  });

  test('a slow response cannot overwrite a newer one', async () => {
    const host = configuredHost();
    let release: ((response: HostResponse) => void) | null = null;
    host.gitlabHandler = (request) => {
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

describe('configuration through the service', () => {
  test('routes every GitLab call through the service, carrying no token', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());

    expect(text(root)).toContain('Passed');
    // The first service call is the configuration read; GitLab traffic follows.
    expect(host.serviceRequests[0]?.path).toBe('/config');
    const proxy = host.serviceRequests.find((request) => {
      if (request.path !== '/proxy') return false;
      const body = JSON.parse(request.body ?? '{}') as { path?: string };
      return body.path?.endsWith('/pipelines') ?? false;
    });
    expect(proxy?.query?.baseUrl).toBeUndefined();
    const body = JSON.parse(proxy?.body ?? '{}') as { baseUrl?: string; path?: string; token?: unknown };
    expect(body.baseUrl).toBe('https://gitlab.com');
    expect(body.path).toBe('/api/v4/projects/group%2Fproject/pipelines');
    // The Panel never carries the token: the service attaches it.
    expect(body).not.toHaveProperty('token');
  });

  test('shows the authenticated user from the service', async () => {
    const host = configuredHost();
    host.username = 'octocat';
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());
    expect(root.querySelector('.gp-head-user')?.textContent).toBe('octocat');
  });

  test('an ungranted service is a service state pointing at Settings', async () => {
    const host = configuredHost();
    host.serviceHandler = () => {
      const error = new Error('no service') as Error & { code: string };
      error.code = 'NO_SERVICE';
      throw error;
    };
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Proxy service unavailable');
    expect(text(root)).toContain('Extensions');
  });

  test('Refresh recovers after the service is granted', async () => {
    const host = configuredHost();
    let ungranted = true;
    const defaultService = (request: HostRequest): Promise<HostResponse> =>
      FakeHost.prototype.serviceRequest.call(host, request);
    host.serviceHandler = (request, index) => {
      if (request.path === '/config' && ungranted) {
        const error = new Error('no service') as Error & { code: string };
        error.code = 'NO_SERVICE';
        throw error;
      }
      host.serviceHandler = null;
      return defaultService(request);
    };
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root, panel } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Proxy service unavailable');

    // Granting the service and pressing Refresh re-reads the configuration.
    ungranted = false;
    const refresh = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent === 'Refresh',
    );
    refresh?.click();
    await flush();
    expect(text(root)).toContain('Passed');
    panel.dispose();
  });

  test('a failed proxy request is an error, not an empty list', async () => {
    const host = configuredHost();
    host.gitlabHandler = () => {
      throw new Error('REQUEST_FAILED');
    };
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Could not reach GitLab');
    expect(text(root)).not.toContain('No pipelines');
  });

  test('an ordinary refresh keeps the list and the open log', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ id: 7 })], jobs: [job({ id: 9 })], trace: 'line 1' });
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

describe('the configuration form', () => {
  function formHost(): FakeHost {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.example.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    return host;
  }

  async function open(host: FakeHost) {
    const root = document.createElement('div');
    document.body.append(root);
    const panel = mountPanel(root, host, { timers: new FakeTimers() });
    host.emitReady(readyContext());
    await flush();
    openConfig(root);
    await flush();
    return { root, panel };
  }

  test('saves the Configured host, Project override and a masked token', async () => {
    const host = formHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root, panel } = await open(host);

    const tokenInput = root.querySelector('.gp-config-token') as HTMLInputElement;
    expect(tokenInput.type).toBe('password');
    expect(tokenInput.value).toBe('');

    setField(root, 'gp-config-host', 'gitlab.example.com');
    setField(root, 'gp-config-project', 'group/pinned');
    setField(root, 'gp-config-token', 'new-pat');
    submitConfig(root);
    await flush();

    expect(host.config.host).toBe('gitlab.example.com');
    expect(host.config.project).toBe('group/pinned');
    expect(host.tokens['gitlab.example.com']).toBe('new-pat');
    // The form closes and the Panel reloads from the new configuration.
    expect(root.querySelector('.gp-config')).toBeNull();
    expect(text(root)).toContain('gitlab.example.com/group/pinned');
    panel.dispose();
  });

  test('Save is a button, not a native form submit the sandbox blocks', async () => {
    const host = formHost();
    const { root, panel } = await open(host);
    // The panel runs with `sandbox="allow-scripts"` (no `allow-forms`), so a
    // native submit never fires; Save must be an explicit button click.
    expect((root.querySelector('.gp-config-save') as HTMLButtonElement).type).toBe('button');
    expect((root.querySelector('.gp-config') as HTMLElement).tagName).not.toBe('FORM');
    panel.dispose();
  });

  test('reopening never renders a stored token back', async () => {
    const host = formHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    host.tokens['gitlab.example.com'] = 'secret-pat';
    host.config = { host: 'gitlab.example.com', project: '' };
    const { root, panel } = await open(host);
    const tokenInput = root.querySelector('.gp-config-token') as HTMLInputElement;
    expect(tokenInput.value).toBe('');
    // A stored token shows only as presence, never as its value.
    expect(tokenInput.placeholder).toContain('token is saved');
    expect(text(root)).not.toContain('secret-pat');
    panel.dispose();
  });

  test('clears a stored token', async () => {
    const host = formHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    host.tokens['gitlab.example.com'] = 'secret-pat';
    host.config = { host: 'gitlab.example.com', project: '' };
    const { root, panel } = await open(host);
    (root.querySelector('.gp-config-clear') as HTMLElement).click();
    await flush();
    expect(host.tokens['gitlab.example.com']).toBeUndefined();
    expect(text(root)).toContain('No Access token');
    panel.dispose();
  });

  test('refuses a malformed host with no request', async () => {
    const host = formHost();
    const { root, panel } = await open(host);
    const before = host.serviceRequests.filter((request) => request.path === '/config').length;
    setField(root, 'gp-config-host', 'not a host!!');
    submitConfig(root);
    await flush();
    expect(root.querySelector('.gp-config-error')).not.toBeNull();
    expect(host.serviceRequests.filter((request) => request.path === '/config')).toHaveLength(before);
    panel.dispose();
  });

  test('refuses a non-https host', async () => {
    const host = formHost();
    const { root, panel } = await open(host);
    setField(root, 'gp-config-host', 'http://gitlab.example.com');
    submitConfig(root);
    await flush();
    expect(root.querySelector('.gp-config-error')).not.toBeNull();
    panel.dispose();
  });
});

describe('configuration states and host switching', () => {
  function formHost(): FakeHost {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.example.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    return host;
  }

  test('no token offers Configure, which opens the form', async () => {
    const host = formHost();
    host.config.host = 'gitlab.example.com';
    const { root, panel } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('No Access token');
    const configure = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent === 'Configure',
    );
    expect(configure).toBeDefined();
    configure?.click();
    await flush();
    expect(root.querySelector('.gp-config')).not.toBeNull();
    panel.dispose();
  });

  test('an invalid token is a distinct state that offers the form', async () => {
    const host = formHost();
    host.tokens['gitlab.example.com'] = 'bad';
    host.config = { host: 'gitlab.example.com', project: '' };
    host.gitlabHandler = () => ({ status: 401, body: '' });
    const { root, panel } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('GitLab token rejected');
    expect(
      Array.from(root.querySelectorAll('button')).some((button) => button.textContent === 'Configure'),
    ).toBe(true);
    panel.dispose();
  });

  test('host-mismatch names both the detected and Configured hosts', async () => {
    const host = configuredHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@github.com:me/proj.git\n');
    host.gitlabHandler = handlerFor({});
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('github.com');
    expect(text(root)).toContain('gitlab.com');
  });

  test('host-mismatch offers Configure and pre-fills the detected host', async () => {
    const host = configuredHost();
    host.files.set(
      '.git/config',
      '[remote "origin"]\n\turl = git@gitlab.example.com:group/project.git\n',
    );
    host.gitlabHandler = handlerFor({});
    const { root, panel } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Different GitLab host');
    // The fix names the Configured host, not the Project setting it used to.
    expect(text(root)).toContain('set Configured host to gitlab.example.com');
    expect(text(root)).not.toContain('extension only talks to');
    expect(text(root)).not.toContain('on this extension’s GitLab host');
    const configure = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent === 'Configure',
    );
    expect(configure).toBeDefined();
    configure?.click();
    await flush();
    expect((root.querySelector('.gp-config-host') as HTMLInputElement).value).toBe(
      'gitlab.example.com',
    );
    panel.dispose();
  });

  test('the Project override is used instead of the derived project', async () => {
    const host = new FakeHost();
    host.config.project = 'group/pinned';
    host.tokens['gitlab.com'] = 'pat';
    host.gitlabHandler = handlerFor({ pipelines: [] });
    const { root } = await mount(host, new FakeTimers(), readyContext({ directory: null }));
    expect(text(root)).toContain('gitlab.com/group/pinned');
    expect(text(root)).not.toContain('No project open');
  });

  test('changing the Configured host clears the previous host and re-resolves', async () => {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    host.tokens['gitlab.com'] = 'pat';
    host.gitlabHandler = handlerFor({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 3, name: 'old-job', status: 'failed' })],
      trace: 'old log line',
    });
    const { root, panel } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('old-job');
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-body')?.textContent).toBe('old log line');

    // Switch the Configured host through the form, with a token for the new host.
    openConfig(root);
    await flush();
    setField(root, 'gp-config-host', 'other.example.com');
    setField(root, 'gp-config-token', 'pat2');
    submitConfig(root);
    await flush();

    // The old host's jobs, open log and list are gone; the remote now mismatches.
    expect(text(root)).not.toContain('old-job');
    expect(text(root)).not.toContain('old log line');
    expect(root.querySelector('.gp-drawer')).toBeNull();
    expect(text(root)).toContain('Different GitLab host');
    expect(root.querySelector('.gp-row')).toBeNull();
    panel.dispose();
  });

  test('a background refresh does not wipe the open form', async () => {
    const host = formHost();
    host.tokens['gitlab.example.com'] = 'pat';
    host.config = { host: 'gitlab.example.com', project: '' };
    host.gitlabHandler = handlerFor({ pipelines: [pipeline({ status: 'running', finished_at: null })] });
    const timers = new FakeTimers();
    const { root, panel } = await mount(host, timers);
    expect(panel.isPolling()).toBe(true);
    openConfig(root);
    await flush();
    setField(root, 'gp-config-project', 'typed/override');

    // A poll re-renders the panel; the half-typed override must survive.
    timers.advance(5000);
    await flush();
    expect((root.querySelector('.gp-config-project') as HTMLInputElement).value).toBe('typed/override');
    panel.dispose();
  });

  test('switching to a host with no token never shows the old host resolution', async () => {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    host.tokens['gitlab.com'] = 'pat';
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root, panel } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('gitlab.com/group/project');

    // Switch to a host with no token and a Project override, so the new host
    // resolves a project even though the checkout's remote no longer matches.
    openConfig(root);
    await flush();
    setField(root, 'gp-config-host', 'other.example.com');
    setField(root, 'gp-config-project', 'group/project');
    submitConfig(root);
    await flush();
    expect(text(root)).toContain('No Access token');
    // The header names the new Configured host, not the one the data came from.
    expect(text(root)).toContain('other.example.com/group/project');
    expect(text(root)).not.toContain('gitlab.com/group/project');
    panel.dispose();
  });

  test('clearing the Configured host returns to gitlab.com', async () => {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    host.tokens['gitlab.example.com'] = 'pat';
    host.tokens['gitlab.com'] = 'pat';
    host.config = { host: 'gitlab.example.com', project: '' };
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root, panel } = await mount(host, new FakeTimers());
    // The remote is gitlab.com, so the custom host reports a mismatch first.
    expect(text(root)).toContain('Different GitLab host');

    openConfig(root);
    await flush();
    setField(root, 'gp-config-host', '');
    submitConfig(root);
    await flush();
    expect(host.config.host).toBe('gitlab.com');
    expect(text(root)).toContain('gitlab.com/group/project');
    panel.dispose();
  });

  test('the authenticated username updates when the host changes', async () => {
    const host = new FakeHost();
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.example.com:group/project.git\n');
    host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
    host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
    host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
    host.tokens['gitlab.example.com'] = 'pat';
    host.tokens['gitlab.com'] = 'pat';
    host.config = { host: 'gitlab.example.com', project: '' };
    host.username = 'first-user';
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root, panel } = await mount(host, new FakeTimers());
    expect(root.querySelector('.gp-head-user')?.textContent).toBe('first-user');

    // Move both the remote and the Configured host to gitlab.com.
    host.files.set('.git/config', '[remote "origin"]\n\turl = git@gitlab.com:group/project.git\n');
    host.username = 'second-user';
    openConfig(root);
    await flush();
    setField(root, 'gp-config-host', 'gitlab.com');
    submitConfig(root);
    await flush();
    expect(root.querySelector('.gp-head-user')?.textContent).toBe('second-user');
    panel.dispose();
  });
});

describe('service failures', () => {
  test('a 502 envelope from the service is a network error, not an HTTP one', async () => {
    const host = configuredHost();
    // The shell answers a proxy failure with 502 and an `error` envelope.
    host.serviceHandler = (request) => {
      if (request.path === '/config') {
        return {
          status: 200,
          body: JSON.stringify({
            config: { host: 'gitlab.com', project: '', hasToken: { 'gitlab.com': true } },
          }),
        };
      }
      return { status: 502, body: JSON.stringify({ error: 'Could not reach https://gitlab.com: boom' }) };
    };
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Could not reach GitLab');
    expect(text(root)).not.toContain('unexpected response');
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
    host.gitlabHandler = failedRun();
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    const rowAction = root.querySelector('.gp-job .gp-handoff') as HTMLElement;
    expect(rowAction).not.toBeNull();
    expect(rowAction.textContent).toBe('Debug this job');
    expect(rowAction.querySelector('svg')).not.toBeNull();

    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer .gp-handoff')).not.toBeNull();
  });

  test('the drawer action also starts a session', async () => {
    const host = configuredHost();
    host.gitlabHandler = failedRun();
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
    host.gitlabHandler = failedRun();
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
    host.gitlabHandler = failedRun();
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
    host.gitlabHandler = failedRun();
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
    host.gitlabHandler = failedRun();
    host.startSessionError = new Error('boom');
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-handoff') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('Could not start a session');
  });

  test('a rejected start names the host’s own reason', async () => {
    const host = configuredHost();
    host.gitlabHandler = failedRun();
    host.startSessionError = Object.assign(new Error('Host did not return a session.'), {
      code: 'HOST_REJECTED',
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-handoff') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('OpenChamber rejected the session');
  });

  test('a known host code gets its own message', async () => {
    const host = configuredHost();
    host.gitlabHandler = failedRun();
    host.startSessionError = Object.assign(new Error('x'), { code: 'NO_MODEL' });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-handoff') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('No model is selected');
    expect(text(root)).not.toContain('Could not start a session for this job.');
  });

  test('a not-granted host answer names the missing capabilities', async () => {
    const host = configuredHost();
    host.gitlabHandler = failedRun();
    host.startSessionError = Object.assign(new Error('not allowed'), { code: 'NOT_GRANTED' });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-handoff') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('sessions and prompt');
  });

  test('a failed log fetch blocks the handoff with a clear message', async () => {
    const host = configuredHost();
    host.gitlabHandler = (request) => {
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
    host.config.project = 'group/pinned';
    host.tokens['gitlab.com'] = 'pat';
    host.gitlabHandler = failedRun();
    const { root } = await mount(host, new FakeTimers(), readyContext({ directory: null }));
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
    host.gitlabHandler = handlerFor({
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

describe('a moved project', () => {
  const TARGET = 'https://gitlab.com/api/v4/projects/81';

  // The old path redirects to the project id; the id serves pipelines.
  function moveHandler(onNew?: () => HostResponse) {
    return (request: HostRequest): HostResponse => {
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines') {
        return { status: 301, body: movedTo(TARGET) };
      }
      if (request.path === '/api/v4/projects/81/pipelines') {
        return onNew?.() ?? { status: 200, body: JSON.stringify([pipeline({ id: 5 })]) };
      }
      return { status: 404, body: '' };
    };
  }

  test('follows a move and shows the pipelines under the project id', async () => {
    const host = configuredHost();
    host.gitlabHandler = moveHandler();
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Passed');
    expect(text(root)).toContain('gitlab.com/81');
    expect(pipelineRequests(host).map((request) => request.path)).toEqual([
      '/api/v4/projects/group%2Fproject/pipelines',
      '/api/v4/projects/81/pipelines',
    ]);
  });

  test('follows a move when GitLab names the full sub-resource in the target', async () => {
    const host = configuredHost();
    // GitLab answers a pipelines request with that resource's own location, not
    // the project root: `/api/v4/projects/<id>/pipelines?per_page=…`.
    host.gitlabHandler = (request: HostRequest): HostResponse => {
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines') {
        return {
          status: 301,
          body: movedTo('https://gitlab.com/api/v4/projects/81/pipelines?per_page=100&ref=main'),
        };
      }
      if (request.path === '/api/v4/projects/81/pipelines') {
        return { status: 200, body: JSON.stringify([pipeline({ id: 5 })]) };
      }
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Passed');
    expect(text(root)).not.toContain('Project not found');
  });

  test('a refresh reuses the healed target without following the move again', async () => {
    const host = configuredHost();
    host.gitlabHandler = moveHandler();
    const { root, panel } = await mount(host, new FakeTimers());
    panel.refresh();
    await flush();
    const followedOld = pipelineRequests(host).filter((request) =>
      request.path.includes('group%2Fproject'),
    );
    expect(followedOld).toHaveLength(1);
    expect(text(root)).toContain('Passed');
  });

  test('a chain of redirects past the cap stops and shows a state, not a spin', async () => {
    const host = configuredHost();
    host.gitlabHandler = redirectChainHandler();
    const { root } = await mount(host, new FakeTimers());
    expect(pipelineRequests(host)).toHaveLength(6);
    expect(root.querySelector('.gp-row')).toBeNull();
    expect(root.querySelector('.gp-state')).not.toBeNull();
  });

  test('a target on another host is not followed', async () => {
    const host = configuredHost();
    host.gitlabHandler = () => ({
      status: 301,
      body: movedTo('https://evil.example.com/api/v4/projects/81'),
    });
    const { root } = await mount(host, new FakeTimers());
    expect(host.gitlabRequests.some((request) => request.path === '/api/v4/projects/81/pipelines')).toBe(
      false,
    );
    expect(root.querySelector('.gp-row')).toBeNull();
  });

  test('a healed target does not carry over to a different project', async () => {
    const host = configuredHost();
    host.gitlabHandler = moveHandler();
    const { root, panel } = await mount(host, new FakeTimers());
    host.gitlabHandler = (request: HostRequest): HostResponse =>
      request.path === '/api/v4/projects/other%2Fproj/pipelines'
        ? { status: 200, body: JSON.stringify([pipeline({ id: 9 })]) }
        : { status: 404, body: '' };
    openConfig(root);
    await flush();
    setField(root, 'gp-config-project', 'other/proj');
    submitConfig(root);
    await flush();
    expect(pipelineRequests(host).at(-1)?.path).toBe('/api/v4/projects/other%2Fproj/pipelines');
    panel.dispose();
  });

  test('a host switch forgets a healed target', async () => {
    const host = configuredHost();
    host.gitlabHandler = moveHandler();
    const { root, panel } = await mount(host, new FakeTimers());
    host.tokens['gitlab.example.com'] = 'pat';
    openConfig(root);
    await flush();
    setField(root, 'gp-config-host', 'gitlab.example.com');
    setField(root, 'gp-config-project', 'group/project');
    submitConfig(root);
    await flush();
    // The switched host resolves the override and forwards the GitLab path.
    expect(pipelineRequests(host).at(-1)?.path).toBe('/api/v4/projects/group%2Fproject/pipelines');
    panel.dispose();
  });
});

describe('a move that cannot be healed', () => {

  test('a redirect that is not a move is reported as a redirect, not a move', async () => {
    const host = configuredHost();
    host.gitlabHandler = () => ({ status: 302, body: '<html>Sign in</html>' });
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('GitLab redirected this request');
    expect(text(root)).not.toContain('Project moved');
  });

  test('a move that runs past the cap is a moved project, naming the target', async () => {
    const host = configuredHost();
    host.gitlabHandler = redirectChainHandler();
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Project moved');
    expect(text(root)).toContain('https://gitlab.com/api/v4/projects/6');
    expect(text(root)).not.toContain('unexpected response');
  });

  test('a move to another host is a moved project, naming the target', async () => {
    const host = configuredHost();
    host.gitlabHandler = () => ({
      status: 301,
      body: movedTo('https://evil.example.com/api/v4/projects/81'),
    });
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('Project moved');
    expect(text(root)).toContain('evil.example.com');
  });

  test('the moved state opens the old path in GitLab, which redirects the browser', async () => {
    const host = configuredHost();
    host.gitlabHandler = () => ({
      status: 301,
      body: movedTo('https://evil.example.com/api/v4/projects/81'),
    });
    const { root } = await mount(host, new FakeTimers());
    const action = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent === 'Open in GitLab',
    );
    expect(action).toBeDefined();
    action?.click();
    await flush();
    expect(host.openUrls).toEqual(['https://gitlab.com/group/project']);
  });

  test('the redirect state also offers opening the old path', async () => {
    const host = configuredHost();
    host.gitlabHandler = () => ({ status: 302, body: '<html>Sign in</html>' });
    const { root } = await mount(host, new FakeTimers());
    const action = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent === 'Open in GitLab',
    );
    expect(action).toBeDefined();
    action?.click();
    await flush();
    expect(host.openUrls).toEqual(['https://gitlab.com/group/project']);
  });
});

describe('the heal notice', () => {

  function healedHost(): FakeHost {
    const host = configuredHost();
    host.gitlabHandler = (request: HostRequest): HostResponse => {
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines') {
        return {
          status: 301,
          body: movedTo('https://gitlab.com/api/v4/projects/81'),
        };
      }
      if (request.path === '/api/v4/projects/81/pipelines') {
        return { status: 200, body: JSON.stringify([pipeline({ id: 5 })]) };
      }
      return { status: 404, body: '' };
    };
    return host;
  }

  test('a heal shows a one-time notice naming the old path and the target', async () => {
    const { root } = await mount(healedHost(), new FakeTimers());
    expect(text(root)).toContain('Showing gitlab.com/group/project as gitlab.com/81');
  });

  test('the notice is dismissed and stays gone across a refresh', async () => {
    const host = healedHost();
    const { root, panel } = await mount(host, new FakeTimers());
    const dismiss = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent === 'Dismiss',
    );
    expect(dismiss).toBeDefined();
    dismiss?.click();
    expect(text(root)).not.toContain('Showing');
    panel.refresh();
    await flush();
    expect(text(root)).not.toContain('Showing');
  });

  test('no heal means no notice', async () => {
    const host = configuredHost();
    host.gitlabHandler = handlerFor({ pipelines: [pipeline()] });
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).not.toContain('Showing');
  });
});

describe('downstream pipelines', () => {
  /** A handler where the same pipeline id can live in two projects, keyed by path. */
  function multiProjectHandler(data: {
    pipelines: Pipeline[];
    jobsByProject?: Record<string, Job[]>;
    bridgesByProject?: Record<string, Bridge[]>;
  }): (request: HostRequest) => HostResponse {
    const projectOf = (path: string): string => {
      const match = /\/api\/v4\/projects\/([^/]+)\//.exec(path);
      return match ? decodeURIComponent(match[1] ?? '') : '';
    };
    return (request) => {
      const project = projectOf(request.path);
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify(data.pipelines) };
      }
      if (request.path.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify(data.jobsByProject?.[project] ?? []) };
      }
      if (request.path.endsWith('/bridges')) {
        return { status: 200, body: JSON.stringify(data.bridgesByProject?.[project] ?? []) };
      }
      if (request.path.endsWith('/trace')) return { status: 200, body: 'boom' };
      return { status: 404, body: '' };
    };
  }

  const OTHER = downstreamPipeline({
    id: 42,
    iid: 3,
    project_id: 9,
    status: 'failed',
    ref: 'release',
    sha: 'deadbeefcafe',
    web_url: 'https://gitlab.com/other/project/-/pipelines/42',
  });

  test('shows a Trigger row in its Stage carrying the Downstream status, and a card', async () => {
    const host = configuredHost();
    host.gitlabHandler = multiProjectHandler({
      pipelines: [pipeline({ id: 7 })],
      bridgesByProject: { 'group/project': [bridge({ downstream_pipeline: OTHER })] },
      jobsByProject: { 'group/project': [job({ id: 1, stage: 'build', status: 'success' })] },
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();

    const trigger = root.querySelector('.gp-trigger');
    expect(trigger).not.toBeNull();
    // The row carries the downstream's own status, not the trigger's passed one.
    expect(trigger?.querySelector('.gp-icon')?.getAttribute('aria-label')).toBe('Failed');
    expect(text(root)).toContain('other/project');
    const card = root.querySelector('.gp-downstream-card');
    // The card carries the downstream's status too (spec: "status, label …").
    expect(card?.querySelector('.gp-icon')?.getAttribute('aria-label')).toBe('Failed');
    expect(card?.textContent).toContain('release');
    expect(card?.textContent).toContain('deadbe');
    expect(card?.textContent).toContain('#3');
    expect(card?.textContent).toContain('View pipeline in GitLab');
  });

  test('a starting trigger shows no card, and a broken one says it could not start', async () => {
    const host = configuredHost();
    host.gitlabHandler = multiProjectHandler({
      pipelines: [pipeline({ id: 7 })],
      bridgesByProject: {
        'group/project': [
          bridge({ id: 1, name: 'waiting', status: 'pending', downstream_pipeline: null }),
          bridge({ id: 2, name: 'broken', status: 'failed', downstream_pipeline: null }),
        ],
      },
      jobsByProject: { 'group/project': [] },
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('starting');
    expect(text(root)).toContain('could not start');
    expect(root.querySelector('.gp-downstream-card')).toBeNull();
  });

  test('expanding a card fetches that pipeline’s Jobs and renders them by Stage', async () => {
    const host = configuredHost();
    host.gitlabHandler = multiProjectHandler({
      pipelines: [pipeline({ id: 7 })],
      bridgesByProject: { 'group/project': [bridge({ downstream_pipeline: OTHER })] },
      jobsByProject: {
        'group/project': [job({ id: 1, stage: 'build', status: 'success' })],
        'other/project': [job({ id: 99, name: 'e2e', stage: 'test', status: 'failed' })],
      },
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();

    (root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();

    expect(text(root)).toContain('e2e');
    const requested = host.gitlabRequests.some(
      (request) => request.path === '/api/v4/projects/other%2Fproject/pipelines/42/jobs',
    );
    expect(requested).toBe(true);
  });

  test('a nested Job opens its Trace against the downstream project in the drawer', async () => {
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return { status: 200, body: JSON.stringify([bridge({ downstream_pipeline: OTHER })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 1 })]) };
      }
      if (request.path === '/api/v4/projects/other%2Fproject/pipelines/42/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 99, name: 'e2e', stage: 'test', status: 'failed' })]) };
      }
      if (request.path.endsWith('/trace')) return { status: 200, body: 'nested log line' };
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-card .gp-job') as HTMLElement).click();
    await flush();

    expect(root.querySelector('.gp-drawer-body')?.textContent).toBe('nested log line');
    expect(
      host.gitlabRequests.some((request) => request.path === '/api/v4/projects/other%2Fproject/jobs/99/trace'),
    ).toBe(true);
  });

  test('the same pipeline id in two projects resolves to the right project', async () => {
    const host = configuredHost();
    host.gitlabHandler = multiProjectHandler({
      pipelines: [pipeline({ id: 42, ref: 'root' })],
      bridgesByProject: {
        'group/project': [
          bridge({ downstream_pipeline: downstreamPipeline({ id: 42, project_id: 9, web_url: 'https://gitlab.com/other/project/-/pipelines/42' }) }),
        ],
      },
      jobsByProject: {
        'group/project': [job({ id: 1, name: 'root-job', stage: 'build' })],
        'other/project': [job({ id: 1, name: 'downstream-job', stage: 'build' })],
      },
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('root-job');
    expect(text(root)).toContain('downstream-job');
  });

  test('an unreadable downstream project shows a per-card error, not "no jobs"', async () => {
    const host = configuredHost();
    let fail = true;
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return { status: 200, body: JSON.stringify([bridge({ downstream_pipeline: OTHER })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 1 })]) };
      }
      if (request.path.includes('/other%2Fproject/')) {
        return fail ? { status: 403, body: '' } : { status: 200, body: JSON.stringify([job({ id: 9, name: 'e2e', stage: 'test' })]) };
      }
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('Could not read this downstream project');
    expect(text(root)).not.toContain('No jobs reported yet');
    // A per-card failure never escalates to the Panel-wide unauthorized state.
    expect(root.querySelector('.gp-state')).toBeNull();

    // Collapsing and re-opening retries the failed fetch, as the error promises.
    fail = false;
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('e2e');
  });

  test('bridges are fetched once per listed Pipeline on load, then only for active ones', async () => {
    const host = configuredHost();
    let pipelines = [pipeline({ id: 1, status: 'success' }), pipeline({ id: 2, status: 'success' })];
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify(pipelines) };
      return { status: 200, body: '[]' };
    };
    const timers = new FakeTimers();
    const { panel } = await mount(host, timers);
    const bridgePaths = () =>
      host.gitlabRequests.filter((request) => request.path.endsWith('/bridges')).map((request) => request.path);

    // One `/bridges` per listed Pipeline on first load.
    expect(bridgePaths()).toHaveLength(2);
    expect(panel.isPolling()).toBe(false);

    // One Pipeline goes active; the next poll refetches only *its* bridges.
    pipelines = [
      pipeline({ id: 1, status: 'running', finished_at: null }),
      pipeline({ id: 2, status: 'success' }),
    ];
    panel.refresh();
    await flush();
    const afterRefresh = bridgePaths().length;
    timers.advance(5000);
    await flush();
    const onPoll = bridgePaths().slice(afterRefresh);
    expect(onPoll).toContain('/api/v4/projects/group%2Fproject/pipelines/1/bridges');
    expect(onPoll).not.toContain('/api/v4/projects/group%2Fproject/pipelines/2/bridges');
  });

  test('a collapsed row shows a downstream count, hidden when there is none', async () => {
    const host = configuredHost();
    host.gitlabHandler = multiProjectHandler({
      pipelines: [pipeline({ id: 1 }), pipeline({ id: 2 })],
      bridgesByProject: {
        'group/project': [bridge({ id: 1 }), bridge({ id: 2 })],
      },
      jobsByProject: { 'group/project': [] },
    });
    // Give both pipelines the same bridges payload (the handler is project-keyed only).
    const { root } = await mount(host, new FakeTimers());
    const badges = Array.from(root.querySelectorAll('.gp-downstream-badge')).map((node) => node.textContent);
    expect(badges.length).toBe(0);

    // A fanned-out pipeline shows its count of Trigger jobs that have a downstream.
    const host2 = configuredHost();
    host2.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 1 })]) };
      if (request.path.endsWith('/bridges')) {
        return {
          status: 200,
          body: JSON.stringify([
            bridge({ id: 1, downstream_pipeline: OTHER }),
            bridge({ id: 2, downstream_pipeline: downstreamPipeline({ id: 43 }) }),
            bridge({ id: 3, downstream_pipeline: null }),
          ]),
        };
      }
      return { status: 200, body: '[]' };
    };
    const mounted = await mount(host2, new FakeTimers());
    expect(mounted.root.querySelector('.gp-downstream-badge')?.textContent).toBe('↳ 2 downstream');
  });

  test('a failed bridge fetch leaves the list intact, with no count', async () => {
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 1 }), pipeline({ id: 2 })]) };
      }
      if (request.path.endsWith('/bridges')) return { status: 500, body: '' };
      return { status: 200, body: '[]' };
    };
    const { root } = await mount(host, new FakeTimers());
    expect(root.querySelectorAll('.gp-row').length).toBe(2);
    expect(root.querySelector('.gp-downstream-badge')).toBeNull();
    expect(root.querySelector('.gp-state')).toBeNull();
  });

  test('a settled root with an active downstream keeps polling, and stops when it settles', async () => {
    const host = configuredHost();
    let downstreamStatus = 'running';
    let upstreamStatus = 'failed';
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        // The upstream is a mirror'd failure: already settled, no active jobs of its own.
        return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: upstreamStatus, finished_at: '2026-09-30T11:52:00Z' })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return {
          status: 200,
          body: JSON.stringify([bridge({ downstream_pipeline: downstreamPipeline({ status: downstreamStatus }) })]),
        };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 1, status: 'success' })]) };
      }
      if (request.path === '/api/v4/projects/other%2Fproject/pipelines/42/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 99, status: downstreamStatus })]) };
      }
      return { status: 200, body: '[]' };
    };
    const timers = new FakeTimers();
    const { panel } = await mount(host, timers);
    expect(panel.isPolling()).toBe(true);

    downstreamStatus = 'failed';
    upstreamStatus = 'failed';
    timers.advance(5000);
    await flush();
    expect(panel.isPolling()).toBe(false);
  });

  test('Debug this job is absent on a multi-project downstream job, present on a child’s', async () => {
    const host = configuredHost();
    const child = downstreamPipeline({
      id: 55,
      project_id: 7,
      status: 'failed',
      web_url: 'https://gitlab.com/group/project/-/pipelines/55',
    });
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'failed' })]) };
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return { status: 200, body: JSON.stringify([bridge({ downstream_pipeline: child })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 1, status: 'success' })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/55/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 2, name: 'child-fail', status: 'failed' })]) };
      }
      if (request.path.endsWith('/trace')) return { status: 200, body: 'boom' };
      return { status: 404, body: '' };
    };
    // A multi-project downstream: its failed Job renders without the affordance.
    const multiHost = configuredHost();
    multiHost.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'failed' })]) };
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return { status: 200, body: JSON.stringify([bridge({ downstream_pipeline: OTHER })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 1, status: 'success' })]) };
      }
      if (request.path === '/api/v4/projects/other%2Fproject/pipelines/42/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 9, name: 'other-fail', status: 'failed' })]) };
      }
      return { status: 404, body: '' };
    };
    const multi = await mount(multiHost, new FakeTimers());
    (multi.root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (multi.root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();
    expect(text(multi.root)).toContain('other-fail');
    expect(multi.root.querySelector('.gp-handoff')).toBeNull();

    // A same-project child pipeline: the checkout can fix it, so it offers the action.
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();
    expect(text(root)).toContain('child-fail');
    expect(root.querySelector('.gp-handoff')).not.toBeNull();
  });

  test('a same-project downstream is labelled "child pipeline"', async () => {
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return {
          status: 200,
          body: JSON.stringify([
            bridge({
              downstream_pipeline: downstreamPipeline({
                id: 55,
                project_id: 7,
                web_url: 'https://gitlab.com/group/project/-/pipelines/55',
              }),
            }),
          ]),
        };
      }
      return { status: 200, body: '[]' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-downstream-label')?.textContent).toBe('child pipeline');
  });

  test('a two-generation chain expands, and a cycle does not loop', async () => {
    // Root 7 → child 42, and 42's own bridge points back at root 7 (a cycle).
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return {
          status: 200,
          body: JSON.stringify([
            bridge({
              downstream_pipeline: downstreamPipeline({
                id: 42,
                web_url: 'https://gitlab.com/group/project/-/pipelines/42',
              }),
            }),
          ]),
        };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/42/bridges') {
        return {
          status: 200,
          body: JSON.stringify([
            bridge({
              id: 51,
              name: 'loop',
              downstream_pipeline: downstreamPipeline({
                id: 7,
                web_url: 'https://gitlab.com/group/project/-/pipelines/7',
              }),
            }),
          ]),
        };
      }
      if (request.path.endsWith('/jobs')) return { status: 200, body: '[]' };
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();

    // Generation 2 is open and shows its own Trigger row.
    expect(text(root)).toContain('loop');
    // Its card points back at the root, so it must not be expandable again.
    const nestedButtons = Array.from(root.querySelectorAll('.gp-downstream-open')).map(
      (node) => node.textContent,
    );
    expect(nestedButtons).toContain('Continue in GitLab');
  });

  test('a chain stops at three generations with a "Continue in GitLab" link', async () => {
    const url = (id: number) => `https://gitlab.com/group/project/-/pipelines/${id}`;
    const host = configuredHost();
    const chain: Record<number, number> = { 10: 20, 20: 30, 30: 40, 40: 50 };
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 10 })]) };
      const match = /\/pipelines\/(\d+)\/bridges$/.exec(request.path);
      if (match) {
        const id = Number(match[1]);
        const to = chain[id];
        return {
          status: 200,
          body: JSON.stringify(
            to
              ? [bridge({ id: id * 10, downstream_pipeline: downstreamPipeline({ id: to, web_url: url(to) }) })]
              : [],
          ),
        };
      }
      if (request.path.endsWith('/jobs')) return { status: 200, body: '[]' };
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();

    // Generation 1 → 2 → 3 expand; generation 4 (pipeline 40) is the cap.
    for (let step = 0; step < 3; step += 1) {
      const buttons = Array.from(root.querySelectorAll('.gp-downstream-open'));
      const button = buttons[buttons.length - 1] as HTMLElement | undefined;
      expect(button?.textContent).toBe('Show jobs');
      button?.click();
      await flush();
    }
    // At the cap the deepest card offers only a link out.
    const buttons = Array.from(root.querySelectorAll('.gp-downstream-open')).map((node) => node.textContent);
    expect(buttons).toContain('Continue in GitLab');
  });

  test('a root whose own bridge points back at the root is not expandable', async () => {
    // Pipeline 7's Trigger job starts pipeline 7 again (same project, same id).
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return {
          status: 200,
          body: JSON.stringify([
            bridge({
              downstream_pipeline: downstreamPipeline({
                id: 7,
                web_url: 'https://gitlab.com/group/project/-/pipelines/7',
              }),
            }),
          ]),
        };
      }
      if (request.path.endsWith('/jobs')) return { status: 200, body: '[]' };
      return { status: 404, body: '' };
    };
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    // The card renders, but the root is already on the path, so it cannot expand.
    expect(root.querySelector('.gp-downstream-open')?.textContent).toBe('Continue in GitLab');
  });

  test('a poll refetches the expanded root’s Jobs exactly once', async () => {
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'running', finished_at: null })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return { status: 200, body: JSON.stringify([bridge({ downstream_pipeline: OTHER })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 1, status: 'running', finished_at: null })]) };
      }
      return { status: 200, body: '[]' };
    };
    const timers = new FakeTimers();
    const { root, panel } = await mount(host, timers);
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    expect(panel.isPolling()).toBe(true);

    const rootJobsPath = '/api/v4/projects/group%2Fproject/pipelines/7/jobs';
    const before = host.gitlabRequests.filter((request) => request.path === rootJobsPath).length;
    timers.advance(5000);
    await flush();
    const after = host.gitlabRequests.filter((request) => request.path === rootJobsPath).length;
    expect(after - before).toBe(1);
  });

  test('a nested Job’s Trace keeps refreshing on the poll while it runs', async () => {
    let traceText = 'line 1';
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/bridges') {
        return { status: 200, body: JSON.stringify([bridge({ downstream_pipeline: OTHER })]) };
      }
      if (request.path === '/api/v4/projects/group%2Fproject/pipelines/7/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 1 })]) };
      }
      if (request.path === '/api/v4/projects/other%2Fproject/pipelines/42/jobs') {
        return { status: 200, body: JSON.stringify([job({ id: 99, name: 'e2e', stage: 'test', status: 'running', finished_at: null })]) };
      }
      if (request.path === '/api/v4/projects/other%2Fproject/jobs/99/trace') {
        return { status: 200, body: sliceTrace(traceText, request) };
      }
      return { status: 200, body: '' };
    };
    const timers = new FakeTimers();
    const { root } = await mount(host, timers);
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-open') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-downstream-card .gp-job') as HTMLElement).click();
    await flush();
    expect(root.querySelector('.gp-drawer-body')?.textContent).toBe('line 1');

    traceText = 'line 1\nline 2';
    timers.advance(5000);
    await flush();
    expect(root.querySelector('.gp-drawer-body')?.textContent).toContain('line 2');
  });
});

describe('pipeline actions', () => {
  const PROJECT_PATH = '/api/v4/projects/group%2Fproject';

  function projectDetail(accessLevel: number | null | undefined, cancelRole: string | undefined): unknown {
    const level = accessLevel === undefined ? 30 : accessLevel;
    return {
      id: 1,
      path_with_namespace: 'group/project',
      permissions: {
        project_access: level == null ? null : { access_level: level },
        group_access: null,
      },
      ci_restrict_pipeline_cancellation_role: cancelRole ?? 'developer',
    };
  }

  function actionHandler(
    options: {
      pipelines?: Pipeline[];
      jobs?: Job[];
      bridges?: Bridge[];
      trace?: string;
      scopes?: string[];
      accessLevel?: number | null;
      cancelRole?: string;
      writeStatus?: number;
      otherAccessLevel?: number | null;
    } = {},
  ): { handler: (request: HostRequest) => HostResponse; writes: HostRequest[] } {
    const writes: HostRequest[] = [];
    const handler = (request: HostRequest): HostResponse => {
      if (request.method === 'POST') {
        writes.push(request);
        return { status: options.writeStatus ?? 201, body: '{"id":1}' };
      }
      if (request.path === '/api/v4/personal_access_tokens/self') {
        return { status: 200, body: JSON.stringify({ scopes: options.scopes ?? ['read_api', 'api'] }) };
      }
      if (request.path === PROJECT_PATH) {
        return { status: 200, body: JSON.stringify(projectDetail(options.accessLevel, options.cancelRole)) };
      }
      if (request.path === '/api/v4/projects/other%2Fproject') {
        return { status: 200, body: JSON.stringify(projectDetail(options.otherAccessLevel, options.cancelRole)) };
      }
      if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify(options.pipelines ?? []) };
      if (request.path.endsWith('/jobs')) return { status: 200, body: JSON.stringify(options.jobs ?? []) };
      if (request.path.endsWith('/bridges')) return { status: 200, body: JSON.stringify(options.bridges ?? []) };
      if (request.path.endsWith('/trace')) return { status: 200, body: options.trace ?? '' };
      return { status: 404, body: '' };
    };
    return { handler, writes };
  }

  async function mountWith(
    options: Parameters<typeof actionHandler>[0] = {},
  ): Promise<{ root: HTMLElement; host: FakeHost; writes: HostRequest[] }> {
    const host = configuredHost();
    const { handler, writes } = actionHandler(options);
    host.gitlabHandler = handler;
    const { root } = await mount(host, new FakeTimers());
    return { root, host, writes };
  }

  async function expand(root: HTMLElement): Promise<void> {
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
  }

  /** Open a scope's `⋯` menu, read its item labels, and close it again. */
  function menuLabels(scope: HTMLElement): string[] {
    const trigger = scope.querySelector('.gp-actions button') as HTMLButtonElement | null;
    if (!trigger) return [];
    trigger.click();
    const labels = Array.from(scope.querySelectorAll('.oc-sdk-option')).map((node) =>
      (node.textContent ?? '').trim(),
    );
    trigger.click();
    return labels;
  }

  function clickMenu(scope: HTMLElement, label: string): void {
    const trigger = scope.querySelector('.gp-actions button') as HTMLButtonElement;
    trigger.click();
    const option = Array.from(scope.querySelectorAll('.oc-sdk-option')).find(
      (node) => (node.textContent ?? '').trim() === label,
    );
    if (!option) throw new Error(`no ${label} menu item`);
    (option as HTMLElement).click();
  }

  test('a failed Job offers Retry while Debug stays visible', async () => {
    const { root } = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 9, name: 'unit', status: 'failed' })],
      trace: 'boom',
    });
    await expand(root);
    const jobRow = root.querySelector('.gp-job') as HTMLElement;
    expect(menuLabels(jobRow)).toEqual(['Retry']);
    expect(jobRow.querySelector('.gp-handoff')).not.toBeNull();
  });

  test('a manual Job offers Play; a running one offers Cancel', async () => {
    const manual = await mountWith({
      pipelines: [pipeline({ id: 7 })],
      jobs: [job({ id: 9, name: 'deploy', status: 'manual' })],
    });
    await expand(manual.root);
    expect(menuLabels(manual.root.querySelector('.gp-job') as HTMLElement)).toEqual(['Play']);

    const running = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'running' })],
      jobs: [job({ id: 9, name: 'test', status: 'running' })],
    });
    await expand(running.root);
    expect(menuLabels(running.root.querySelector('.gp-job') as HTMLElement)).toEqual(['Cancel']);
  });

  test('a canceling Job offers Force cancel to a Maintainer, nothing to a Developer', async () => {
    const maintainer = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'running' })],
      jobs: [job({ id: 9, name: 'deploy', status: 'canceling' })],
      accessLevel: 40,
    });
    await expand(maintainer.root);
    expect(menuLabels(maintainer.root.querySelector('.gp-job') as HTMLElement)).toEqual(['Force cancel']);

    const developer = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'running' })],
      jobs: [job({ id: 9, name: 'deploy', status: 'canceling' })],
      accessLevel: 30,
    });
    await expand(developer.root);
    expect(developer.root.querySelector('.gp-job .gp-actions')).toBeNull();
  });

  test('a failed Pipeline offers Retry pipeline on its row', async () => {
    const { root } = await mountWith({ pipelines: [pipeline({ id: 7, status: 'failed' })] });
    expect(menuLabels(root.querySelector('.gp-row') as HTMLElement)).toEqual(['Retry pipeline']);
  });

  test('the header offers Run pipeline for the current Ref', async () => {
    const { root, writes } = await mountWith({ pipelines: [pipeline({ id: 7 })] });
    const run = root.querySelector('.gp-run button') as HTMLButtonElement;
    expect(run).not.toBeNull();
    expect(run.textContent?.trim()).toBe('Run pipeline');
    run.click();
    await flush();
    expect(writes[0]?.method).toBe('POST');
    expect(writes[0]?.path).toBe(`${PROJECT_PATH}/pipeline`);
    expect(writes[0]?.query).toEqual({ ref: 'main' });
  });

  test('the pipeline row activates by keyboard, and a nested control does not', async () => {
    const { root } = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 9 })],
    });
    const row = root.querySelector('.gp-row') as HTMLElement;
    const trigger = root.querySelector('.gp-row .gp-actions button') as HTMLButtonElement;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    expect((root.querySelector('.gp-item') as HTMLElement).dataset.open).toBe('false');
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    expect((root.querySelector('.gp-item') as HTMLElement).dataset.open).toBe('true');
  });

  test('a Pipeline action refetches the affected Pipeline at once', async () => {
    const { root, host, writes } = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 1 })],
    });
    clickMenu(root.querySelector('.gp-row') as HTMLElement, 'Retry pipeline');
    await flush();
    expect(writes[0]?.path).toBe(`${PROJECT_PATH}/pipelines/7/retry`);
    const postIndex = host.gitlabRequests.findIndex((request) => request.method === 'POST');
    const bridgesAfter = host.gitlabRequests
      .slice(postIndex + 1)
      .some((request) => request.method !== 'POST' && request.path.endsWith('/bridges'));
    expect(bridgesAfter).toBe(true);
  });

  test('clicking Retry posts the action and shows a success notice that auto-dismisses', async () => {
    const timers = new FakeTimers();
    const host = configuredHost();
    const { handler, writes } = actionHandler({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 9, name: 'unit', status: 'failed' })],
    });
    host.gitlabHandler = handler;
    const { root } = await mount(host, timers);
    await expand(root);
    clickMenu(root.querySelector('.gp-job') as HTMLElement, 'Retry');
    await flush();
    expect(writes[0]?.method).toBe('POST');
    expect(writes[0]?.path).toBe(`${PROJECT_PATH}/jobs/9/retry`);
    expect(text(root)).toContain('Job retry started.');
    timers.advance(5000);
    await flush();
    expect(text(root)).not.toContain('Job retry started.');
  });

  test('a read_api token disables the menu and explains why', async () => {
    const { root } = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 9, name: 'unit', status: 'failed' })],
      scopes: ['read_api'],
    });
    await expand(root);
    const trigger = root.querySelector('.gp-job .gp-actions button') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.disabled).toBe(true);
    expect(text(root)).toContain('api scope');
  });

  test('a role below Developer hides the menu and the header action', async () => {
    const { root } = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 9, name: 'unit', status: 'failed' })],
      accessLevel: 10,
    });
    await expand(root);
    expect(root.querySelector('.gp-actions')).toBeNull();
    expect(root.querySelector('.gp-run')).toBeNull();
  });

  test('a refused write is surfaced and stays until dismissed', async () => {
    const timers = new FakeTimers();
    const host = configuredHost();
    const { handler } = actionHandler({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 9, name: 'unit', status: 'failed' })],
      writeStatus: 403,
    });
    host.gitlabHandler = handler;
    const { root } = await mount(host, timers);
    await expand(root);
    clickMenu(root.querySelector('.gp-job') as HTMLElement, 'Retry');
    await flush();
    expect(text(root)).toContain('was refused');
    timers.advance(60000);
    await flush();
    expect(text(root)).toContain('was refused');
  });

  test('a Trigger job carries no menu of its own', async () => {
    const { root } = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 1, status: 'success' })],
      bridges: [bridge({ downstream_pipeline: downstreamPipeline({ id: 42, project_id: 7, status: 'failed' }) })],
    });
    await expand(root);
    expect(root.querySelector('.gp-trigger .gp-actions')).toBeNull();
  });

  test('a Downstream card in another project gets a menu gated by that project', async () => {
    const { root } = await mountWith({
      pipelines: [pipeline({ id: 7, status: 'failed' })],
      jobs: [job({ id: 1, status: 'success' })],
      bridges: [
        bridge({
          downstream_pipeline: downstreamPipeline({
            id: 42,
            status: 'failed',
            web_url: 'https://gitlab.com/other/project/-/pipelines/42',
          }),
        }),
      ],
      otherAccessLevel: 30,
    });
    await expand(root);
    const card = root.querySelector('.gp-downstream-card') as HTMLElement;
    expect(card).not.toBeNull();
    expect(menuLabels(card)).toEqual(['Retry pipeline']);
  });
});

describe('loading older pipelines', () => {
  const nextLink = (page: number) =>
    `<https://gitlab.com/api/v4/projects/group%2Fproject/pipelines?page=${page}&per_page=20>; rel="next"`;

  function pagedHandler(pages: Pipeline[]): (request: HostRequest) => HostResponse {
    return (request) => {
      if (request.path.endsWith('/pipelines')) {
        const page = Number(request.query?.page ?? 1);
        const body = JSON.stringify([pages[page - 1] ?? pipeline({ id: 900 + page })]);
        return page < pages.length
          ? { status: 200, body, headers: { link: nextLink(page + 1) } }
          : { status: 200, body };
      }
      return { status: 200, body: '[]' };
    };
  }

  test('Load more appears only with a next page, and appends without disturbing expansion', async () => {
    const host = configuredHost();
    host.gitlabHandler = pagedHandler([
      pipeline({ id: 1, ref: 'first' }),
      pipeline({ id: 2, ref: 'second' }),
    ]);
    const { root } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('first');
    expect(text(root)).not.toContain('second');
    const more = root.querySelector('.gp-more button') as HTMLButtonElement;
    expect(more?.textContent?.trim()).toBe('Load more');

    // Expand the first row, then load so the expansion must survive. Re-query
    // the control: expanding re-renders the panel and replaces its nodes.
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-more button') as HTMLButtonElement).click();
    await flush();

    expect(text(root)).toContain('second');
    expect((root.querySelector('.gp-item') as HTMLElement).dataset.open).toBe('true');
    // The last page has no next link, so the control is gone.
    expect(root.querySelector('.gp-more')).toBeNull();
  });

  test('repeated clicks do not double-append', async () => {
    const host = configuredHost();
    host.gitlabHandler = pagedHandler([
      pipeline({ id: 1 }),
      pipeline({ id: 2 }),
      pipeline({ id: 3 }),
    ]);
    const { root } = await mount(host, new FakeTimers());
    const more = root.querySelector('.gp-more button') as HTMLButtonElement;
    more.click();
    more.click();
    await flush();
    expect(root.querySelectorAll('.gp-row').length).toBe(2);
    (root.querySelector('.gp-more button') as HTMLButtonElement).click();
    await flush();
    expect(root.querySelectorAll('.gp-row').length).toBe(3);
  });

  test('a missing X-Total/X-Total-Pages never blocks loading', async () => {
    const host = configuredHost();
    // The Link header is the only signal; no totals are returned anywhere.
    host.gitlabHandler = pagedHandler([pipeline({ id: 1 }), pipeline({ id: 2 })]);
    const { root } = await mount(host, new FakeTimers());
    expect(root.querySelector('.gp-more')).not.toBeNull();
  });
});

describe('rate limits', () => {
  test('a 429 shows one notice, widens the poll, and clears on the next success', async () => {
    const host = configuredHost();
    let limited = true;
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return limited
          ? { status: 429, body: '', headers: { 'retry-after': '30', 'ratelimit-remaining': '0' } }
          : { status: 200, body: JSON.stringify([pipeline({ status: 'success' })]) };
      }
      return { status: 200, body: '[]' };
    };
    const timers = new FakeTimers();
    const { root } = await mount(host, timers);

    expect(text(root)).toContain('rate-limited');
    // The 429's own low remaining must not double the Retry-After.
    expect(timers.pendingDelays()).toContain(30_000);
    expect(timers.pendingDelays()).not.toContain(60_000);

    limited = false;
    timers.advance(30_000);
    await flush();
    expect(text(root)).not.toContain('rate-limited');
    expect(text(root)).toContain('Passed');
  });

  test('a low RateLimit-Remaining widens the poll pre-emptively', async () => {
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return {
          status: 200,
          body: JSON.stringify([pipeline({ status: 'running', finished_at: null })]),
          headers: { 'ratelimit-remaining': '3' },
        };
      }
      return { status: 200, body: '[]' };
    };
    const timers = new FakeTimers();
    const { panel } = await mount(host, timers);
    expect(panel.isPolling()).toBe(true);
    // Base is 5000; a low remaining budget doubles it.
    expect(timers.pendingDelays()).toContain(10_000);
  });
});

describe('incremental traces', () => {
  function runningTraceHandler(onTrace: (request: HostRequest) => HostResponse): (request: HostRequest) => HostResponse {
    return (request) => {
      if (request.path.endsWith('/pipelines')) {
        return { status: 200, body: JSON.stringify([pipeline({ id: 7, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/jobs')) {
        return { status: 200, body: JSON.stringify([job({ id: 9, status: 'running', finished_at: null })]) };
      }
      if (request.path.endsWith('/trace')) return onTrace(request);
      return { status: 404, body: '' };
    };
  }

  test('accumulates successive windows into one log from the running offset', async () => {
    const host = configuredHost();
    const full = 'part 1 part 2';
    let calls = 0;
    host.gitlabHandler = runningTraceHandler((request) => {
      calls += 1;
      if (calls === 1) return { status: 200, body: 'part 1', truncated: true };
      return { status: 200, body: sliceTrace(full, request) };
    });
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();

    expect(root.querySelector('.gp-drawer-body')?.textContent).toBe(full);
    const traceRequests = host.gitlabRequests.filter((request) => request.path.endsWith('/trace'));
    expect(traceRequests).toHaveLength(2);
    expect(traceRequests[1]?.query?.byte_offset).toBe('6');
  });

  test('a running log stops accumulating at the drawer line cap', async () => {
    const host = configuredHost();
    const huge = Array.from({ length: LOG_MAX_LINES + 1 }, (_, index) => `line ${index + 1}`).join('\n');
    host.gitlabHandler = runningTraceHandler(() => ({ status: 200, body: huge, truncated: true }));
    const { root } = await mount(host, new FakeTimers());
    (root.querySelector('.gp-row') as HTMLElement).click();
    await flush();
    (root.querySelector('.gp-job') as HTMLElement).click();
    await flush();

    expect(root.querySelector('.gp-drawer-notice')?.textContent).toContain('Older lines not shown');
    // One window already filled the line cap, so the loop stopped.
    const traceRequests = host.gitlabRequests.filter((request) => request.path.endsWith('/trace'));
    expect(traceRequests).toHaveLength(1);
  });
});

describe('conditional pipeline fetches', () => {
  test('an unchanged list answered 304 keeps the list and sends If-None-Match', async () => {
    const host = configuredHost();
    let calls = 0;
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        calls += 1;
        if (calls === 1) {
          return {
            status: 200,
            body: JSON.stringify([pipeline({ id: 1, ref: 'unchanged' })]),
            headers: { etag: 'W/"p"' },
          };
        }
        return { status: 304, body: '' };
      }
      return { status: 200, body: '[]' };
    };
    const { root, panel } = await mount(host, new FakeTimers());
    expect(text(root)).toContain('unchanged');
    panel.refresh();
    await flush();

    expect(text(root)).toContain('unchanged');
    expect(root.querySelector('.gp-state')).toBeNull();
    const requests = pipelineRequests(host);
    expect(requests[1]?.headers?.['if-none-match']).toBe('W/"p"');
  });

  test('the cache is dropped when the Access token changes', async () => {
    const host = configuredHost();
    host.gitlabHandler = (request) => {
      if (request.path.endsWith('/pipelines')) {
        return {
          status: 200,
          body: JSON.stringify([pipeline({ id: 1 })]),
          headers: { etag: 'W/"p"' },
        };
      }
      return { status: 200, body: '[]' };
    };
    const { root } = await mount(host, new FakeTimers());
    expect(pipelineRequests(host)).toHaveLength(1);

    openConfig(root);
    setField(root, 'gp-config-token', 'rotated-pat');
    submitConfig(root);
    await flush();

    const requests = pipelineRequests(host);
    expect(requests.length).toBeGreaterThan(1);
    // A different token means the cached ETag no longer applies.
    expect(requests[requests.length - 1]?.headers?.['if-none-match']).toBeUndefined();
  });
});

