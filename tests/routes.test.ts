import { describe, expect, test } from 'bun:test';
import { HOST_ERROR, PROXY_BODY_MAX, type ProxyFetch } from '../service/proxy';
import { EVENT_LOG_MAX, type ConfigFs } from '../service/config';
import {
  advanceSeenRoute,
  NO_TOKEN_ERROR,
  proxyWithConfig,
  readConfigRoute,
  readEventsRoute,
  readWatchRoute,
  writeConfigRoute,
  writeEventRoute,
  writeTokenRoute,
  writeWatchRoute,
  type ProxyRouteRequest,
} from '../service/routes';

type Entry = { content: string; mode: number };

/** A filesystem seam backed by a path → entry map, mirroring the config store's tests. */
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
      // Mirrors Node: `mode` applies only when the file is created.
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

function fakeFetch(reply: { status?: number; body?: string; headers?: Record<string, string> } = {}): ProxyFetch & {
  calls: Array<{ url: string; init: { method: string; headers: Record<string, string>; body?: string } }>;
} {
  const calls: Array<{ url: string; init: { method: string; headers: Record<string, string>; body?: string } }> =
    [];
  const fetchImpl = (async (
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string },
  ) => {
    calls.push({ url, init });
    return new Response(reply.body ?? '{"ok":true}', {
      status: reply.status ?? 200,
      ...(reply.headers ? { headers: reply.headers } : {}),
    });
  }) as unknown as ProxyFetch;
  return Object.assign(fetchImpl, { calls });
}

const PATH = '/cfg/config.json';

const DEFAULT_VIEW = { host: 'gitlab.com', project: '', hasToken: {} };

describe('reading the configuration route', () => {
  test('yields the default view when there is no file', async () => {
    expect(await readConfigRoute(fakeFs(), PATH)).toEqual(DEFAULT_VIEW);
  });

  test('never returns a token, only whether one exists per host', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: 'secret-pat' });
    const view = await readConfigRoute(fs, PATH);
    expect(view.hasToken).toEqual({ 'gitlab.com': true });
    expect(JSON.stringify(view)).not.toContain('secret-pat');
  });
});

describe('writing the Configured host and Project override', () => {
  test('persists them so a later read returns them', async () => {
    const fs = fakeFs();
    const result = await writeConfigRoute(fs, PATH, {
      host: 'https://gitlab.example.com/',
      project: 'group/project',
    });
    expect(result.ok).toBe(true);
    expect(await readConfigRoute(fs, PATH)).toEqual({
      host: 'gitlab.example.com',
      project: 'group/project',
      hasToken: {},
    });
  });

  test('keeps the stored tokens', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: 'secret-pat' });
    await writeConfigRoute(fs, PATH, { host: 'gitlab.example.com', project: 'group/project' });
    expect(await readConfigRoute(fs, PATH)).toEqual({
      host: 'gitlab.example.com',
      project: 'group/project',
      hasToken: { 'gitlab.com': true },
    });
  });

  test('refuses a malformed Configured host, storing nothing', async () => {
    const fs = fakeFs();
    const result = await writeConfigRoute(fs, PATH, { host: 'http://nope', project: 'x' });
    expect(result).toEqual({ ok: false, error: HOST_ERROR });
    expect(await readConfigRoute(fs, PATH)).toEqual(DEFAULT_VIEW);
  });
});

