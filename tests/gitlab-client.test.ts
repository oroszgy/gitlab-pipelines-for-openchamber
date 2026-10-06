import { describe, expect, test } from 'bun:test';
import {
  bridgesRequest,
  cancelJob,
  cancelJobRequest,
  cancelPipeline,
  cancelPipelineRequest,
  fetchBridges,
  fetchJobs,
  fetchPipelines,
  fetchProject,
  fetchTokenScopes,
  fetchTrace,
  fetchTraceRange,
  forceCancelJob,
  jobsRequest,
  mapHttpStatus,
  newRequestCache,
  nextPageFromLink,
  parseMoveTarget,
  parseRetryAfterMs,
  pipelinesRequest,
  playJob,
  playJobRequest,
  projectBase,
  projectFromRedirectTarget,
  projectRequest,
  retryJob,
  retryJobRequest,
  retryPipeline,
  retryPipelineRequest,
  tokenScopesRequest,
  traceRequest,
  triggerPipeline,
  triggerPipelineRequest,
  TRACE_BYTE_LIMIT,
  utf8Length,
  type Requester,
} from '../panel/gitlab-client';

describe('path and query construction', () => {
  test('encodes the project path', () => {
    expect(projectBase('group/subgroup/project')).toBe(
      '/api/v4/projects/group%2Fsubgroup%2Fproject',
    );
  });

  test('branch scope filters by ref, newest first', () => {
    expect(pipelinesRequest('group/project', { scope: 'branch', ref: 'feature/x' })).toEqual({
      path: '/api/v4/projects/group%2Fproject/pipelines',
      query: { per_page: '20', ref: 'feature/x' },
    });
  });

  test('all-refs scope orders by most recently updated and omits the ref filter', () => {
    const built = pipelinesRequest('group/project', { scope: 'all', ref: 'main' });
    expect(built.query.ref).toBeUndefined();
    expect(built.query).toEqual({ per_page: '20', order_by: 'updated_at', sort: 'desc' });
  });

  test('branch scope without a ref degrades to no filter', () => {
    expect(pipelinesRequest('group/project', { scope: 'branch', ref: null }).query.ref).toBeUndefined();
  });

  test('a later page adds the page query; page 1 omits it', () => {
    expect(pipelinesRequest('g/p', { scope: 'branch', ref: 'main', page: 3 }).query).toEqual({
      per_page: '20',
      ref: 'main',
      page: '3',
    });
    expect(pipelinesRequest('g/p', { scope: 'branch', ref: 'main', page: 1 }).query.page).toBeUndefined();
  });

  test('a trace range adds byte_offset and byte_limit', () => {
    expect(traceRequest('g/p', 34, { offset: 100, limit: 256_000 })).toEqual({
      path: '/api/v4/projects/g%2Fp/jobs/34/trace',
      query: { byte_offset: '100', byte_limit: '256000' },
    });
  });

  test('jobs and trace paths', () => {
    expect(jobsRequest('g/p', 12)).toEqual({
      path: '/api/v4/projects/g%2Fp/pipelines/12/jobs',
      query: { per_page: '100' },
    });
    expect(traceRequest('g/p', 34)).toEqual({
      path: '/api/v4/projects/g%2Fp/jobs/34/trace',
      query: {},
    });
  });

  test('bridges path asks for a full page', () => {
    expect(bridgesRequest('g/p', 12)).toEqual({
      path: '/api/v4/projects/g%2Fp/pipelines/12/bridges',
      query: { per_page: '100' },
    });
  });
});

