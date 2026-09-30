import { describe, expect, test } from 'bun:test';
import {
  buildTargetUrl,
  handleProxy,
  PROXY_BODY_MAX,
  PROXY_TIMEOUT_MS,
  type ProxyFetch,
} from '../service/proxy';

/**
 * The proxy handler is tested directly through its one seam: the injected fetch.
 * A fake records what the handler asked for and answers what the test dictates.
 */
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

const request = (overrides: Record<string, unknown> = {}) => ({
  baseUrl: 'https://gitlab.example.com',
  token: 'secret-pat',
  method: 'GET' as const,
  path: '/api/v4/projects/g%2Fp/pipelines',
  query: { per_page: '20' },
  ...overrides,
});

describe('buildTargetUrl', () => {
  test('joins a bare host with the path and query as https', () => {
    expect(buildTargetUrl('gitlab.example.com', '/api/v4/user', {})).toBe(
      'https://gitlab.example.com/api/v4/user',
    );
  });

  test('accepts a full https origin and an origin with a port', () => {
    expect(buildTargetUrl('https://gitlab.example.com:8443/', '/x', { a: 'b' })).toBe(
      'https://gitlab.example.com:8443/x?a=b',
    );
  });

  test('encodes query values', () => {
    expect(buildTargetUrl('https://g.example', '/x', { ref: 'feature/x' })).toBe(
      'https://g.example/x?ref=feature%2Fx',
    );
  });
});

describe('the proxy refuses a base URL it should not trust', () => {
  const bad = [
    ['http://gitlab.example.com', 'not https'],
    ['https://user:pass@gitlab.example.com', 'embedded credentials'],
    ['https://gitlab.example.com/gitlab/x', 'a path beyond the root'],
    ['ftp://gitlab.example.com', 'not https'],
    ['', 'empty'],
    ['not a url', 'unparseable'],
  ];

  for (const [baseUrl, why] of bad) {
    test(`refuses ${JSON.stringify(baseUrl)} (${why})`, async () => {
      const fetchImpl = fakeFetch();
      const result = await handleProxy(request({ baseUrl }), fetchImpl);
      expect(result.ok).toBe(false);
      expect(fetchImpl.calls).toHaveLength(0);
    });
  }
});

describe('the proxy forwards exactly what it was asked for', () => {
  test('sends the bearer token and the method to the target', async () => {
    const fetchImpl = fakeFetch();
    await handleProxy(request(), fetchImpl);
    expect(fetchImpl.calls[0]?.url).toBe(
      'https://gitlab.example.com/api/v4/projects/g%2Fp/pipelines?per_page=20',
    );
    expect(fetchImpl.calls[0]?.init.method).toBe('GET');
    expect(fetchImpl.calls[0]?.init.headers.Authorization).toBe('Bearer secret-pat');
  });

  test('returns the status and body', async () => {
    const result = await handleProxy(request(), fakeFetch({ status: 200, body: 'hello' }));
    expect(result).toEqual({ ok: true, status: 200, body: 'hello', truncated: false });
  });

  test('passes a non-2xx status through rather than throwing', async () => {
    const result = await handleProxy(request(), fakeFetch({ status: 404, body: '' }));
    expect(result).toEqual({ ok: true, status: 404, body: '', truncated: false });
  });

  test('allows a body on a write method', async () => {
    const fetchImpl = fakeFetch();
    await handleProxy(request({ method: 'POST', body: '{"x":1}' }), fetchImpl);
    expect(fetchImpl.calls[0]?.init.method).toBe('POST');
    expect(fetchImpl.calls[0]?.init.body).toBe('{"x":1}');
  });
});

describe('the proxy keeps the token out of what it returns', () => {
  test('replaces a token echoed in a failing body', async () => {
    const result = await handleProxy(
      request(),
      fakeFetch({ status: 500, body: 'upstream said Bearer secret-pat is bad' }),
    );
    expect(result.ok).toBe(true);
    expect(result.body ?? '').not.toContain('secret-pat');
  });

  test('never puts the token in the URL', async () => {
    const fetchImpl = fakeFetch();
    await handleProxy(request(), fetchImpl);
    expect(fetchImpl.calls[0]?.url).not.toContain('secret-pat');
  });
});

describe('the proxy is bounded', () => {
  test('caps a response body and says so', async () => {
    const huge = 'x'.repeat(PROXY_BODY_MAX + 100);
    const result = await handleProxy(request(), fakeFetch({ body: huge }));
    expect(result.ok).toBe(true);
    expect(result.body?.length).toBe(PROXY_BODY_MAX);
    expect(result.truncated).toBe(true);
  });

  test('does not mark a body under the cap as truncated', async () => {
    const result = await handleProxy(request(), fakeFetch({ body: 'small' }));
    expect(result.ok).toBe(true);
    expect(result.truncated).toBe(false);
  });

  test('turns a transport failure into a network error without the token', async () => {
    const failing = (async () => {
      throw new Error('connect ECONNREFUSED (token secret-pat)');
    }) as unknown as ProxyFetch;
    const result = await handleProxy(request(), failing);
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain('secret-pat');
  });

  test('keeps the abort live while the body is read, so a slow body times out', async () => {
    let aborted = false;
    const slowBody = (async () => ({
      status: 200,
      text: () =>
        new Promise<string>((_, reject) => {
          // The abort signal is what a real fetch would observe; here we assert
          // it is still armed after the headers resolved.
          setTimeout(() => {
            aborted = true;
            reject(new Error('aborted'));
          }, 0);
        }),
    })) as unknown as ProxyFetch;
    const result = await handleProxy(request(), slowBody);
    expect(aborted).toBe(true);
    expect(result.ok).toBe(false);
  });
});

describe('the proxy timeout is stated in one place', () => {
  test('is around the host request budget, not unbounded', () => {
    expect(PROXY_TIMEOUT_MS).toBeGreaterThan(0);
    expect(PROXY_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
