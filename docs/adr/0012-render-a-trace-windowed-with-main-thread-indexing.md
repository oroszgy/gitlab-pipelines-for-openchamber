# Render a Trace windowed with main-thread indexing

The log drawer rendered up to 20 000 lines in one `<pre>`, which the browser lays out in full. A Web
Worker is possible only as an **inlined** `blob:`/`data:` worker: the panel's security origin is opaque
(`sandbox="allow-scripts"`, with no `allow-same-origin`), so a same-origin worker script fails even
though the CSP lists `'self'`, and `openchamber-guest-bundle` emits a single classic IIFE with no worker
chunk. The drawer also wraps lines, so rows are variable-height. The drawer therefore renders only the
visible lines (measured per wrapped line) and builds its line index, error highlights and find matches
**incrementally on the main thread** with `requestIdleCallback`, rather than in a worker.

**Considered options.** An inlined blob worker is deliverable but needs a second bundle target and
inlining/worker plumbing for a ceiling of 20 000 lines. A chunked `<pre>` is simpler but gives a weaker
find. `requestIdleCallback` is available in the sandboxed guest.

**Consequences.** Scroll math must handle variable row heights and keep follow-tail and scroll position
stable as windows mount and unmount; indexing yields between chunks instead of running off-thread. The
spec is [`docs/specs/log-drawer.md`](../specs/log-drawer.md).
