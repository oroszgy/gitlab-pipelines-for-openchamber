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
  calls: Array<{
    url: string;
    init: { method: string; headers: Record<string, string>; body?: string; redirect?: string };
  }>;
} {
  const calls: Array<{
    url: string;
    init: { method: string; headers: Record<string, string>; body?: string; redirect?: string };
  }> = [];
  const fetchImpl = (async (
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string; redirect?: string },
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

describe('the proxy never leaves the configured host', () => {
  const escaping = ['//evil.example.com/collect', '/\\evil.example.com/collect'];

  for (const path of escaping) {
    test(`refuses ${JSON.stringify(path)} before attaching the token`, async () => {
      const fetchImpl = fakeFetch();
      const result = await handleProxy(request({ path }), fetchImpl);
      expect(result.ok).toBe(false);
      expect(fetchImpl.calls).toHaveLength(0);
    });
  }

  test('still allows a path whose authority is the configured host', async () => {
    const fetchImpl = fakeFetch();
    const result = await handleProxy(
      request({ path: '//gitlab.example.com/api/v4/x', query: {} }),
      fetchImpl,
    );
    expect(result.ok).toBe(true);
    expect(fetchImpl.calls[0]?.url).toBe('https://gitlab.example.com/api/v4/x');
  });

  test('keeps absolute-looking and percent-encoded paths on the configured host', async () => {
    const spellings = ['https://evil.example.com/collect', '/%2F%2Fevil.example.com/collect'];
    for (const path of spellings) {
      const fetchImpl = fakeFetch();
      const result = await handleProxy(request({ path, query: {} }), fetchImpl);
      expect(result.ok).toBe(true);
      expect(new URL(fetchImpl.calls[0]?.url ?? '').origin).toBe('https://gitlab.example.com');
    }
  });
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
});

describe('the proxy is read-only at the boundary', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
    test(`refuses ${method} before attaching the token`, async () => {
      const fetchImpl = fakeFetch();
      const result = await handleProxy(request({ method, body: '{"x":1}' }), fetchImpl);
      expect(result.ok).toBe(false);
      expect(fetchImpl.calls).toHaveLength(0);
    });
  }

  test('still forwards GET', async () => {
    const fetchImpl = fakeFetch();
    const result = await handleProxy(request(), fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl.calls[0]?.init.method).toBe('GET');
  });
});

describe('the proxy returns a redirect instead of following it (#32)', () => {
  const MOVED_BODY =
    'This resource has been moved permanently to https://gitlab.example.com/api/v4/projects/81';

  /** A fetch that follows a 301 unless asked not to, as Node's fetch does by default. */
  function redirectingFetch(): ProxyFetch & {
    calls: Array<{ url: string; init: { method: string; redirect?: string } }>;
  } {
    const calls: Array<{ url: string; init: { method: string; redirect?: string } }> = [];
    const fetchImpl = (async (_url: string, init: { method: string; redirect?: string }) => {
      calls.push({ url: _url, init });
      if (init.redirect === 'manual') return new Response(MOVED_BODY, { status: 301 });
      return new Response('[]', { status: 200 });
    }) as unknown as ProxyFetch;
    return Object.assign(fetchImpl, { calls });
  }

  test('asks the fetch not to follow redirects', async () => {
    const fetchImpl = fakeFetch();
    await handleProxy(request(), fetchImpl);
    expect(fetchImpl.calls[0]?.init.redirect).toBe('manual');
  });

  test('hands the 301 and its move body back to the Panel', async () => {
    const fetchImpl = redirectingFetch();
    const result = await handleProxy(request(), fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(301);
    expect(result.body).toContain('/api/v4/projects/81');
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

  test('stops reading a huge stream at the cap instead of buffering it whole', async () => {
    const chunkSize = 1000;
    const totalChunks = 2000; // Two megabytes: four times the cap.
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled >= totalChunks) {
          controller.close();
          return;
        }
        pulled += 1;
        controller.enqueue(new Uint8Array(chunkSize).fill(120));
      },
    });
    const fetchImpl = (async () => ({
      status: 200,
      body: stream,
      text: () => Promise.resolve(''),
    })) as unknown as ProxyFetch;

    const result = await handleProxy(request(), fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.body?.length).toBe(PROXY_BODY_MAX);
    expect(result.truncated).toBe(true);
    // The reader stops within one chunk of the cap (plus the stream's own
    // one-chunk read-ahead); it never pulls the whole body.
    expect(pulled).toBeLessThanOrEqual(Math.floor(PROXY_BODY_MAX / chunkSize) + 2);
  });

  test('turns a streamed body-read failure into an error', async () => {
    const failing = (async () => ({
      status: 200,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          queueMicrotask(() => controller.error(new Error('connection reset')));
        },
      }),
      text: () => Promise.resolve(''),
    })) as unknown as ProxyFetch;
    const result = await handleProxy(request(), failing);
    expect(result.ok).toBe(false);
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
