import { describe, expect, test } from 'bun:test';
import { HOST_ERROR, PROXY_BODY_MAX, type ProxyFetch } from '../service/proxy';
import type { ConfigFs } from '../service/config';
import {
  NO_TOKEN_ERROR,
  proxyWithConfig,
  readConfigRoute,
  writeConfigRoute,
  writeTokenRoute,
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

function fakeFetch(reply: { status?: number; body?: string } = {}): ProxyFetch & {
  calls: Array<{ url: string; init: { method: string; headers: Record<string, string>; body?: string } }>;
} {
  const calls: Array<{ url: string; init: { method: string; headers: Record<string, string>; body?: string } }> =
    [];
  const fetchImpl = (async (
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string },
  ) => {
    calls.push({ url, init });
    return new Response(reply.body ?? '{"ok":true}', { status: reply.status ?? 200 });
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

  test('falls back to a body token while the Panel is being cut over', async () => {
    const fs = fakeFs();
    const fetchImpl = fakeFetch();
    await proxyWithConfig(fs, PATH, proxyRequest({ token: 'body-token' }), fetchImpl);
    expect(fetchImpl.calls[0]?.init.headers.Authorization).toBe('Bearer body-token');
  });

  test('prefers the configured token over a body token', async () => {
    const fs = fakeFs();
    await writeTokenRoute(fs, PATH, { host: 'gitlab.example.com', token: 'configured' });
    const fetchImpl = fakeFetch();
    await proxyWithConfig(fs, PATH, proxyRequest({ token: 'body-token' }), fetchImpl);
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
        proxyRequest({ baseUrl, token: 'body-token' }),
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