describe('mapHttpStatus', () => {
  test('success is null', () => {
    expect(mapHttpStatus(200)).toBeNull();
    expect(mapHttpStatus(204)).toBeNull();
  });
  test('a missing token is unauthorized; a refused one is forbidden', () => {
    expect(mapHttpStatus(401)).toEqual({ kind: 'unauthorized' });
    expect(mapHttpStatus(403)).toEqual({ kind: 'forbidden' });
  });
  test('not found', () => {
    expect(mapHttpStatus(404)).toEqual({ kind: 'not-found' });
  });
  test('anything else is a generic http failure', () => {
    expect(mapHttpStatus(500)).toEqual({ kind: 'http', status: 500 });
  });
  test('the redirect statuses are redirects, not generic failures', () => {
    for (const status of [301, 302, 303, 307, 308]) {
      expect(mapHttpStatus(status)).toEqual({ kind: 'redirect', target: null });
    }
  });
  test('300 and 304 are not redirects', () => {
    expect(mapHttpStatus(300)).toEqual({ kind: 'http', status: 300 });
    expect(mapHttpStatus(304)).toEqual({ kind: 'http', status: 304 });
  });
});

describe('mapHttpStatus for a rate limit', () => {
  test('429 is its own kind, with Retry-After in delta-seconds', () => {
    expect(mapHttpStatus(429, { 'retry-after': '30' })).toEqual({
      kind: 'rate-limited',
      retryAfterMs: 30_000,
    });
  });

  test('429 with an HTTP-date Retry-After is measured from now', () => {
    const now = Date.parse('2026-09-30T12:00:00Z');
    expect(mapHttpStatus(429, { 'retry-after': 'Wed, 30 Sep 2026 12:00:45 GMT' }, now)).toEqual({
      kind: 'rate-limited',
      retryAfterMs: 45_000,
    });
  });

  test('429 without a usable Retry-After carries null', () => {
    expect(mapHttpStatus(429)).toEqual({ kind: 'rate-limited', retryAfterMs: null });
    expect(mapHttpStatus(429, { 'retry-after': 'soon' })).toEqual({
      kind: 'rate-limited',
      retryAfterMs: null,
    });
  });

  test('parseRetryAfterMs floors a past date at zero', () => {
    const now = Date.parse('2026-09-30T12:00:00Z');
    expect(parseRetryAfterMs('Wed, 30 Sep 2026 11:59:00 GMT', now)).toBe(0);
    expect(parseRetryAfterMs(null, now)).toBeNull();
  });
});

describe('nextPageFromLink', () => {
  test('reads the page named by rel="next"', () => {
    const link =
      '<https://gitlab.com/api/v4/projects/1/pipelines?page=2&per_page=20>; rel="next", ' +
      '<https://gitlab.com/api/v4/projects/1/pipelines?page=9&per_page=20>; rel="last"';
    expect(nextPageFromLink(link)).toBe(2);
  });

  test('no next link means no more pages', () => {
    const link =
      '<https://gitlab.com/api/v4/projects/1/pipelines?page=1&per_page=20>; rel="first", ' +
      '<https://gitlab.com/api/v4/projects/1/pipelines?page=1&per_page=20>; rel="last"';
    expect(nextPageFromLink(link)).toBeNull();
  });

  test('an absent or malformed header is null, never an error', () => {
    expect(nextPageFromLink(null)).toBeNull();
    expect(nextPageFromLink(undefined)).toBeNull();
    expect(nextPageFromLink('')).toBeNull();
    expect(nextPageFromLink('not a link header')).toBeNull();
    expect(nextPageFromLink('<not a url>; rel="next"')).toBeNull();
  });
});

describe('parseMoveTarget', () => {
  const movedTo = (url: string) => `This resource has been moved permanently to ${url}`;

  test('reads the target URL out of the documented sentence', () => {
    expect(
      parseMoveTarget(movedTo('https://gitlab.example.com/api/v4/projects/81')),
    ).toBe('https://gitlab.example.com/api/v4/projects/81');
  });

  test('tolerates an http target and surrounding noise', () => {
    expect(
      parseMoveTarget(`\n ${movedTo('http://gitlab.example.com/api/v4/projects/group%2Fproject')}\n`),
    ).toBe('http://gitlab.example.com/api/v4/projects/group%2Fproject');
  });

  test('a body that is not the documented move yields null', () => {
    expect(parseMoveTarget('<html>Sign in</html>')).toBeNull();
    expect(parseMoveTarget('')).toBeNull();
    expect(parseMoveTarget('This resource has been moved permanently to ')).toBeNull();
  });
});

