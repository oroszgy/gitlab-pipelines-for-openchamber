/**
 * Minimal DOM for the panel tests. Imported once per test process via
 * `bunfig.toml`. Pure-module tests do not need the DOM and ignore it.
 */
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
const globals = globalThis as unknown as Record<string, unknown>;

globals.window = window;
globals.document = window.document;
globals.getComputedStyle = window.getComputedStyle.bind(window);

// Expose happy-dom's constructors (HTMLElement, HTMLStyleElement, …) so the UI
// kit's `instanceof` checks work.
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globals) continue;
  try {
    globals[key] = (window as unknown as Record<string, unknown>)[key];
  } catch {
    // Accessors that need a live window can be skipped.
  }
}

globals.requestAnimationFrame = (callback: FrameRequestCallback): number =>
  window.setTimeout(() => callback(Date.now()), 0) as unknown as number;
globals.cancelAnimationFrame = (handle: number): void => {
  window.clearTimeout(handle as unknown as Parameters<typeof window.clearTimeout>[0]);
};
