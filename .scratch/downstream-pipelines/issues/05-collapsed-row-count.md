# 05: The collapsed-row downstream count

**What to build:** A collapsed Pipeline row shows how many Downstream pipelines it has, without making
the poll fetch bridges for every row on every tick. Bridges are fetched once per Pipeline as the list
loads, then only for Pipelines that are active or already known to fan out.

**Blocked by:** 01 — Fetch a Pipeline's bridges.

**Status:** ready-for-agent

- [ ] A collapsed Pipeline row shows `↳ N downstream`, hidden when `N` is zero.
- [ ] When the list loads, bridges are fetched once for each listed Pipeline and cached by
      `(project, pipeline id)`.
- [ ] After that, bridges are refetched only for Pipelines that are active or already have a Downstream
      pipeline; the badge reads from the cache otherwise.
- [ ] A failed bridge fetch does not blank the list or raise a Panel-wide error: the row shows no count or
      keeps a stale one, and every other row stands.
- [ ] Tests: the badge value and its hidden state; the fetch policy asserted by call counts through the
      fake host; a failed fetch contained.
