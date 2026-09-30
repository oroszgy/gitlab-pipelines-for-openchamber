# 03: List Pipelines for the current Ref

**What to build:** The Panel connects to GitLab and lists the Pipelines for the current Ref, newest
first, each as a two-line row reading Status, Ref, short SHA and duration/age. This adds the token
Integration against the configured host and the shared Status→colour map.

**Blocked by:** 02 — Resolve the project and current Ref.

**Status:** ready-for-agent

- [ ] The manifest integrates with the configured GitLab host via a personal access token, and the
      token is injected by the host — never present in the Panel.
- [ ] The Panel lists the current Ref's Pipelines newest first.
- [ ] Each row is two lines: Ref + short SHA with duration/age right-aligned; Status + `iid` +
      source/merge-request marker.
- [ ] `disconnected` shows when no token is connected; `no-pipelines` shows when the Ref has none.
- [ ] Every Status maps to one tone, label and glyph — including `failed`, and `failed` with
      `allow_failure` which reads as a warning ("failed (allowed)").
- [ ] Tests cover path and query construction, the Status map, the formatters, and list rendering
      through the fake host.
