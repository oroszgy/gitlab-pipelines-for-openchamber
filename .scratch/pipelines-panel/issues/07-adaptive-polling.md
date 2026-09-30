# 07: Adaptive polling, freshness and manual refresh

**What to build:** The Panel keeps itself current while something is running and goes quiet when
nothing is, with a visible sense of how fresh the data is and a way to force a refresh.

**Blocked by:** 03 — List Pipelines for the current Ref.

**Status:** done

- [x] While any shown Pipeline or Job is active (`pending`, `running`, `created`, `preparing`,
      `canceling`, `waiting_for_*`), the Panel polls; once all are settled, polling stops.
- [x] A running Pipeline shows one spinning glyph and a live-ticking elapsed time.
- [x] The header shows "updated Ns ago" with a pulsing dot; an indeterminate top bar shows only on
      first load.
- [x] A manual refresh is always available.
- [x] A slow response can never overwrite a newer one, and the timer is cleared when the Panel is
      disposed.
- [x] Tests cover the poll rule's active/settled sets and its stop condition, plus the Panel's
      behaviour through the fake host.