describe('the trace truncation signal', () => {
  test('passes the service truncation flag through', async () => {
    const requester: Requester = async () => ({ status: 200, body: 'log', truncated: true });
    const result = await fetchTrace(requester, 'g/p', 34);
    expect(result).toEqual({ ok: true, data: 'log', truncated: true });
  });

  test('leaves it absent when the service did not report it', async () => {
    const requester: Requester = async () => ({ status: 200, body: 'log' });
    const result = await fetchTrace(requester, 'g/p', 34);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.truncated).toBeUndefined();
  });
});

describe('clientFailureFromError', () => {
  test('maps the no-token service error to its own kind', async () => {
    const noToken: Requester = () => {
      const error = new Error('no token') as Error & { code: string };
      error.code = 'no-token';
      throw error;
    };
    expect(await fetchPipelines(noToken, 'g/p', { scope: 'all' })).toEqual({
      ok: false,
      failure: { kind: 'no-token' },
    });
  });

  test('maps a service grant error to the service kind', async () => {
    const noService: Requester = () => {
      const error = new Error('no service') as Error & { code: string };
      error.code = 'NO_SERVICE';
      throw error;
    };
    expect(await fetchPipelines(noService, 'g/p', { scope: 'all' })).toEqual({
      ok: false,
      failure: { kind: 'service' },
    });
  });
});

describe('fetchPipelines over a requester', () => {
  const requester =
    (handler: (request: Parameters<Requester>[0]) => { status: number; body: string }): Requester =>
    async (request) => handler(request);

  test('passes its request through to the requester unchanged', async () => {
    // The client must not reach into the transport: the requester sees the built path and query.
    const seen: Array<Parameters<Requester>[0]> = [];
    const capture: Requester = async (request) => {
      seen.push(request);
      return { status: 200, body: '[]' };
    };
    await fetchPipelines(capture, 'g/p', { scope: 'branch', ref: 'feature/x' });
    expect(seen[0]).toEqual({
      method: 'GET',
      path: '/api/v4/projects/g%2Fp/pipelines',
      query: { per_page: '20', ref: 'feature/x' },
    });
  });

  test('parses a JSON body into a page', async () => {
    const result = await fetchPipelines(
      requester(() => ({ status: 200, body: JSON.stringify([{ id: 1, status: 'success' }]) })),
      'g/p',
      { scope: 'all' },
    );
    if (!result.ok) throw new Error('expected success');
    expect(result.data.pipelines).toMatchObject([{ id: 1, status: 'success' }]);
    expect(result.data.nextPage).toBeNull();
  });

  test('maps a forbidden status', async () => {
    const result = await fetchPipelines(requester(() => ({ status: 403, body: '{}' })), 'g/p', {
      scope: 'all',
    });
    expect(result).toEqual({ ok: false, failure: { kind: 'forbidden' } });
  });

  test('maps an unexpected transport failure to network', async () => {
    const failing: Requester = () => {
      throw new Error('socket hang up');
    };
    expect(await fetchPipelines(failing, 'g/p', { scope: 'all' })).toEqual({
      ok: false,
      failure: { kind: 'network' },
    });
  });

  test('maps an unparseable success body', async () => {
    expect(await fetchPipelines(requester(() => ({ status: 200, body: 'not json' })), 'g/p', {
      scope: 'all',
    })).toEqual({
      ok: false,
      failure: { kind: 'http', status: 200 },
    });
  });

  test('every redirect status carries the target parsed from its body', async () => {
    const body =
      'This resource has been moved permanently to https://gitlab.example.com/api/v4/projects/81';
    for (const status of [301, 302, 303, 307, 308]) {
      const result = await fetchPipelines(requester(() => ({ status, body })), 'g/p', {
        scope: 'all',
      });
      expect(result).toEqual({
        ok: false,
        failure: {
          kind: 'redirect',
          target: 'https://gitlab.example.com/api/v4/projects/81',
        },
      });
    }
  });

  test('a redirect with an unrecognised body carries no target', async () => {
    const result = await fetchPipelines(
      requester(() => ({ status: 302, body: '<html>Sign in</html>' })),
      'g/p',
      { scope: 'all' },
    );
    expect(result).toEqual({ ok: false, failure: { kind: 'redirect', target: null } });
  });
});

