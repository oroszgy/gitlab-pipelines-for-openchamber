import { afterEach, describe, expect, test } from 'bun:test';
import { PANEL_ID } from './config';
import { mountStatusSection } from './status-section';
import { FakeHost, flush, olderService, readyContext, terminalEvent } from '../tests/fakes';

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * A host that resolves to `group/project` on `main`, with that Ref already
 * watched — the state the Status section reads back on mount. The Project
 * override short-circuits Git, so the section's resolution needs only `.git/HEAD`.
 */
function statusHost(): FakeHost {
  const host = new FakeHost();
  host.config.project = 'group/project';
  host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
  host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
  host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
  host.tokens['gitlab.com'] = 'pat';
  host.watch('gitlab.com', 'group/project', 'main');
  return host;
}

async function mount(host: FakeHost): Promise<{ root: HTMLElement; dispose(): void }> {
  const root = document.createElement('div');
  document.body.append(root);
  const section = mountStatusSection(root, host);
  host.emitReady(readyContext({ surface: 'status' }));
  await flush();
  return { root, dispose: () => section.dispose() };
}

function text(root: HTMLElement): string {
  return root.textContent ?? '';
}

describe('status section', () => {
  test('renders the watched Ref, the latest Status and the Unseen count', async () => {
    const host = statusHost();
    host.recordEvent(terminalEvent({ status: 'failed', ref: 'main', project: 'group/project' }));
    const { root } = await mount(host);

    expect(text(root)).toContain('main');
    expect(text(root)).toContain('Failed');
    expect(text(root)).toContain('1 unseen');
  });

  test('the toggle clears the watch through PUT /watch, without opening the panel', async () => {
    const host = statusHost();
    const { root } = await mount(host);

    const button = root.querySelector('button');
    expect(button?.textContent).toContain('Watching');
    button?.click();
    await flush();

    const put = host.serviceRequests.find((request) => request.path === '/watch' && request.method === 'PUT');
    expect(put?.body).toBeDefined();
    expect(JSON.parse(put?.body ?? '{}')).toMatchObject({
      host: 'gitlab.com',
      project: 'group/project',
      ref: null,
    });
    expect(host.watches.size).toBe(0);
    // The toggle click must not bubble into the open-the-panel handler.
    expect(host.openSurfaces).toEqual([]);
  });

  test('clicking the section opens the rail panel', async () => {
    const host = statusHost();
    const { root } = await mount(host);

    root.click();
    await flush();

    expect(host.openSurfaces).toContain(PANEL_ID);
  });

  test('does not clear the badge or advance the watermark', async () => {
    const host = statusHost();
    host.recordEvent(terminalEvent({ status: 'failed', ref: 'main', project: 'group/project' }));
    const { root } = await mount(host);

    root.querySelector('button')?.click();
    await flush();

    expect(host.badges).toEqual([]);
    expect(host.seen).toBe(0);
    expect(host.serviceRequests.some((request) => request.path === '/events/seen')).toBe(false);
  });

  test('an older service disables the toggle and says it is out of date', async () => {
    const host = statusHost();
    olderService(host);
    const { root } = await mount(host);

    const button = root.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(text(root)).toContain('older');
  });
});
