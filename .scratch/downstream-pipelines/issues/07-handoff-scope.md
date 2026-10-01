# 07: Handoff only within the open project

**What to build:** `Start session` seeds a session in the open checkout, so it must not be offered on a
Job it cannot fix. It stays on failed Jobs of the root Pipeline and of a same-project child pipeline, and
disappears on a multi-project Downstream pipeline.

**Blocked by:** 03 — The downstream card, one hop.

**Status:** ready-for-agent

- [ ] A failed Job of the root Pipeline still offers `Start session`, unchanged.
- [ ] A failed Job of a same-project child pipeline offers it too — the checkout can fix it.
- [ ] A failed Job of a multi-project Downstream pipeline renders without the affordance.
- [ ] The reason is stated where the affordance is gated, so a later change does not "restore" it.
- [ ] Tests: present on root and child; absent on a multi-project downstream.