describe('projectFromRedirectTarget', () => {
  const HOST = 'gitlab.example.com';

  test('reads a project-root target', () => {
    expect(projectFromRedirectTarget(`https://${HOST}/api/v4/projects/81`, HOST)).toBe('81');
  });

  test('drops a sub-resource path and query, keeping only the project', () => {
    // GitLab names the full resource location it was asked for, not the project
    // root: following it wholesale would seek `81/pipelines` as a project.
    expect(
      projectFromRedirectTarget(
        `https://${HOST}/api/v4/projects/81/pipelines?per_page=100&ref=main`,
        HOST,
      ),
    ).toBe('81');
  });

  test('decodes an encoded project path in the target', () => {
    expect(
      projectFromRedirectTarget(
        `https://${HOST}/api/v4/projects/group%2Fsubgroup%2Fproject/pipelines`,
        HOST,
      ),
    ).toBe('group/subgroup/project');
  });

  test('refuses a target on another host', () => {
    expect(
      projectFromRedirectTarget('https://evil.example.com/api/v4/projects/81', HOST),
    ).toBeNull();
  });

  test('refuses a target that names no project', () => {
    expect(projectFromRedirectTarget(`https://${HOST}/api/v4/projects/`, HOST)).toBeNull();
  });
});

describe('fetchJobs and fetchTrace', () => {
  const requester =
    (handler: (request: Parameters<Requester>[0]) => { status: number; body: string }): Requester =>
    async (request) => handler(request);

  test('fetchJobs parses an array', async () => {
    const result = await fetchJobs(
      requester(() => ({ status: 200, body: JSON.stringify([{ id: 7, stage: 'test' }]) })),
      'g/p',
      1,
    );
    if (!result.ok) throw new Error('expected success');
    expect(result.data).toMatchObject([{ id: 7, stage: 'test' }]);
  });

  test('a missing trace is an empty log, not an error', async () => {
    const result = await fetchTrace(requester(() => ({ status: 404, body: '' })), 'g/p', 9);
    expect(result).toEqual({ ok: true, data: '' });
  });

  test('a trace body is returned as text', async () => {
    const result = await fetchTrace(
      requester(() => ({ status: 200, body: 'line one\nline two\n' })),
      'g/p',
      9,
    );
    expect(result).toEqual({ ok: true, data: 'line one\nline two\n' });
  });
});

