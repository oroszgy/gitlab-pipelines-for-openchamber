import { describe, expect, test } from 'bun:test';
import {
  MAX_DOWNSTREAM_GENERATIONS,
  canExpand,
  downstreamCount,
  downstreamLabel,
  projectPathFromUrl,
  triggerRows,
} from '../panel/downstream';
import { bridge, downstreamPipeline as downstream } from './fakes';

describe('triggerRows', () => {
  test('a settled bridge with no downstream is ready, carrying its own status', () => {
    const rows = triggerRows([bridge({ status: 'success' })], 'group/project');
    expect(rows[0]).toMatchObject({ state: 'ready', status: 'success', downstream: null });
  });

  test('an unsettled bridge with no downstream is starting', () => {
    const rows = triggerRows([bridge({ status: 'pending' })], 'group/project');
    expect(rows[0]).toMatchObject({ state: 'starting', status: 'pending' });
    expect(triggerRows([bridge({ status: 'running' })], 'group/project')[0]?.state).toBe('starting');
  });

  test('a failed bridge with no downstream could not start', () => {
    const rows = triggerRows([bridge({ status: 'failed' })], 'group/project');
    expect(rows[0]).toMatchObject({ state: 'could-not-start', status: 'failed' });
  });

  test('a bridge with a downstream is ready and carries the downstream status', () => {
    const pipe = downstream({ status: 'failed' });
    const rows = triggerRows([bridge({ status: 'success', downstream_pipeline: pipe })], 'group/project');
    expect(rows[0]).toMatchObject({ state: 'ready', status: 'failed' });
    expect(rows[0]?.downstream).toBe(pipe);
  });

  test('keeps identity, name and stage, and tolerates an empty list', () => {
    const rows = triggerRows([bridge({ id: 9, name: 'fan out', stage: 'trigger' })], 'group/project');
    expect(rows[0]).toMatchObject({ id: 9, name: 'fan out', stage: 'trigger' });
    expect(triggerRows([], 'group/project')).toEqual([]);
    expect(triggerRows(undefined, 'group/project')).toEqual([]);
  });
});

describe('downstreamLabel', () => {
  test('a same-project pipeline is a child pipeline', () => {
    const pipe = downstream({ web_url: 'https://gitlab.com/group/project/-/pipelines/42' });
    expect(downstreamLabel(pipe, 'group/project')).toBe('child pipeline');
  });

  test('a same-project pipeline with subgroups still reads as the child', () => {
    const pipe = downstream({ web_url: 'https://gitlab.com/group/sub/project/-/pipelines/42' });
    expect(downstreamLabel(pipe, 'group/sub/project')).toBe('child pipeline');
  });

  test('another project is labelled with its path', () => {
    const pipe = downstream({ web_url: 'https://gitlab.com/other/project/-/pipelines/42' });
    expect(downstreamLabel(pipe, 'group/project')).toBe('other/project');
  });

  test('an unparseable URL falls back to project #<id>', () => {
    expect(downstreamLabel(downstream({ web_url: 'not a url' }), 'group/project')).toBe('project #7');
    expect(downstreamLabel(downstream({ web_url: '' }), 'group/project')).toBe('project #7');
    expect(
      downstreamLabel(downstream({ web_url: 'https://gitlab.com/no-pipeline-segment' }), 'group/project'),
    ).toBe('project #7');
  });
});

describe('projectPathFromUrl', () => {
  test('reads the path before the -/ segment, decoding it', () => {
    expect(projectPathFromUrl('https://gitlab.com/group/sub/project/-/pipelines/42')).toBe(
      'group/sub/project',
    );
    expect(projectPathFromUrl('https://gitlab.com/group%2Fsub%2Fproject/-/pipelines/42')).toBe(
      'group/sub/project',
    );
  });
  test('returns null when there is no path to read', () => {
    expect(projectPathFromUrl('')).toBeNull();
    expect(projectPathFromUrl('nope')).toBeNull();
  });
});

describe('downstreamCount', () => {
  test('counts only Trigger rows that started a pipeline', () => {
    expect(
      downstreamCount([
        { downstream: downstream() },
        { downstream: null },
        { downstream: downstream({ id: 43 }) },
      ]),
    ).toBe(2);
    expect(downstreamCount([])).toBe(0);
    expect(downstreamCount(undefined)).toBe(0);
  });
});

describe('canExpand', () => {
  test('expands up to but not including the generation cap', () => {
    expect(canExpand(1)).toBe(true);
    expect(canExpand(2)).toBe(true);
    expect(canExpand(MAX_DOWNSTREAM_GENERATIONS)).toBe(false);
    expect(canExpand(MAX_DOWNSTREAM_GENERATIONS + 1)).toBe(false);
    expect(MAX_DOWNSTREAM_GENERATIONS).toBe(3);
  });
});
