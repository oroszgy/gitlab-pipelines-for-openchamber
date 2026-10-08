# Keep the open log drawer through a re-render

Every data change in the Panel paints by clearing the root and rebuilding it, and a running Job's poll
does this several times per cycle (the Pipelines page, then the open Jobs, then the Trace delta). That
rebuild recreated the log drawer's body **while it was detached**, where the browser reports its
`scrollTop` as `0`; the Panel read that back as the saved scroll offset, so a log the user had scrolled
up snapped to the top on the next poll and the find field lost focus. The fix makes `render()` treat the
open drawer as a fixed child of the root: it replaces every other element but leaves the drawer element
**connected in place**, refreshing its header text without rebuilding the body or toolbar. The body is
repainted only when the visible window changes — while reading scrollback the spacers alone grow — so
scroll, focus, selection and the find query all survive a poll. A paint on a body that is not in the
document is never allowed to write back the saved scroll state.

**Considered options.** Rebuilding and then restoring scroll and focus around the rebuild was rejected:
a detached body cannot measure scroll, and the restore races the poll that triggered it. Stopping the
poll's data paths from calling `render()` altogether and updating their DOM in place was rejected as a
far larger change to the render architecture, when the only stateful subtree is the drawer.

**Consequences.** `render()` can no longer blanket-clear the root while a drawer is open; it must remove
everything *except* the drawer and insert the new chrome before it, or it would detach the drawer and
lose the focus and selection it is meant to keep. The drawer's own view state — saved scroll offset,
follow-tail, focus and the find query — is authoritative across renders rather than re-derived from the
DOM. The spec is [`docs/specs/log-drawer.md`](../specs/log-drawer.md).
