import { describe, expect, test } from 'bun:test';
import type { ConfigFs } from '../service/config';
import type { GitConfigFs } from '../service/git-config';
import type { ProxyFetch } from '../service/proxy';
import {
  handleRequest,
  parsePort,
  REQUEST_BODY_MAX,
  type ServiceDeps,
  type ServiceRequest,
} from '../service/server';

type Entry = { content: string; mode: number };

/** A filesystem seam backed by a path → entry map, mirroring the config tests. */
function fakeFs(entries: Record<string, Entry> = {}): ConfigFs {
  return {
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

const gitConfigFs: GitConfigFs = { stat: async () => null, readFile: async () => '' };

function deps(overrides: Partial<ServiceDeps> = {}): ServiceDeps {
  return {
    token: 'svc-token',
    configPath: '/cfg/config.json',
    configFs: fakeFs(),
    gitConfigFs,
    fetchImpl: (async () => new Response('{}')) as unknown as ProxyFetch,
    ...overrides,
  };
}

/** A request the shell can consume, with a bearer and an optional JSON body. */
function request(
  options: { method?: string; path?: string; body?: string; token?: string } = {},
): ServiceRequest {
  const { method = 'GET', path = '/', body = '', token = 'svc-token' } = options;
  const bytes = new TextEncoder().encode(body);
  return {
    method,
    url: path,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    async *[Symbol.asyncIterator]() {
      if (bytes.length) yield bytes;
    },
  };
}

/** A request whose body arrives as many chunks, reporting how many were consumed. */
function streamingRequest(options: {
  method: string;
  path: string;
  chunks: number;
  chunkSize: number;
}): { request: ServiceRequest; consumed: () => number } {
  const { method, path, chunks, chunkSize } = options;
  let consumed = 0;
  const request: ServiceRequest = {
    method,
    url: path,
    headers: { authorization: 'Bearer svc-token' },
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < chunks; i++) {
        consumed += 1;
        yield new Uint8Array(chunkSize).fill(120);
      }
    },
  };
  return { request, consumed: () => consumed };
}

describe('parsing the service port (#42)', () => {
  test('accepts an integer within the valid range', () => {
    expect(parsePort('8080')).toBe(8080);
    expect(parsePort('1')).toBe(1);
    expect(parsePort('65535')).toBe(65535);
  });

  const bad: Array<string | undefined> = [
    undefined,
    '',
    '   ',
    'abc',
    '0',
    '65536',
    '-1',
    '80.5',
    '8080abc',
    '0x10',
  ];

  for (const raw of bad) {
    test(`refuses ${JSON.stringify(raw)} with a clear error`, () => {
      expect(() => parsePort(raw)).toThrow(/OPENCHAMBER_SERVICE_PORT/);
    });
  }
});

describe('the service shell answers authenticated requests', () => {
  test('rejects a request without the bearer', async () => {
    const result = await handleRequest(request({ token: 'wrong' }), deps());
    expect(result.status).toBe(401);
    expect(JSON.parse(result.body)).toEqual({ error: 'unauthorized' });
  });

  test('answers health', async () => {
    const result = await handleRequest(request({ path: '/health' }), deps());
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: 'ok' });
  });

  test('reads the configuration', async () => {
    const result = await handleRequest(request({ path: '/config' }), deps());
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      config: { host: 'gitlab.com', project: '', hasToken: {} },
    });
  });

  test('writes the configuration', async () => {
    const result = await handleRequest(
      request({ method: 'POST', path: '/config', body: JSON.stringify({ host: 'gitlab.example.com' }) }),
      deps(),
    );
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body).config.host).toBe('gitlab.example.com');
  });

  test('answers an unknown route with 404', async () => {
    const result = await handleRequest(request({ path: '/nope' }), deps());
    expect(result.status).toBe(404);
  });

  test('rejects a malformed JSON body with 400', async () => {
    const result = await handleRequest(request({ method: 'POST', path: '/config', body: '{' }), deps());
    expect(result.status).toBe(400);
  });
});

describe('a request body is read within a cap (#42)', () => {
  test('rejects an oversized body with 413 and stops reading it', async () => {
    const chunkSize = 1024;
    const chunks = Math.ceil((REQUEST_BODY_MAX * 4) / chunkSize);
    const { request, consumed } = streamingRequest({
      method: 'POST',
      path: '/config',
      chunks,
      chunkSize,
    });

    const result = await handleRequest(request, deps());
    expect(result.status).toBe(413);
    expect(consumed()).toBeLessThan(chunks);
  });

  test('accepts a body under the cap', async () => {
    const result = await handleRequest(
      request({ method: 'POST', path: '/config', body: JSON.stringify({ host: 'gitlab.com' }) }),
      deps(),
    );
    expect(result.status).toBe(200);
  });
});

describe('an unexpected failure becomes a 500, never a hang (#36)', () => {
  test('a config-file write failure is answered', async () => {
    const failing = fakeFs();
    failing.writeFile = async () => {
      throw new Error('EACCES: permission denied');
    };
    const result = await handleRequest(
      request({ method: 'POST', path: '/config', body: JSON.stringify({ host: 'gitlab.com' }) }),
      deps({ configFs: failing }),
    );
    expect(result.status).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'The service could not complete the request.' });
  });

  test('a directory-create failure is answered', async () => {
    const failing = fakeFs();
    failing.mkdir = async () => {
      throw new Error('EROFS: read-only file system');
    };
    const result = await handleRequest(
      request({ method: 'POST', path: '/token', body: JSON.stringify({ token: 'secret-pat' }) }),
      deps({ configFs: failing }),
    );
    expect(result.status).toBe(500);
  });

  test('leaks neither a filesystem path nor a token', async () => {
    const failing = fakeFs();
    failing.chmod = async () => {
      throw new Error('chmod /secret/config.json failed for token secret-pat');
    };
    const result = await handleRequest(
      request({ method: 'POST', path: '/config', body: JSON.stringify({ host: 'gitlab.com' }) }),
      deps({ configFs: failing }),
    );
    expect(result.body).not.toContain('/secret/config.json');
    expect(result.body).not.toContain('secret-pat');
  });
});
