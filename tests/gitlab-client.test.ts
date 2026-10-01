import { describe, expect, test } from 'bun:test';
import {
  fetchJobs,
  fetchPipelines,
  fetchTrace,
  fromHostPort,
  isDisconnectedError,
  jobsRequest,
  mapHttpStatus,
  parseMoveTarget,
  pipelinesRequest,
  projectBase,
  traceRequest,
  type Requester,
} from '../panel/gitlab-client';
import { FakeHost } from './fakes';

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
});

describe('mapHttpStatus', () => {
  test('success is null', () => {
    expect(mapHttpStatus(200)).toBeNull();
    expect(mapHttpStatus(204)).toBeNull();
  });
  test('auth failures', () => {
    expect(mapHttpStatus(401)).toEqual({ kind: 'unauthorized' });
    expect(mapHttpStatus(403)).toEqual({ kind: 'unauthorized' });
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

describe('isDisconnectedError', () => {
  test('matches the host error code', () => {
    expect(isDisconnectedError({ code: 'DISCONNECTED' })).toBe(true);
    expect(isDisconnectedError(new Error('nope'))).toBe(false);
    expect(isDisconnectedError(null)).toBe(false);
  });
});

describe('fetchPipelines over a requester', () => {
  const requester =
    (handler: (request: Parameters<Requester>[0]) => { status: number; body: string }): Requester =>
    async (request) => handler(request);

  test('passes its request through to the requester unchanged', async () => {
    // The client must not reach into the transport: the requester sees the built path and query.
    const host = new FakeHost();
    host.handler = () => ({ status: 200, body: '[]' });
    await fetchPipelines(fromHostPort(host), 'g/p', { scope: 'branch', ref: 'feature/x' });
    expect(host.requests[0]).toEqual({
      method: 'GET',
      path: '/api/v4/projects/g%2Fp/pipelines',
      query: { per_page: '20', ref: 'feature/x' },
    });
  });

  test('parses a JSON body', async () => {
    const result = await fetchPipelines(
      requester(() => ({ status: 200, body: JSON.stringify([{ id: 1, status: 'success' }]) })),
      'g/p',
      { scope: 'all' },
    );
    if (!result.ok) throw new Error('expected success');
    expect(result.data).toMatchObject([{ id: 1, status: 'success' }]);
  });

  test('maps an unauthorised status', async () => {
    const result = await fetchPipelines(requester(() => ({ status: 403, body: '{}' })), 'g/p', {
      scope: 'all',
    });
    expect(result).toEqual({ ok: false, failure: { kind: 'unauthorized' } });
  });

  test('maps a disconnected host error', async () => {
    const disconnected: Requester = () => {
      const error = new Error('disconnected') as Error & { code: string };
      error.code = 'DISCONNECTED';
      throw error;
    };
    const result = await fetchPipelines(disconnected, 'g/p', { scope: 'all' });
    expect(result).toEqual({ ok: false, failure: { kind: 'disconnected' } });
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
