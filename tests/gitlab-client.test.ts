import { describe, expect, test } from 'bun:test';
import {
  fetchJobs,
  fetchPipelines,
  fetchTrace,
  isDisconnectedError,
  jobsRequest,
  mapHttpStatus,
  pipelinesRequest,
  projectBase,
  traceRequest,
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
});

describe('isDisconnectedError', () => {
  test('matches the host error code', () => {
    expect(isDisconnectedError({ code: 'DISCONNECTED' })).toBe(true);
    expect(isDisconnectedError(new Error('nope'))).toBe(false);
    expect(isDisconnectedError(null)).toBe(false);
  });
});

describe('fetchPipelines over the port', () => {
  test('parses a JSON body', async () => {
    const host = new FakeHost();
    host.handler = () => ({ status: 200, body: JSON.stringify([{ id: 1, status: 'success' }]) });
    const result = await fetchPipelines(host, 'g/p', { scope: 'all' });
    if (!result.ok) throw new Error('expected success');
    expect(result.data).toMatchObject([{ id: 1, status: 'success' }]);
  });

  test('maps an unauthorised status', async () => {
    const host = new FakeHost();
    host.handler = () => ({ status: 403, body: '{}' });
    const result = await fetchPipelines(host, 'g/p', { scope: 'all' });
    expect(result).toEqual({ ok: false, failure: { kind: 'unauthorized' } });
  });

  test('maps a disconnected host error', async () => {
    const host = new FakeHost();
    host.handler = () => {
      const error = new Error('disconnected') as Error & { code: string };
      error.code = 'DISCONNECTED';
      throw error;
    };
    const result = await fetchPipelines(host, 'g/p', { scope: 'all' });
    expect(result).toEqual({ ok: false, failure: { kind: 'disconnected' } });
  });

  test('maps an unexpected transport failure to network', async () => {
    const host = new FakeHost();
    host.handler = () => {
      throw new Error('socket hang up');
    };
    expect(await fetchPipelines(host, 'g/p', { scope: 'all' })).toEqual({
      ok: false,
      failure: { kind: 'network' },
    });
  });

  test('maps an unparseable success body', async () => {
    const host = new FakeHost();
    host.handler = () => ({ status: 200, body: 'not json' });
    expect(await fetchPipelines(host, 'g/p', { scope: 'all' })).toEqual({
      ok: false,
      failure: { kind: 'http', status: 200 },
    });
  });
});

describe('fetchJobs and fetchTrace', () => {
  test('fetchJobs parses an array', async () => {
    const host = new FakeHost();
    host.handler = () => ({ status: 200, body: JSON.stringify([{ id: 7, stage: 'test' }]) });
    const result = await fetchJobs(host, 'g/p', 1);
    if (!result.ok) throw new Error('expected success');
    expect(result.data).toMatchObject([{ id: 7, stage: 'test' }]);
  });

  test('a missing trace is an empty log, not an error', async () => {
    const host = new FakeHost();
    host.handler = () => ({ status: 404, body: '' });
    expect(await fetchTrace(host, 'g/p', 9)).toEqual({ ok: true, data: '' });
  });

  test('a trace body is returned as text', async () => {
    const host = new FakeHost();
    host.handler = () => ({ status: 200, body: 'line one\nline two\n' });
    expect(await fetchTrace(host, 'g/p', 9)).toEqual({ ok: true, data: 'line one\nline two\n' });
  });
});
