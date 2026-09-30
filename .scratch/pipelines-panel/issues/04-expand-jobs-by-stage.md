# 04: Expand a Pipeline into Jobs by Stage

**What to build:** Expanding a Pipeline row shows its Jobs grouped by Stage, each Stage with a
done/total count, so a run's shape and its failure point are visible at a glance.

**Blocked by:** 03 — List Pipelines for the current Ref.

**Status:** ready-for-agent

- [ ] Expanding a Pipeline fetches and shows its Jobs grouped by Stage, in order.
- [ ] Each Stage group shows a `done/total` count.
- [ ] Each Job shows its own Status using the shared map.
- [ ] All Stage groups are visible at once — no nested scrolling.
- [ ] Collapsing returns the row to its two-line state without a refetch storm.
- [ ] Tests cover grouping order, counts, empty groups, and skipped and manual Jobs.