describe('setting and clearing an Access token', () => {
  test('stores a token for the named host and keeps another host’s', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: 'a' });
    const result = await writeTokenRoute(fs, PATH, { host: 'https://gitlab.example.com/', token: 'b' });
    expect(result.ok).toBe(true);
    expect(await readConfigRoute(fs, PATH)).toEqual({
      host: 'gitlab.com',
      project: '',
      hasToken: { 'gitlab.com': true, 'gitlab.example.com': true },
    });
  });

  test('clears one host’s token and leaves the others', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: 'a' });
    await writeTokenRoute(fs, PATH, { host: 'gitlab.example.com', token: 'b' });
    const result = await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: null });
    expect(result.ok).toBe(true);
    expect(await readConfigRoute(fs, PATH)).toMatchObject({
      hasToken: { 'gitlab.example.com': true },
    });
  });

  test('uses the Configured host when no host is named', async () => {
    const fs = fakeFs();
    await writeConfigRoute(fs, PATH, { host: 'gitlab.example.com', project: '' });
    await writeTokenRoute(fs, PATH, { token: 'secret-pat' });
    expect(await readConfigRoute(fs, PATH)).toMatchObject({
      hasToken: { 'gitlab.example.com': true },
    });
  });

  test('refuses a blank token rather than clearing a stored one', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: 'secret-pat' });
    const result = await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: '   ' });
    expect(result.ok).toBe(false);
    expect(await readConfigRoute(fs, PATH)).toMatchObject({
      hasToken: { 'gitlab.com': true },
    });
  });

  test('refuses an absent token rather than clearing, so a partial request cannot wipe it', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: 'secret-pat' });
    const result = await writeTokenRoute(fs, PATH, { host: 'gitlab.com' });
    expect(result.ok).toBe(false);
    expect(await readConfigRoute(fs, PATH)).toMatchObject({
      hasToken: { 'gitlab.com': true },
    });
  });

  test('the write response never returns a token', async () => {
    const fs = fakeFs();
    const result = await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: 'secret-pat' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result.view)).not.toContain('secret-pat');
  });

  test('refuses a token for a malformed host', async () => {
    const fs = fakeFs();
    const result = await writeTokenRoute(fs, PATH, { host: 'http://nope', token: 'a' });
    expect(result).toEqual({ ok: false, error: HOST_ERROR });
    expect(await readConfigRoute(fs, PATH)).toEqual(DEFAULT_VIEW);
  });
});

describe('reading and writing the watch', () => {
  const now = () => new Date('2026-01-02T03:04:05.000Z');
  const addedAt = now().toISOString();

  test('sets a watch and reads it back', async () => {
    const fs = fakeFs();
    const written = await writeWatchRoute(
      fs,
      PATH,
      { host: 'gitlab.com', project: 'group/project', ref: 'main' },
      now,
    );
    expect(written).toEqual({ ok: true, watch: { ref: 'main', addedAt } });
    expect(await readWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project' })).toEqual({
      ref: 'main',
      addedAt,
    });
  });

  test('replaces the previous Ref for the same project', async () => {
    const fs = fakeFs();
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project', ref: 'main' }, now);
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project', ref: 'release' }, now);
    const watch = await readWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project' });
    expect(watch?.ref).toBe('release');
  });

  test('reads a null watch when none is set', async () => {
    const fs = fakeFs();
    expect(await readWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project' })).toBeNull();
  });

  test('uses the Configured host and project when none is named', async () => {
    const fs = fakeFs();
    await writeConfigRoute(fs, PATH, { host: 'gitlab.example.com', project: 'group/project' });
    expect(await writeWatchRoute(fs, PATH, { ref: 'main' }, now)).toEqual({
      ok: true,
      watch: { ref: 'main', addedAt },
    });
    expect(await readWatchRoute(fs, PATH, {})).toEqual({ ref: 'main', addedAt });
  });

  test('clears with an explicit null Ref', async () => {
    const fs = fakeFs();
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project', ref: 'main' }, now);
    expect(
      await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project', ref: null }, now),
    ).toEqual({ ok: true, watch: null });
    expect(await readWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project' })).toBeNull();
  });

  test('clears with an empty Ref', async () => {
    const fs = fakeFs();
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project', ref: 'main' }, now);
    expect(
      await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project', ref: '   ' }, now),
    ).toEqual({ ok: true, watch: null });
  });

  test('clears when the Ref is absent, PUT replacing the whole watch', async () => {
    const fs = fakeFs();
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project', ref: 'main' }, now);
    expect(
      await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project' }, now),
    ).toEqual({ ok: true, watch: null });
  });

  test('keeps the watches of other projects', async () => {
    const fs = fakeFs();
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/a', ref: 'main' }, now);
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/b', ref: 'release' }, now);
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/a', ref: null }, now);
    expect(await readWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/b' })).toEqual({
      ref: 'release',
      addedAt,
    });
  });

  test('the watch survives a restart, read back from the same file', async () => {
    const fs = fakeFs();
    await writeWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project', ref: 'main' }, now);
    // A read against the persisted file is what a restarted service does.
    expect(await readWatchRoute(fs, PATH, { host: 'gitlab.com', project: 'group/project' })).toEqual({
      ref: 'main',
      addedAt,
    });
  });

  test('refuses a watch when no project can be resolved', async () => {
    const fs = fakeFs();
    const result = await writeWatchRoute(fs, PATH, { host: 'gitlab.com', ref: 'main' }, now);
    expect(result.ok).toBe(false);
  });

  test('refuses a watch for a malformed host', async () => {
    const fs = fakeFs();
    const result = await writeWatchRoute(
      fs,
      PATH,
      { host: 'http://nope', project: 'group/project', ref: 'main' },
      now,
    );
    expect(result).toEqual({ ok: false, error: HOST_ERROR });
  });
});

