# 06: Keep it live

**What to build:** The adaptive poll learns about Downstream pipelines, so a card keeps updating after
its upstream has settled — the case a `mirror`'d upstream creates when it is already `failed`.

**Blocked by:** 03 — The downstream card, one hop; 05 — The collapsed-row downstream count.

**Status:** ready-for-agent

- [ ] `visibleStatuses` includes the contributing status of every cached Trigger row — the Downstream
      pipeline's where there is one.
- [ ] The Panel keeps polling while any Downstream pipeline is active, even when the root Pipeline is
      `failed` or `success` and none of its own Jobs are active.
- [ ] Bridges and Jobs refetch on the poll only for Pipelines that are expanded or active; nothing is
      fetched for untouched rows.
- [ ] The open Job's Trace still refetches while its Job is active, whether it belongs to the root or a
      Downstream pipeline.
- [ ] Tests: a settled root with an active downstream keeps polling; it stops when the downstream
      settles; call counts confirm untouched rows are not refetched.
