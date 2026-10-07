import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { LOG_MAX_LINES } from '../panel/config';
import { mountPanel } from '../panel/panel';
import { FakeHost, FakeTimers, GIT_CONFIG, flush, job, pipeline, readyContext } from './fakes';

/**
 * The windowed drawer under an emulated real layout: rows wrap at a known
 * characters-per-row, the body has a real height, and `scrollHeight` is the
 * content height. This is what catches a spacer geometry that drifts as rows
 * are measured — the failure the pure DOM (no layout) cannot see.
 */

const BODY_H = 400;
const BODY_W = 300;
const ROW_H = 18;
const CHAR_W = 7;
// The panel derives this from its body width and measured glyph advance:
// floor((300 - 0 padding - 1) / 7).
const CHARS_PER_ROW = Math.floor((BODY_W - 1) / CHAR_W);

function rowHeight(el: Element): number {
  return Math.max(1, Math.ceil((el.textContent ?? '').length / CHARS_PER_ROW)) * ROW_H;
}

let scrollTopValue = 0;
/** When set, the drawer body reports this height instead of BODY_H (to force the fallback). */
let forcedBodyHeight: number | null = null;

/**
 * Patches that shadow prototype members for the emulated layout. Each records its
 * own prior descriptor so teardown can restore it exactly — `scrollHeight`,
 * `scrollTop` and `getBoundingClientRect` live on `Element.prototype`, not
 * `HTMLElement.prototype`, so a naive descriptor lookup would miss them and leak
 * the patch into other test files.
 */
const patches: Array<{ target: object; key: string; own: PropertyDescriptor | undefined }> = [];

function patch(target: object, key: string, descriptor: PropertyDescriptor): void {
  patches.push({ target, key, own: Object.getOwnPropertyDescriptor(target, key) });
  Object.defineProperty(target, key, descriptor);
}

beforeAll(() => {
  patch(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (!this.isConnected || !this.classList.contains('gp-drawer-body')) return 0;
      return forcedBodyHeight ?? BODY_H;
    },
  });
  patch(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.isConnected && this.classList.contains('gp-drawer-body') ? BODY_W : 0;
    },
  });
  patch(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (!this.isConnected || !this.classList.contains('gp-drawer-body')) return 0;
      let height = 0;
      for (const child of Array.from(this.querySelectorAll('.gp-log > *'))) {
        const inline = (child as HTMLElement).style.height;
        height += inline ? Number.parseFloat(inline) || 0 : rowHeight(child);
      }
      return height;
    },
  });
  patch(HTMLElement.prototype, 'scrollTop', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('gp-drawer-body') ? scrollTopValue : 0;
    },
    set(this: HTMLElement, value: number) {
      if (!this.classList.contains('gp-drawer-body')) return;
      const max = Math.max(0, this.scrollHeight - this.clientHeight);
      scrollTopValue = Math.min(Math.max(0, value), max);
    },
  });
  patch(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    writable: true,
    value: function (this: HTMLElement): DOMRect {
      if (this.isConnected && this.classList.contains('gp-log-line')) {
        const height = rowHeight(this);
        return { height, width: BODY_W, top: 0, left: 0, right: BODY_W, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      }
      return { height: 0, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    },
  });
  patch(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: function (this: HTMLCanvasElement): unknown {
      return { font: '', measureText: (text: string) => ({ width: text.length * CHAR_W }) };
    },
  });
});

afterAll(() => {
  for (const { target, key, own } of patches.splice(0).reverse()) {
    if (own) Object.defineProperty(target, key, own);
    else delete (target as Record<string, unknown>)[key];
  }
});

function configuredHost(trace: string): FakeHost {
  const host = new FakeHost();
  host.files.set('.git/config', GIT_CONFIG);
  host.files.set('.git/HEAD', 'ref: refs/heads/main\n');
  host.projects = [{ id: 'p1', name: 'project', directory: '/repo' }];
  host.worktrees = [{ directory: '/repo', name: 'primary', branch: 'main', status: 'ready' }];
  host.tokens['gitlab.com'] = 'pat';
  host.gitlabHandler = (request) => {
    if (request.path.endsWith('/pipelines')) return { status: 200, body: JSON.stringify([pipeline({ id: 7 })]) };
    if (request.path.endsWith('/jobs')) return { status: 200, body: JSON.stringify([job({ id: 9 })]) };
    if (request.path.endsWith('/trace')) return { status: 200, body: trace };
    return { status: 404, body: '' };
  };
  return host;
}

