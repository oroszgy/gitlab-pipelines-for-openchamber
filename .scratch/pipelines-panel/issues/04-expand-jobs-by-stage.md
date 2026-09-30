# 04: Expand a Pipeline into Jobs by Stage

**What to build:** Expanding a Pipeline row shows its Jobs grouped by Stage, each Stage with a
done/total count, so a run's shape and its failure point are visible at a glance.

**Blocked by:** 03 — List Pipelines for the current Ref.

**Status:** done

- [x] Expanding a Pipeline fetches and shows its Jobs grouped by Stage, in order.
- [x] Each Stage group shows a `done/total` count.
- [x] Each Job shows its own Status using the shared map.
- [x] All Stage groups are visible at once — no nested scrolling.
- [x] Collapsing returns the row to its two-line state without a refetch storm.
- [x] Tests cover grouping order, counts, empty groups, and skipped and manual Jobs.
