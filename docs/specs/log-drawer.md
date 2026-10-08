# Spec: Log drawer usability

Status: implemented — tickets `log-drawer/01`–`05` are mapped in [`README.md`](README.md).
Feature: `log-drawer`
Follows: [`docs/specs/pipelines-panel.md`](pipelines-panel.md) (the drawer it deepens) and
[`docs/specs/downstream-pipelines.md`](downstream-pipelines.md) (nested Traces), and records ADR-0012
and ADR-0013.

## Problem Statement

A Job's Trace can be 20 000 lines, rendered in one scrollable `<pre>`. The browser lays out all of it,
and the developer's actual question — *where did it go wrong?* — is answered by eyeballing a wall of
text. There is no find, no way to jump to the failure, and getting the log out means selecting text by
hand. On a real failure the interesting lines are a handful near the end; everything else is noise.

## Solution

Make the drawer work on the Trace rather than just display it:

- **Windowed rendering** so 20 000 lines cost the layout of a screenful;
- an **incremental index** built on the main thread between idle callbacks (ADR-0012);
- **Find** with a match count and prev/next;
- **error highlighting** and a **jump to the last error line**;
- **Copy** the Trace — whole or the current window — to the clipboard.

Download to a file is deliberately **not** in this feature: it would need a `contributes.filesystem`
grant and a re-approval, and `~/Downloads` is not reliably cross-platform (Linux uses
`XDG_DOWNLOAD_DIR`; Windows relocates it; the host silently re-creates a missing folder).

## User Stories

1. As a developer reading a failed Job, I want to jump straight to the error, so that I do not scan
   20 000 lines.
2. As a developer, I want error and failure lines highlighted, so that I can see the shape of the
   failure.
3. As a developer, I want to search the log, so that I can find a step, a path or a message.
4. As a developer, I want a match count and next/previous, so that I can move between hits.
5. As a developer, I want to copy the log, so that I can paste it into a session or an issue.
6. As a developer, I want the log to stay readable and live while the Job runs, so that a running Job
   does not freeze.
7. As a developer at rail width, I want long lines to keep wrapping, so that nothing scrolls sideways.
8. As a developer, I want scrolling and follow-tail to survive a re-render, so that the view does not
   jump while I read.

## Implementation Decisions

### A pure index module

`panel/trace-index.ts` owns everything derived from the Trace text, with no DOM:

- `stripAnsi(text)` removes SGR escape sequences before display and matching;
- `indexTrace(text)` → the lines, each with its stripped form;
- `findMatches(lines, query)` → line indices for a case-insensitive substring, plus a count;
- `errorLines(lines)` → ranked matches for an error-keyword set (`error`, `failed`, `fatal`, `panic`,
  `traceback`, `exception`, `fatal:`, and GitLab's `ERROR:`), ordered so the **last** (nearest the
  failure end) is the jump target;
- window arithmetic for variable-height rows.

### Windowed rendering with measured heights

The drawer replaces the single `<pre>` with a virtualized body: top and bottom spacers, plus the
visible lines only. Rows **wrap** (`white-space: pre-wrap`, never a horizontal axis, preserving
`pipelines-panel` US14), so heights vary; the renderer measures each rendered row and caches its height
by line index, and scroll position is recomputed against the running height total. Follow-tail and the
saved scroll offset are preserved exactly as today. A line's height is invalidated when the content
changes (a live append).

### Incremental indexing

Indexing and matching run in slices scheduled with `requestIdleCallback`, yielding between chunks, so a
20 000-line Trace never blocks a frame. A newly appended window (see
[`caching-and-transport.md`](caching-and-transport.md)) is indexed from where the last slice stopped.
Find is re-run over the index as the query changes, debounced.

### Controls

A small toolbar in the drawer header, beside the existing actions: a search field with match count and
prev/next, a **Jump to error** control (present only when `errorLines` is non-empty), and **Copy**
(copies the full accumulated Trace). Keyboard: `Ctrl/Cmd+F` focuses find while the drawer is open; `Esc`
closes the drawer as today. Every control is a real `<button>`/`<input>` in the drawer, and a test
proves it activates as a user would (including keyboard).

### The open drawer survives a re-render

The Panel paints by clearing its root, and a running Job's poll repaints several times per cycle. The
open drawer is therefore treated as a fixed child of the root: `render()` replaces every other element
but leaves the drawer connected in place, updating its header and notice in place. The body is repainted
only when the visible window changes; while the user reads scrollback, only the spacers grow, so scroll,
focus, selection and the find query survive the poll. A paint on a body that is not in the document never
writes back the saved scroll state. See ADR-0013.

### Empty and truncated states

The existing "no log output yet", "Could not load the log" and truncation notices are unchanged. Find
over an empty Trace shows a zero count rather than an error; Jump to error is absent.

## Testing Decisions

- **`panel/trace-index.test.ts`** (new): ANSI stripping; find match indices and count, case-insensitive;
  error-line ranking with the last match chosen; window arithmetic at the top, middle and end.
- **`panel/panel.test.ts`** (through `FakeHost`): only the visible lines are in the DOM for a large
  Trace; find highlights matches and next/previous moves between them; Jump to error scrolls to the last
  error line; Copy writes the full Trace to the clipboard via the host; follow-tail still sticks while a
  live Trace appends; scroll position survives a Poll re-render; `Ctrl/Cmd+F` focuses the find field.
- **`FakeHost`** gains `writeClipboard` recording.

## Out of Scope

- Downloading the Trace to a file (no filesystem grant; see above).
- Regular-expression find, whole-word or case-sensitive modes.
- A Web Worker; indexing is main-thread by ADR-0012.
- Side-by-side or diff views of two Traces.
- Searching across Jobs or Pipelines.

## Further Notes

- **Host API, cited:** `host.writeClipboard` is ungated (`node_modules/@openchamber/sdk/dist/host.d.ts`);
  the sandbox is `allow-scripts` with an opaque origin, `worker-src` allows `blob:`/`data:`, and
  `requestIdleCallback` exists — see ADR-0012.
- **Decision recorded:** ADR-0012, and ADR-0013 for the open drawer surviving a re-render.
- **Domain language:** no new `GLOSSARY.md` term; "Trace" already covers the log.
