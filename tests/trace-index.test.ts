import { describe, expect, test } from 'bun:test';

import {
  INDEX_CHUNK_CHARS,
  TraceIndexer,
  errorLines,
  findMatches,
  indexTrace,
  lineAtOffset,
  stripAnsi,
  windowFor,
  type IdleScheduler,
} from '../panel/trace-index';

describe('stripAnsi', () => {
  test('removes SGR colour sequences', () => {
    expect(stripAnsi('\u001b[0;32mok\u001b[0m')).toBe('ok');
  });

  test('removes cursor and erase CSI sequences a job log carries', () => {
    expect(stripAnsi('\u001b[0K\u001b[1Gprogress')).toBe('progress');
  });

  test('removes an OSC title sequence', () => {
    expect(stripAnsi('\u001b]0;title\u0007after')).toBe('after');
  });

  test('leaves plain text untouched', () => {
    expect(stripAnsi('plain [text] here')).toBe('plain [text] here');
  });
});

describe('indexTrace', () => {
  test('splits lines and strips ANSI, with a trailing newline as terminator', () => {
    const lines = indexTrace('\u001b[31mone\u001b[0m\ntwo\n');
    expect(lines.map((line) => line.text)).toEqual(['one', 'two']);
    expect(lines[0]!.lower).toBe('one');
  });
});

describe('findMatches', () => {
  const lines = indexTrace('Hello world\nfehler\nHELLO again\n');

  test('is case-insensitive and returns line indices', () => {
    expect(findMatches(lines, 'hello')).toEqual([0, 2]);
  });

  test('an empty query matches nothing', () => {
    expect(findMatches(lines, '')).toEqual([]);
  });

  test('a query with no hit is an empty list, not an error', () => {
    expect(findMatches(lines, 'nope')).toEqual([]);
  });
});

describe('errorLines', () => {
  test('marks the keyword set and leaves clean lines out', () => {
    const lines = indexTrace('building\nERROR: boom\nall fine\nTraceback (most recent call last)\n');
    expect(errorLines(lines)).toEqual([1, 3]);
  });

  test('the last match is the jump target, nearest the failure end', () => {
    const lines = indexTrace('error: first\nmore output\nfatal: second\n');
    const errors = errorLines(lines);
    expect(errors[errors.length - 1]).toBe(2);
  });

  test('a clean log has no error lines', () => {
    expect(errorLines(indexTrace('all green\n'))).toEqual([]);
  });
});

describe('windowFor', () => {
  const heights = Array.from({ length: 100 }, () => 10);

  test('at the top', () => {
    expect(windowFor(heights, 0, 50)).toEqual({ start: 0, end: 5, top: 0, bottom: 950 });
  });

  test('in the middle', () => {
    expect(windowFor(heights, 250, 50)).toEqual({ start: 25, end: 30, top: 250, bottom: 700 });
  });

  test('at the end', () => {
    expect(windowFor(heights, 950, 50)).toEqual({ start: 95, end: 100, top: 950, bottom: 0 });
  });

  test('overscan pads both sides', () => {
    expect(windowFor(heights, 250, 50, 2)).toEqual({ start: 23, end: 32, top: 230, bottom: 680 });
  });

  test('variable heights are measured, not assumed', () => {
    const variable = [30, 10, 10, 30, 10];
    // scrollTop 30 lands on line 1; the viewport reaches to 70, ending after line 3.
    expect(windowFor(variable, 30, 40)).toEqual({ start: 1, end: 4, top: 30, bottom: 10 });
  });

  test('an empty trace has an empty window', () => {
    expect(windowFor([], 0, 300)).toEqual({ start: 0, end: 0, top: 0, bottom: 0 });
  });
});

describe('lineAtOffset', () => {
  test('finds the line containing an offset', () => {
    const heights = [30, 10, 10, 30, 10];
    expect(lineAtOffset(heights, 0)).toBe(0);
    expect(lineAtOffset(heights, 29)).toBe(0);
    expect(lineAtOffset(heights, 30)).toBe(1);
    expect(lineAtOffset(heights, 45)).toBe(2);
    expect(lineAtOffset(heights, 90)).toBe(4);
  });

  test('an empty list has no line', () => {
    expect(lineAtOffset([], 100)).toBe(0);
  });
});

/** A scheduler whose callbacks run only when the test pumps it. */
function manualScheduler(): { scheduler: IdleScheduler; runNext(): void; runAll(): void; pending(): number } {
  const queue = new Map<number, () => void>();
  let next = 1;
  const scheduler: IdleScheduler = {
    request: (callback) => {
      const handle = next++;
      queue.set(handle, callback);
      return handle;
    },
    cancel: (handle) => {
      queue.delete(handle);
    },
  };
  return {
    scheduler,
    pending: () => queue.size,
    runNext: () => {
      const [handle, callback] = [...queue.entries()][0]!;
      queue.delete(handle);
      callback();
    },
    runAll: () => {
      // Callbacks schedule their successor, so drain until none remain.
      while (queue.size > 0) {
        const [handle, callback] = [...queue.entries()][0]!;
        queue.delete(handle);
        callback();
      }
    },
  };
}

describe('TraceIndexer', () => {
  test('builds the index a slice at a time, yielding between slices', () => {
    const pump = manualScheduler();
    const updates: number[] = [];
    const indexer = new TraceIndexer(pump.scheduler, () => updates.push(indexer.lines.length));
    // Two lines longer than the slice budget, so the first slice cannot finish.
    const long = 'x'.repeat(INDEX_CHUNK_CHARS);
    indexer.setText(`${long}\nsecond line\n`);

    expect(indexer.lines).toHaveLength(0);
    expect(indexer.complete).toBe(false);
    pump.runNext();
    expect(indexer.lines).toHaveLength(1);
    expect(indexer.complete).toBe(false);
    pump.runAll();
    expect(indexer.complete).toBe(true);
    expect(indexer.lines.map((line) => line.text)).toEqual([long, 'second line']);
    expect(updates.length).toBeGreaterThan(1);
  });

  test('indexes an appended window from where it stopped', () => {
    const pump = manualScheduler();
    const indexer = new TraceIndexer(pump.scheduler, () => {});
    indexer.setText('one\ntwo\n');
    pump.runAll();
    expect(indexer.lines).toHaveLength(2);

    indexer.setText('one\ntwo\nthree\n');
    pump.runAll();
    expect(indexer.lines.map((line) => line.text)).toEqual(['one', 'two', 'three']);
  });

  test('re-indexes a partial trailing line when it is completed by an append', () => {
    const pump = manualScheduler();
    const indexer = new TraceIndexer(pump.scheduler, () => {});
    indexer.setText('first\nhalf');
    pump.runAll();
    expect(indexer.lines.map((line) => line.text)).toEqual(['first', 'half']);

    indexer.setText('first\nhalf done\nsecond\n');
    pump.runAll();
    expect(indexer.lines.map((line) => line.text)).toEqual(['first', 'half done', 'second']);
  });

  test('a replacement text is indexed from the start', () => {
    const pump = manualScheduler();
    const indexer = new TraceIndexer(pump.scheduler, () => {});
    indexer.setText('old\n');
    pump.runAll();
    indexer.setText('new\ntext\n');
    pump.runAll();
    expect(indexer.lines.map((line) => line.text)).toEqual(['new', 'text']);
  });
});