function proxyRequest(overrides: Partial<ProxyRouteRequest> = {}): ProxyRouteRequest {
  return {
    baseUrl: 'https://gitlab.example.com',
    method: 'GET',
    path: '/api/v4/user',
    ...overrides,
  };
}

describe('the proxy resolves the token from configuration', () => {
  test('attaches the configured token with no body token supplied', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.example.com', token: 'configured' });
    const fetchImpl = fakeFetch();
    const result = await proxyWithConfig(fs, PATH, proxyRequest(), fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl.calls[0]?.init.headers.Authorization).toBe('Bearer configured');
  });

  test('matches the configured token regardless of the base-URL spelling', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'GitLab.Example.com', token: 'configured' });
    const fetchImpl = fakeFetch();
    await proxyWithConfig(fs, PATH, proxyRequest({ baseUrl: 'https://GitLab.Example.com/' }), fetchImpl);
    expect(fetchImpl.calls[0]?.init.headers.Authorization).toBe('Bearer configured');
  });

  test('ignores a stray body token, using only the configured one', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.example.com', token: 'configured' });
    const fetchImpl = fakeFetch();
    const request = { ...proxyRequest(), token: 'body-token' } as unknown as ProxyRouteRequest;
    await proxyWithConfig(fs, PATH, request, fetchImpl);
    expect(fetchImpl.calls[0]?.init.headers.Authorization).toBe('Bearer configured');
  });

  test('a host with no token is a typed error, making no call', async () => {
    const fs = fakeFs();
    const fetchImpl = fakeFetch();
    const result = await proxyWithConfig(fs, PATH, proxyRequest(), fetchImpl);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('no-token');
    expect(result.error).toBe(NO_TOKEN_ERROR);
    expect(fetchImpl.calls).toHaveLength(0);
  });

  test('never sends another host’s configured token to a different host', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.com', token: 'gitlab-secret' });
    const fetchImpl = fakeFetch();
    const result = await proxyWithConfig(fs, PATH, proxyRequest(), fetchImpl);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('no-token');
    expect(fetchImpl.calls).toHaveLength(0);
  });

  const bad = [
    ['http://gitlab.example.com', 'not https'],
    ['https://user:pass@gitlab.example.com', 'embedded credentials'],
    ['https://gitlab.example.com/gitlab/x', 'a path beyond the root'],
    ['', 'empty'],
  ];

  for (const [baseUrl, why] of bad) {
    test(`refuses ${JSON.stringify(baseUrl)} (${why}) before any call`, async () => {
      const fs = fakeFs();
      const fetchImpl = fakeFetch();
      const result = await proxyWithConfig(
        fs,
        PATH,
        proxyRequest({ baseUrl }),
        fetchImpl,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe(HOST_ERROR);
      expect(fetchImpl.calls).toHaveLength(0);
    });
  }

  test('strips the resolved token from a returned body', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.example.com', token: 'configured' });
    const result = await proxyWithConfig(
      fs,
      PATH,
      proxyRequest(),
      fakeFetch({ status: 500, body: 'upstream said Bearer configured is bad' }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body).not.toContain('configured');
  });

  test('still caps the response body and says so', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.example.com', token: 'configured' });
    const huge = 'x'.repeat(PROXY_BODY_MAX + 100);
    const result = await proxyWithConfig(fs, PATH, proxyRequest(), fakeFetch({ body: huge }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.length).toBe(PROXY_BODY_MAX);
    expect(result.truncated).toBe(true);
  });
});

describe('the proxy carries the header allowlist', () => {
  test('forwards If-None-Match and returns only allowlisted response headers', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.example.com', token: 'configured' });
    const fetchImpl = fakeFetch({
      status: 304,
      headers: { ETag: 'W/"abc"', 'Set-Cookie': 'session=secret', 'X-Evil': '1' },
    });
    const result = await proxyWithConfig(
      fs,
      PATH,
      proxyRequest({ headers: { 'If-None-Match': 'W/"abc"', Cookie: 'session=secret' } }),
      fetchImpl,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(304);
    expect(result.headers).toEqual({ etag: 'W/"abc"' });
    expect(fetchImpl.calls[0]?.init.headers['if-none-match']).toBe('W/"abc"');
    expect(fetchImpl.calls[0]?.init.headers.Cookie).toBeUndefined();
    expect(fetchImpl.calls[0]?.init.headers.cookie).toBeUndefined();
  });
});