describe('fetchBridges over a requester', () => {
  const requester =
    (handler: (request: Parameters<Requester>[0]) => { status: number; body: string }): Requester =>
    async (request) => handler(request);

  test('reads a bridge payload, including its downstream pipeline', async () => {
    const payload = [
      {
        id: 5,
        name: 'deploy',
        stage: 'deploy',
        status: 'success',
        web_url: 'https://gitlab.com/group/project/-/jobs/5',
        downstream_pipeline: { id: 42, iid: 3, project_id: 7, status: 'failed' },
      },
      {
        id: 6,
        name: 'trigger',
        stage: 'deploy',
        status: 'pending',
        web_url: 'https://gitlab.com/group/project/-/jobs/6',
        downstream_pipeline: null,
      },
    ];
    const result = await fetchBridges(
      requester(() => ({ status: 200, body: JSON.stringify(payload) })),
      'g/p',
      12,
    );
    if (!result.ok) throw new Error('expected success');
    expect(result.data).toHaveLength(2);
    expect(result.data[0]?.downstream_pipeline?.status).toBe('failed');
    expect(result.data[1]?.downstream_pipeline).toBeNull();
  });

  test('maps its failures exactly as the other fetches do', async () => {
    expect(await fetchBridges(requester(() => ({ status: 401, body: '' })), 'g/p', 12)).toEqual({
      ok: false,
      failure: { kind: 'unauthorized' },
    });
    expect(await fetchBridges(requester(() => ({ status: 403, body: '' })), 'g/p', 12)).toEqual({
      ok: false,
      failure: { kind: 'forbidden' },
    });
    expect(await fetchBridges(requester(() => ({ status: 404, body: '' })), 'g/p', 12)).toEqual({
      ok: false,
      failure: { kind: 'not-found' },
    });
    const noToken: Requester = () => {
      const error = new Error('no token') as Error & { code: string };
      error.code = 'no-token';
      throw error;
    };
    expect(await fetchBridges(noToken, 'g/p', 12)).toEqual({
      ok: false,
      failure: { kind: 'no-token' },
    });
    const failing: Requester = () => {
      throw new Error('socket hang up');
    };
    expect(await fetchBridges(failing, 'g/p', 12)).toEqual({
      ok: false,
      failure: { kind: 'network' },
    });
    expect(await fetchBridges(requester(() => ({ status: 200, body: 'not json' })), 'g/p', 12)).toEqual(
      { ok: false, failure: { kind: 'http', status: 200 } },
    );
  });
});

describe('project and token reads', () => {
  const requester =
    (handler: (request: Parameters<Requester>[0]) => { status: number; body: string }): Requester =>
    async (request) => handler(request);

  test('reads the project detail path and keeps permissions and the cancel role', async () => {
    const seen: Array<Parameters<Requester>[0]> = [];
    const capture: Requester = async (request) => {
      seen.push(request);
      return {
        status: 200,
        body: JSON.stringify({
          id: 7,
          permissions: { project_access: { access_level: 30 } },
          ci_restrict_pipeline_cancellation_role: 'maintainer',
        }),
      };
    };
    const result = await fetchProject(capture, 'g/p');
    if (!result.ok) throw new Error('expected success');
    expect(seen[0]).toEqual({ method: 'GET', path: '/api/v4/projects/g%2Fp', query: {} });
    expect(result.data.permissions?.project_access?.access_level).toBe(30);
    expect(result.data.ci_restrict_pipeline_cancellation_role).toBe('maintainer');
  });

  test('reads the token scopes from the self route', async () => {
    const seen: Array<Parameters<Requester>[0]> = [];
    const capture: Requester = async (request) => {
      seen.push(request);
      return { status: 200, body: JSON.stringify({ scopes: ['read_api', 'api'] }) };
    };
    const result = await fetchTokenScopes(capture);
    if (!result.ok) throw new Error('expected success');
    expect(seen[0]).toEqual({ method: 'GET', path: '/api/v4/personal_access_tokens/self', query: {} });
    expect(result.data.scopes).toEqual(['read_api', 'api']);
  });

  test('a refused self route is a failure the caller reads as unknown', async () => {
    const result = await fetchTokenScopes(requester(() => ({ status: 403, body: '' })));
    expect(result).toEqual({ ok: false, failure: { kind: 'forbidden' } });
  });
});

