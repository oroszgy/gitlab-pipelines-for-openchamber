import { describe, expect, test } from 'bun:test';
import { readConfig, type ConfigFs } from '../service/config';
import {
  createPoller,
  pollOnce,
  SERVICE_POLL_INTERVAL_MS,
  MOVED_PROJECT_ERROR,
  type PollContext,
  type PollerTimers,
} from '../service/poller';
import type { ProxyFetch } from '../service/proxy';
import { writeTokenRoute, writeWatchRoute } from '../service/routes';

type Entry = { content: string; mode: number };

/** A filesystem seam backed by a path → entry map, mirroring the config tests. */
function fakeFs(entries: Record<string, Entry> = {}): ConfigFs & { entries: Record<string, Entry> } {
  return {
    entries,
    async readFile(path) {
      const entry = entries[path];
      if (!entry) {
        const error = new Error(`ENOENT ${path}`) as Error & { code: string };
        error.code = 'ENOENT';
        throw error;
      }
      return entry.content;
    },
    async writeFile(path, content, mode) {
      const existing = entries[path];
      entries[path] = { content, mode: existing ? existing.mode : mode };
    },
    async chmod(path, mode) {
      const entry = entries[path];
      if (entry) entry.mode = mode;
    },
    async mkdir() {},
  };
}

type Reply = { status?: number; body?: string; headers?: Record<string, string> };

/** A fetch that records what it was asked for and can have its reply swapped between polls. */
function fakeFetch(initial: Reply = {}): ProxyFetch & {
  calls: Array<{ url: string; init: { method: string; headers: Record<string, string> } }>;
  reply(next: Reply): void;
} {
  const calls: Array<{ url: string; init: { method: string; headers: Record<string, string> } }> = [];
  let current = initial;
  const fetchImpl = (async (url: string, init: { method: string; headers: Record<string, string> }) => {
    calls.push({ url, init });
    return new Response(current.body ?? '[]', {
      status: current.status ?? 200,
      ...(current.headers ? { headers: current.headers } : {}),
    });
  }) as unknown as ProxyFetch & {
    calls: typeof calls;
    reply(next: Reply): void;
  };
  fetchImpl.calls = calls;
  fetchImpl.reply = (next) => {
    current = next;
  };
  return fetchImpl;
}

const PATH = '/cfg/config.json';
const NOW = new Date('2026-01-02T03:04:05.000Z');
const HOST = 'gitlab.example.com';
const PROJECT = 'group/project';
const WATCH_KEY = `${HOST}/${PROJECT}`;

const pipeline = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  status: 'success',
  ref: 'main',
  ...overrides,
});