async function openDrawer(host: FakeHost, timers: FakeTimers): Promise<HTMLElement> {
  const root = document.createElement('div');
  document.body.append(root);
  mountPanel(root, host, { timers });
  host.emitReady(readyContext());
  await flush();
  (root.querySelector('.gp-row') as HTMLElement).click();
  await flush();
  (root.querySelector('.gp-job') as HTMLElement).click();
  await flush();
  timers.advance(0);
  return root;
}

/** The vertical extent of the rendered rows inside the drawer's content. */
function renderedExtent(root: HTMLElement): { top: number; bottom: number; contentHeight: number } {
  let top = Number.POSITIVE_INFINITY;
  let bottom = 0;
  let cursor = 0;
  for (const child of Array.from(root.querySelectorAll<HTMLElement>('.gp-log > *'))) {
    const inline = child.style.height;
    const height = inline ? Number.parseFloat(inline) || 0 : rowHeight(child);
    if (child.classList.contains('gp-log-line')) {
      top = Math.min(top, cursor);
      bottom = Math.max(bottom, cursor + height);
    }
    cursor += height;
  }
  return { top, bottom, contentHeight: cursor };
}

describe('the windowed log drawer under real layout', () => {
  const trace = Array.from({ length: 300 }, (_, index) => `line ${index + 1} ${'x'.repeat(70)}`).join('\n');

  test('the spacer geometry does not drift as rows are measured', async () => {
    const root = await openDrawer(configuredHost(trace), new FakeTimers());
    const body = root.querySelector('.gp-drawer-body') as HTMLElement;

    // Follow-tail opens on the last screenful.
    expect([...root.querySelectorAll<HTMLElement>('.gp-log-line')].some((line) => line.dataset.line === '299')).toBe(true);
    const initialHeight = body.scrollHeight;

    const scrollTo = (value: number): void => {
      body.scrollTop = value;
      const EventCtor = (body.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event;
      body.dispatchEvent(new EventCtor('scroll'));
    };

    for (const target of [0, 2000, initialHeight - BODY_H, 500, initialHeight - BODY_H]) {
      scrollTo(target);
      // The content height is stable: the estimates agree with the measured rows.
      expect(body.scrollHeight).toBe(initialHeight);
      // The offset survives the repaint (it is not reset to zero), clamped to the end.
      const expected = Math.min(target, initialHeight - BODY_H);
      expect(body.scrollTop).toBe(expected);
      // The viewport is covered by rendered rows at every position.
      const extent = renderedExtent(root);
      expect(extent.top).toBeLessThanOrEqual(body.scrollTop);
      expect(extent.bottom).toBeGreaterThanOrEqual(body.scrollTop + BODY_H);
    }
  });

  test('only a window of a very large trace is in the DOM', async () => {
    const huge = Array.from({ length: LOG_MAX_LINES + 100 }, (_, index) => `line ${index} ${'y'.repeat(60)}`).join('\n');
    const root = await openDrawer(configuredHost(huge), new FakeTimers());
    const rendered = root.querySelectorAll('.gp-log-line').length;
    expect(rendered).toBeGreaterThan(0);
    // A window plus overscan, not the whole 20 000-line Trace.
    expect(rendered).toBeLessThan(160);
  });

  test('fills a tall panel even when the body height cannot be read', async () => {
    // The failure mode: the drawer is painted before layout, so its own height
    // reads as zero. The window must still be tall enough to fill the panel.
    forcedBodyHeight = 0;
    try {
      const root = await openDrawer(configuredHost(trace), new FakeTimers());
      const extent = renderedExtent(root);
      expect(extent.bottom - extent.top).toBeGreaterThanOrEqual(BODY_H * 2);
    } finally {
      forcedBodyHeight = null;
    }
  });
});