describe('the events route', () => {
  const at = '2026-01-02T03:04:05.000Z';
  const event = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    host: 'gitlab.com',
    project: 'group/project',
    ref: 'main',
    pipelineId: 1,
    status: 'success',
    at,
    ...overrides,
  });

  test('GET returns only the events after the cursor', async () => {
    const fs = fakeFs();
    for (const pipelineId of [1, 2, 3]) await writeEventRoute(fs, PATH, event({ pipelineId }));
    const view = await readEventsRoute(fs, PATH, { after: 1 });
    expect(view.events.map((e) => e.pipelineId)).toEqual([2, 3]);
    expect(view.cursor).toBe(3);
  });

  test('GET without a cursor returns every retained event', async () => {
    const fs = fakeFs();
    for (const pipelineId of [1, 2]) await writeEventRoute(fs, PATH, event({ pipelineId }));
    expect((await readEventsRoute(fs, PATH, {})).events).toHaveLength(2);
  });

  test('advancing the watermark makes the unseen count zero', async () => {
    const fs = fakeFs();
    for (const pipelineId of [1, 2]) await writeEventRoute(fs, PATH, event({ pipelineId }));
    const view = await readEventsRoute(fs, PATH, { after: 0 });
    expect(view.unseen).toBe(2);
    expect(await advanceSeenRoute(fs, PATH, { cursor: view.cursor })).toEqual({
      ok: true,
      seen: 2,
      unseen: 0,
    });
    expect((await readEventsRoute(fs, PATH, { after: 0 })).unseen).toBe(0);
  });

  test('POST of an identity already recorded does not duplicate it', async () => {
    const fs = fakeFs();
    const first = await writeEventRoute(fs, PATH, event());
    const second = await writeEventRoute(fs, PATH, event());
    expect(first).toMatchObject({ ok: true, recorded: true });
    expect(second).toMatchObject({ ok: true, recorded: false });
    expect((await readEventsRoute(fs, PATH, { after: 0 })).events).toHaveLength(1);
  });

  test('POST stamps the time when the event carries none', async () => {
    const fs = fakeFs();
    const now = () => new Date('2026-02-03T04:05:06.000Z');
    const result = await writeEventRoute(
      fs,
      PATH,
      { host: 'gitlab.com', project: 'group/project', ref: 'main', pipelineId: 7, status: 'failed' },
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.at).toBe('2026-02-03T04:05:06.000Z');
  });

  test('POST refuses a malformed event', async () => {
    const fs = fakeFs();
    const result = await writeEventRoute(fs, PATH, {
      host: 'gitlab.com',
      project: 'group/project',
      ref: '   ',
      pipelineId: 'seven',
      status: 'failed',
    });
    expect(result.ok).toBe(false);
  });

  test('the bounded log drops the oldest, and eventsAfter stays correct across it', async () => {
    const fs = fakeFs();
    for (let i = 1; i <= EVENT_LOG_MAX + 5; i += 1) {
      await writeEventRoute(fs, PATH, event({ pipelineId: i }));
    }
    const all = await readEventsRoute(fs, PATH, { after: 0 });
    expect(all.events).toHaveLength(EVENT_LOG_MAX);
    expect(all.events[0]?.pipelineId).toBe(6);
    expect(all.cursor).toBe(EVENT_LOG_MAX + 5);
    expect(all.unseen).toBe(EVENT_LOG_MAX + 5);

    // A cursor inside the retained window yields exactly the events after it,
    // even though the oldest events have already been dropped from the log.
    const later = await readEventsRoute(fs, PATH, { after: 6 });
    expect(later.events[0]?.pipelineId).toBe(7);
    expect(later.events).toHaveLength(EVENT_LOG_MAX - 1);
    expect(later.events.at(-1)?.pipelineId).toBe(EVENT_LOG_MAX + 5);

    // A cursor at the newest event yields nothing.
    expect((await readEventsRoute(fs, PATH, { after: EVENT_LOG_MAX + 5 })).events).toEqual([]);
  });

  test('refuses a cursor that is not a non-negative integer', async () => {
    const fs = fakeFs();
    expect((await advanceSeenRoute(fs, PATH, { cursor: -1 })).ok).toBe(false);
    expect((await advanceSeenRoute(fs, PATH, { cursor: 'x' })).ok).toBe(false);
  });
});