describe('write requests', () => {
  test('each action builds the documented path', () => {
    expect(retryJobRequest('g/p', 9)).toEqual({ path: '/api/v4/projects/g%2Fp/jobs/9/retry', query: {} });
    expect(playJobRequest('g/p', 9)).toEqual({ path: '/api/v4/projects/g%2Fp/jobs/9/play', query: {} });
    expect(cancelJobRequest('g/p', 9)).toEqual({ path: '/api/v4/projects/g%2Fp/jobs/9/cancel', query: {} });
    expect(retryPipelineRequest('g/p', 10)).toEqual({
      path: '/api/v4/projects/g%2Fp/pipelines/10/retry',
      query: {},
    });
    expect(cancelPipelineRequest('g/p', 10)).toEqual({
      path: '/api/v4/projects/g%2Fp/pipelines/10/cancel',
      query: {},
    });
    expect(triggerPipelineRequest('g/p', 'feature/x')).toEqual({
      path: '/api/v4/projects/g%2Fp/pipeline',
      query: { ref: 'feature/x' },
    });
    expect(projectRequest('g/p')).toEqual({ path: '/api/v4/projects/g%2Fp', query: {} });
    expect(tokenScopesRequest()).toEqual({ path: '/api/v4/personal_access_tokens/self', query: {} });
  });

  const capture = () => {
    const seen: Array<Parameters<Requester>[0]> = [];
    const requester: Requester = async (request) => {
      seen.push(request);
      return { status: 201, body: '{"id":1}' };
    };
    return { seen, requester };
  };

  test('retry, play and pipeline actions send a POST with no body', async () => {
    const a = capture();
    await retryJob(a.requester, 'g/p', 9);
    await playJob(a.requester, 'g/p', 9);
    await retryPipeline(a.requester, 'g/p', 10);
    await cancelPipeline(a.requester, 'g/p', 10);
    expect(a.seen.map((request) => request.method)).toEqual(['POST', 'POST', 'POST', 'POST']);
    expect(a.seen.every((request) => request.body == null)).toBe(true);
  });

  test('plain cancel sends no body; force cancel sends the flag', async () => {
    const plain = capture();
    await cancelJob(plain.requester, 'g/p', 9);
    expect(plain.seen[0]?.body).toBeUndefined();
    const forced = capture();
    await forceCancelJob(forced.requester, 'g/p', 9);
    expect(forced.seen[0]?.body).toBe(JSON.stringify({ force: true }));
  });

  test('trigger sends the ref as a query', async () => {
    const c = capture();
    await triggerPipeline(c.requester, 'g/p', 'main');
    expect(c.seen[0]).toEqual({
      method: 'POST',
      path: '/api/v4/projects/g%2Fp/pipeline',
      query: { ref: 'main' },
    });
  });

  test('a write reports success by status and maps failures', async () => {
    const ok: Requester = async () => ({ status: 201, body: '{"id":1}' });
    expect(await retryJob(ok, 'g/p', 9)).toEqual({ ok: true, status: 201 });
    const refused: Requester = async () => ({ status: 403, body: '' });
    expect(await retryJob(refused, 'g/p', 9)).toEqual({ ok: false, failure: { kind: 'forbidden' } });
    const gone: Requester = async () => ({ status: 404, body: '' });
    expect(await cancelPipeline(gone, 'g/p', 10)).toEqual({ ok: false, failure: { kind: 'not-found' } });
  });
});

