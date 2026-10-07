import { describe, expect, test } from 'bun:test';
import { defaultExpansion } from './defaults';
import { pipeline } from '../tests/fakes';

describe('defaultExpansion', () => {
  test('a remembered Pipeline still in the list wins, even when a newer one is active', () => {
    const pipelines = [
      pipeline({ id: 8, status: 'running' }),
      pipeline({ id: 7, status: 'success' }),
    ];
    expect(defaultExpansion(pipelines, { pipelineId: 7 })).toBe(7);
  });

  test('the newest active Pipeline expands when nothing is remembered', () => {
    const pipelines = [
      pipeline({ id: 9, status: 'success' }),
      pipeline({ id: 8, status: 'failed' }),
      pipeline({ id: 7, status: 'running' }),
      pipeline({ id: 6, status: 'pending' }),
    ];
    expect(defaultExpansion(pipelines, {})).toBe(7);
  });

  test('nothing expands when every Pipeline is settled', () => {
    const pipelines = [
      pipeline({ id: 9, status: 'success' }),
      pipeline({ id: 8, status: 'failed' }),
      pipeline({ id: 7, status: 'canceled' }),
    ];
    expect(defaultExpansion(pipelines, {})).toBeNull();
  });

  test('a stale remembered id falls back to auto-expand', () => {
    const pipelines = [
      pipeline({ id: 9, status: 'success' }),
      pipeline({ id: 8, status: 'running' }),
    ];
    expect(defaultExpansion(pipelines, { pipelineId: 99 })).toBe(8);
  });

  test('a stale remembered id with an all-settled list expands nothing', () => {
    const pipelines = [pipeline({ id: 9, status: 'success' })];
    expect(defaultExpansion(pipelines, { pipelineId: 99 })).toBeNull();
  });
});