/** Seed a token (and by default a watch) and hand back a poll context over the same filesystem. */
async function setup(options: {
  reply?: Reply;
  watch?: string | null;
  token?: string | null;
} = {}): Promise<{
  fs: ConfigFs & { entries: Record<string, Entry> };
  fetchImpl: ReturnType<typeof fakeFetch>;
  context: PollContext;
}> {
  const fs = fakeFs();
  const token = options.token === undefined ? 'pat' : options.token;
  if (token) await writeTokenRoute(fs, PATH, { host: HOST, token });
  if (options.watch !== null) {
    await writeWatchRoute(fs, PATH, { host: HOST, project: PROJECT, ref: options.watch ?? 'main' }, () => NOW);
  }
  const fetchImpl = fakeFetch(options.reply);
  const context: PollContext = { fs, path: PATH, fetchImpl, now: () => NOW };
  return { fs, fetchImpl, context };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('service poller: recording Terminal events', () => {
  test('records a terminal event for a first settled Pipeline', async () => {
    const { fs, fetchImpl, context } = await setup({ reply: { body: JSON.stringify([pipeline()]) } });

    const outcome = await pollOnce(context);

    const config = await readConfig(fs, PATH);
    expect(config.events).toEqual([
      {
        host: HOST,
        project: PROJECT,
        ref: 'main',
        pipelineId: 7,
        status: 'success',
        at: NOW.toISOString(),
      },
    ]);
    expect(outcome.recorded).toBe(1);
    expect(fetchImpl.calls).toHaveLength(1);
  });

  test('polls the watched Ref through the proxy, with the configured token', async () => {
    const { fetchImpl, context } = await setup({ reply: { body: JSON.stringify([pipeline()]) } });

    await pollOnce(context);

    expect(fetchImpl.calls[0]?.url).toContain('/api/v4/projects/group%2Fproject/pipelines');
    expect(fetchImpl.calls[0]?.url).toContain('ref=main');
    expect(fetchImpl.calls[0]?.init.method).toBe('GET');
    expect(fetchImpl.calls[0]?.init.headers.Authorization).toBe('Bearer pat');
  });

  test('does not re-record the same identity on a later poll', async () => {
    const { fs, context } = await setup({ reply: { body: JSON.stringify([pipeline()]) } });

    await pollOnce(context);
    const second = await pollOnce(context);

    const config = await readConfig(fs, PATH);
    expect(config.events).toHaveLength(1);
    expect(config.eventSeq).toBe(1);
    expect(second.recorded).toBe(0);
  });

  test('survives a restart, so a re-poll after restart still dedupes', async () => {
    const { fs, fetchImpl, context } = await setup({ reply: { body: JSON.stringify([pipeline()]) } });
    await pollOnce(context);

    // A restarted poller reads the same persisted file and sees the event already there.
    const restarted: PollContext = { fs, path: PATH, fetchImpl, now: () => NOW };
    await pollOnce(restarted);

    expect((await readConfig(fs, PATH)).events).toHaveLength(1);
  });

  test('records failed and canceled as terminal too', async () => {
    const { fs, context } = await setup({
      reply: { body: JSON.stringify([pipeline({ id: 8, status: 'failed' }), pipeline({ id: 9, status: 'canceled' })]) },
    });

    await pollOnce(context);

    expect((await readConfig(fs, PATH)).events.map((e) => e.status)).toEqual(['failed', 'canceled']);
  });

  test('records nothing while the Pipeline is still running', async () => {
    const { fs, context } = await setup({
      reply: { body: JSON.stringify([pipeline({ status: 'running', created_at: NOW.toISOString() })]) },
    });

    await pollOnce(context);

    expect((await readConfig(fs, PATH)).events).toEqual([]);
  });
});

describe('service poller: cadence', () => {
  test('keeps the slow floor while nothing is active', async () => {
    const { context } = await setup({ reply: { body: JSON.stringify([pipeline()]) } });

    const outcome = await pollOnce(context);

    expect(outcome.delayMs).toBe(SERVICE_POLL_INTERVAL_MS);
  });

  test('widens the next poll as the active Pipeline ages', async () => {
    const created = new Date(NOW.getTime() - 11 * 60_000).toISOString();
    const { context } = await setup({
      reply: { body: JSON.stringify([pipeline({ status: 'running', created_at: created })]) },
    });

    const outcome = await pollOnce(context);

    expect(outcome.delayMs).toBe(SERVICE_POLL_INTERVAL_MS * 3);
  });

  test('widens once but not yet thrice on a middling Pipeline', async () => {
    const created = new Date(NOW.getTime() - 5 * 60_000).toISOString();
    const { context } = await setup({
      reply: { body: JSON.stringify([pipeline({ status: 'running', created_at: created })]) },
    });

    const outcome = await pollOnce(context);

    expect(outcome.delayMs).toBe(SERVICE_POLL_INTERVAL_MS * 2);
  });
});

describe('service poller: rate limits', () => {
  test('pauses and honours Retry-After on a 429', async () => {
    const { context } = await setup({ reply: { status: 429, headers: { 'Retry-After': '120' }, body: '' } });

    const outcome = await pollOnce(context);

    expect(outcome.paused).toBe(true);
    expect(outcome.delayMs).toBeGreaterThanOrEqual(120_000);
  });

  test('widens on a 429 that carries no Retry-After', async () => {
    const { context } = await setup({ reply: { status: 429, body: '' } });

    const outcome = await pollOnce(context);

    expect(outcome.paused).toBe(true);
    expect(outcome.delayMs).toBe(SERVICE_POLL_INTERVAL_MS * 2);
  });
});

describe('service poller: watches it will not follow', () => {
  test('makes no GitLab call when nothing is watched', async () => {
    const { fetchImpl, context } = await setup({ watch: null, reply: { body: '[]' } });

    const outcome = await pollOnce(context);

    expect(fetchImpl.calls).toHaveLength(0);
    expect(outcome.delayMs).toBe(SERVICE_POLL_INTERVAL_MS);
  });

  test('makes no GitLab call when the host has no token', async () => {
    const { fetchImpl, context } = await setup({ token: null, reply: { body: '[]' } });

    await pollOnce(context);

    expect(fetchImpl.calls).toHaveLength(0);
  });

  test('records a moved project as a watch error instead of following it', async () => {
    const { fs, fetchImpl, context } = await setup({
      reply: { status: 301, body: 'This resource has been moved permanently.' },
    });

    await pollOnce(context);

    const config = await readConfig(fs, PATH);
    expect(config.watches[WATCH_KEY]?.error).toBe(MOVED_PROJECT_ERROR);
    expect(config.events).toEqual([]);
    // The redirect is not followed: exactly one request was made.
    expect(fetchImpl.calls).toHaveLength(1);
  });

  test('clears a watch error once the project answers again', async () => {
    const { fs, fetchImpl, context } = await setup({ reply: { status: 301, body: 'moved' } });
    await pollOnce(context);
    expect((await readConfig(fs, PATH)).watches[WATCH_KEY]?.error).toBe(MOVED_PROJECT_ERROR);

    fetchImpl.reply({ body: JSON.stringify([pipeline()]) });
    await pollOnce(context);

    const watch = (await readConfig(fs, PATH)).watches[WATCH_KEY];
    expect(watch?.error).toBeUndefined();
    expect(watch?.ref).toBe('main');
  });
});

describe('the poller scheduler', () => {
  function manualTimers(): { timers: PollerTimers; pending: () => Array<{ handler: () => void; ms: number }> } {
    let queue: Array<{ handler: () => void; ms: number }> = [];
    let next = 1;
    return {
      timers: {
        setTimeout(handler, ms) {
          queue.push({ handler, ms });
          return next++;
        },
        clearTimeout() {},
      },
      pending: () => queue,
    };
  }

  test('start schedules the first poll on the floor and stop clears it', () => {
    const { timers, pending } = manualTimers();
    const poller = createPoller({ fs: fakeFs(), path: PATH, fetchImpl: fakeFetch(), timers });

    poller.start();
    expect(poller.isRunning()).toBe(true);
    expect(pending()).toHaveLength(1);
    expect(pending()[0]?.ms).toBe(SERVICE_POLL_INTERVAL_MS);

    poller.stop();
    expect(poller.isRunning()).toBe(false);
  });

  test('a due poll records an event and schedules the next one', async () => {
    const { timers, pending } = manualTimers();
    const { fs, context } = await setup({ reply: { body: JSON.stringify([pipeline()]) } });
    const poller = createPoller({ ...context, timers });

    poller.start();
    const due = pending().shift();
    due?.handler();
    await flush();
    poller.stop();

    expect((await readConfig(fs, PATH)).events).toHaveLength(1);
    expect(pending()).toHaveLength(1);
  });
});