describe('conditional GET reuses unchanged data', () => {
  test('sends If-None-Match and reuses the cached body on a 304', async () => {
    const cache = newRequestCache();
    const seen: Array<Parameters<Requester>[0]> = [];
    let calls = 0;
    const requester: Requester = async (request) => {
      seen.push(request);
      calls += 1;
      if (calls === 1) {
        return { status: 200, body: JSON.stringify([{ id: 1 }]), headers: { etag: 'W/"abc"' } };
      }
      return { status: 304, body: '', headers: { etag: 'W/"abc"' } };
    };

    const first = await fetchPipelines(requester, 'g/p', { scope: 'all' }, cache);
    const second = await fetchPipelines(requester, 'g/p', { scope: 'all' }, cache);

    if (!first.ok || !second.ok) throw new Error('expected success');
    expect(first.data.pipelines).toMatchObject([{ id: 1 }]);
    expect(second.data.pipelines).toMatchObject([{ id: 1 }]);
    expect(seen[0]?.headers).toBeUndefined();
    expect(seen[1]?.headers).toEqual({ 'if-none-match': 'W/"abc"' });
  });

  test('a 200 with no ETag is a plain fetch next time', async () => {
    const cache = newRequestCache();
    const seen: Array<Parameters<Requester>[0]> = [];
    const requester: Requester = async (request) => {
      seen.push(request);
      return { status: 200, body: JSON.stringify([]) };
    };
    await fetchPipelines(requester, 'g/p', { scope: 'all' }, cache);
    await fetchPipelines(requester, 'g/p', { scope: 'all' }, cache);
    expect(seen[1]?.headers).toBeUndefined();
  });

  test('304 is not a failure and a settled Trace reuses its body', async () => {
    const cache = newRequestCache();
    let calls = 0;
    const requester: Requester = async (request) => {
      calls += 1;
      if (request.path.endsWith('/trace')) {
        if (calls === 1) return { status: 200, body: 'the log', headers: { etag: 'W/"t"' } };
        return { status: 304, body: '' };
      }
      return { status: 200, body: '[]' };
    };
    const first = await fetchTrace(requester, 'g/p', 9, cache);
    const second = await fetchTrace(requester, 'g/p', 9, cache);
    expect(first).toEqual({ ok: true, data: 'the log' });
    expect(second).toEqual({ ok: true, data: 'the log' });
  });

  test('the Jobs and bridges lists are cached too', async () => {
    const cache = newRequestCache();
    const seen: Array<Parameters<Requester>[0]> = [];
    let calls = 0;
    const requester: Requester = async (request) => {
      seen.push(request);
      calls += 1;
      if (calls === 1) return { status: 200, body: '[]', headers: { etag: 'W/"j"' } };
      return { status: 304, body: '' };
    };
    await fetchJobs(requester, 'g/p', 12, cache);
    await fetchJobs(requester, 'g/p', 12, cache);
    await fetchBridges(requester, 'g/p', 12, cache);
    expect(seen[1]?.headers?.['if-none-match']).toBe('W/"j"');
    // A different endpoint is a different key, so it is a plain first fetch.
    expect(seen[2]?.headers).toBeUndefined();
  });
});

describe('fetchTraceRange', () => {
  test('asks from the offset with the byte limit, and advances the offset', async () => {
    const seen: Array<Parameters<Requester>[0]> = [];
    const requester: Requester = async (request) => {
      seen.push(request);
      return { status: 200, body: 'hello' };
    };
    const result = await fetchTraceRange(requester, 'g/p', 9, 100);
    expect(seen[0]?.query).toEqual({ byte_offset: '100', byte_limit: String(TRACE_BYTE_LIMIT) });
    expect(result).toEqual({ ok: true, data: { text: 'hello', nextOffset: 105, more: false } });
  });

  test('a service-truncated window means more remains', async () => {
    const requester: Requester = async () => ({ status: 200, body: 'part', truncated: true });
    const result = await fetchTraceRange(requester, 'g/p', 9, 0);
    expect(result.ok && result.data.more).toBe(true);
  });

  test('a window that fills the limit means more may remain', async () => {
    const body = 'x'.repeat(10);
    const requester: Requester = async () => ({ status: 200, body });
    const result = await fetchTraceRange(requester, 'g/p', 9, 0, 10);
    expect(result.ok && result.data.more).toBe(true);
    expect(result.ok && result.data.nextOffset).toBe(10);
  });

  test('a short window stops the loop', async () => {
    const requester: Requester = async () => ({ status: 200, body: 'short' });
    const result = await fetchTraceRange(requester, 'g/p', 9, 0, 10);
    expect(result.ok && result.data.more).toBe(false);
  });

  test('a missing trace is an empty window, not an error', async () => {
    const requester: Requester = async () => ({ status: 404, body: '' });
    const result = await fetchTraceRange(requester, 'g/p', 9, 40);
    expect(result).toEqual({ ok: true, data: { text: '', nextOffset: 40, more: false } });
  });

  test('utf8Length counts bytes, not code units', () => {
    expect(utf8Length('abc')).toBe(3);
    expect(utf8Length('é')).toBe(2);
  });
});
