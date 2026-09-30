# 09: Scrollable log, live while the Job runs

**What to build:** The log drawer stops being a 40-line peek. It shows the whole returned Trace,
scrolling vertically (still wrapped, still no horizontal axis), names any bound that shortened it, and
refreshes itself while its Job is still active.

**Blocked by:** 05 — Job log drawer.

**Status:** done

- [x] The drawer shows the whole Trace, wrapped and scrolling vertically, not a fixed 40-line tail.
- [x] A 20 000-line safety cap bounds a pathological log; the notice bar says "older lines not shown".
- [x] A body at the host's 256 000-char cap is reported as "GitLab returned a capped log". Both notices
      carry the "view full log in GitLab" link.
- [x] While the open Job is active its Trace refetches on the poll; a settled Job stops.
- [x] The view follows the tail (sticks within ~24px of the bottom) and detaches when the reader
      scrolls up, re-attaching at the bottom. The scroll position survives a refetch.
- [x] Tests cover the cap and host-cap notices, live refetch while active and none once settled, and
      the `isAtBottom` follow rule.
