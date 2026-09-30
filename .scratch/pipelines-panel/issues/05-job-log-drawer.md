# 05: Job log drawer

**What to build:** Opening a Job shows the tail of its log in a bottom drawer over the Panel, wrapped
and readable at rail width, with a pinned link to the full log in GitLab and a way back to the list.

**Blocked by:** 04 — Expand a Pipeline into Jobs by Stage.

**Status:** ready-for-agent

- [ ] Opening a Job fetches its trace and shows the last 40 lines in a bottom drawer.
- [ ] The tail wraps and never scrolls horizontally.
- [ ] A "view full log in GitLab" affordance is pinned in the drawer header or footer.
- [ ] Closing the drawer restores the list with its scroll position.
- [ ] A missing or empty trace shows a clear state rather than an error.
- [ ] Tests cover tail extraction at its boundaries and the drawer behaviour through the fake host.
