/**
 * Everything the log drawer derives from a Job's Trace text, with no DOM.
 *
 * A Trace may be 20 000 lines, so the index is built incrementally, in slices
 * scheduled through an injected {@link IdleScheduler} (the panel passes
 * `requestIdleCallback`; tests drive a deterministic one). Matching, error
 * ranking and window arithmetic are pure and take the indexed lines. See
 * ADR-0012 and `docs/specs/log-drawer.md`.
 */

import { logLines } from './format';

/** One trace line, ready for display and matching. */
export type TraceLine = {
  /** The line with ANSI escape sequences removed. */
  text: string;
  /** `text` lowercased once, for case-insensitive matching. */
  lower: string;
};

/** ANSI CSI sequences: SGR colours and the cursor controls a job log also carries. */
const ANSI_CSI = /\u001b\[[0-?]*[ -/]*[@-~]/g;
/** ANSI OSC sequences (e.g. a window-title set), terminated by BEL or ST. */
const ANSI_OSC = /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g;

/** Remove ANSI escape sequences, so they reach neither the display nor a match. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_CSI, '').replace(ANSI_OSC, '');
}

function toLine(raw: string): TraceLine {
  const text = stripAnsi(raw);
  return { text, lower: text.toLowerCase() };
}

/** Split a Trace into its lines with ANSI stripped. */
export function indexTrace(text: string): TraceLine[] {
  return logLines(text).map(toLine);
}

/**
 * Line indices (into `lines`) whose text contains `query`, case-insensitively.
 * An empty query matches nothing rather than everything.
 */
export function findMatches(lines: readonly TraceLine[], query: string): number[] {
  const needle = query.toLowerCase();
  if (!needle) return [];
  const out: number[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (lines[index]!.lower.includes(needle)) out.push(index);
  }
  return out;
}

/** The keywords that mark a line as part of the failure. */
export const ERROR_KEYWORDS = [
  'error',
  'failed',
  'fatal',
  'panic',
  'traceback',
  'exception',
  'segmentation fault',
  'command not found',
] as const;

/**
 * The ranked error lines, nearest the failure end last. In document order, so
 * the last entry — the one a Jump to error reaches — is the failure's own last
 * words, after any earlier `error` chatter.
 */
export function errorLines(lines: readonly TraceLine[]): number[] {
  const out: number[] = [];
  for (let index = 0; index < lines.length; index++) {
    const lower = lines[index]!.lower;
    if (ERROR_KEYWORDS.some((keyword) => lower.includes(keyword))) out.push(index);
  }
  return out;
}

/** The slice of lines to render, with the spacers that stand in for the rest. */
export type LogWindow = {
  /** First rendered line index (inclusive). */
  start: number;
  /** Last rendered line index (exclusive). */
  end: number;
  /** Height, in pixels, of the lines before `start`. */
  top: number;
  /** Height, in pixels, of the lines from `end` on. */
  bottom: number;
};

/**
 * The index of the line containing `offset` pixels down the list: the last
 * line whose top is at or above `offset`. Used to anchor a fixed-size window.
 */
export function lineAtOffset(heights: readonly number[], offset: number): number {
  let accumulated = 0;
  for (let index = 0; index < heights.length; index++) {
    accumulated += heights[index]!;
    if (accumulated > offset) return index;
  }
  return Math.max(0, heights.length - 1);
}

/**
 * The visible window for variable-height rows: walk the height prefix sums to
 * the first line crossing `scrollTop`, extend past the viewport, then pad by
 * `overscan` lines on each side. Handles the top, middle and end of the list.
 */
export function windowFor(
  heights: readonly number[],
  scrollTop: number,
  viewportHeight: number,
  overscan = 0,
): LogWindow {
  const count = heights.length;
  if (count === 0) return { start: 0, end: 0, top: 0, bottom: 0 };

  const prefix = new Array<number>(count + 1);
  prefix[0] = 0;
  for (let index = 0; index < count; index++) prefix[index + 1] = prefix[index]! + heights[index]!;
  const total = prefix[count]!;

  const top = Math.max(0, scrollTop);
  const bottomEdge = top + Math.max(0, viewportHeight);

  let first = count - 1;
  for (let index = 0; index < count; index++) {
    if (prefix[index + 1]! > top) {
      first = index;
      break;
    }
  }

  let last = first + 1;
  while (last < count && prefix[last]! < bottomEdge) last++;

  const start = Math.max(0, first - overscan);
  const end = Math.min(count, last + overscan);
  return { start, end, top: prefix[start]!, bottom: total - prefix[end]! };
}

/** How a slice of indexing is scheduled, mirroring `requestIdleCallback`. */
export type IdleScheduler = {
  request(callback: () => void): number;
  cancel(handle: number): void;
};

/** Characters turned into lines per idle slice. Bounds a slice's work. */
export const INDEX_CHUNK_CHARS = 16_384;

/**
 * A Trace's line index, built a chunk at a time between idle callbacks. A newly
 * appended window is folded in from where the last slice stopped, so a live
 * Trace never re-indexes what it already holds. `onUpdate` fires after each
 * slice and once more when the text is fully indexed.
 */
export class TraceIndexer {
  private text = '';
  /** Characters turned into complete lines so far. */
  private consumed = 0;
  /** Where the last indexed line began, so an appended partial line is redone. */
  private lastLineStart = 0;
  private readonly built: TraceLine[] = [];
  private handle: number | null = null;
  private stopped = false;

  constructor(
    private readonly scheduler: IdleScheduler,
    private readonly onUpdate: () => void,
  ) {}

  /** Whether every character of the current text has been indexed. */
  get complete(): boolean {
    return this.consumed >= this.text.length;
  }

  /** The lines indexed so far. */
  get lines(): readonly TraceLine[] {
    return this.built;
  }

  /** The indexed line at `index`, or undefined before it has been reached. */
  lineAt(index: number): TraceLine | undefined {
    return this.built[index];
  }

  /**
   * Adopt `text`: an extension of the held text continues from the boundary, a
   * replacement (or a shorter text) starts again. An unchanged text is a no-op,
   * so a re-render does not disturb the index.
   */
  setText(text: string): void {
    if (text === this.text) return;
    if (text.startsWith(this.text)) {
      // The last indexed line may have been a partial one (the Trace did not end
      // in a newline); an append can lengthen it, so re-index it.
      if (this.built.length > 0 && !this.text.endsWith('\n')) {
        this.consumed = this.lastLineStart;
        this.built.pop();
      }
    } else {
      this.built.length = 0;
      this.consumed = 0;
      this.lastLineStart = 0;
    }
    this.text = text;
    this.schedule();
  }

  find(query: string): number[] {
    return findMatches(this.built, query);
  }

  errors(): number[] {
    return errorLines(this.built);
  }

  dispose(): void {
    this.stopped = true;
    if (this.handle != null) {
      this.scheduler.cancel(this.handle);
      this.handle = null;
    }
  }

  private schedule(): void {
    if (this.stopped || this.handle != null || this.complete) return;
    this.handle = this.scheduler.request(() => {
      this.handle = null;
      this.slice();
    });
  }

  private slice(): void {
    if (this.stopped) return;
    let cursor = this.consumed;
    let processed = 0;
    while (cursor < this.text.length && processed < INDEX_CHUNK_CHARS) {
      const newline = this.text.indexOf('\n', cursor);
      const end = newline === -1 ? this.text.length : newline;
      this.lastLineStart = cursor;
      this.built.push(toLine(this.text.slice(cursor, end)));
      processed += end - cursor + 1;
      cursor = newline === -1 ? this.text.length : newline + 1;
    }
    this.consumed = cursor;
    this.onUpdate();
    this.schedule();
  }
}
