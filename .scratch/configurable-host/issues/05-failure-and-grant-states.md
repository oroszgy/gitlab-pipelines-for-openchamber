# 05: Failure and grant states

**What to build:** Every way the host configuration can be wrong gets a clear, typed state rather than a
silent empty panel: a malformed host, a custom host with no token, a service the user has not granted,
a service that failed to start, and a proxy request that failed. A failed proxy call must read as an
error, never as a project that simply has no Pipelines.

**Blocked by:** 03 — A custom host, end to end.

**Status:** ready-for-agent

- [ ] A malformed `host` is a typed failure naming what is wrong, not a silent fallback to the built-in
      host.
- [ ] A custom host with no `token` has its own state, distinct from a missing connection on the
      built-in path.
- [ ] A missing service grant and a failed service are distinguishable states pointing at Settings →
      Extensions.
- [ ] A proxy request failure surfaces as the existing network error, never as an empty list.
- [ ] Each state offers the settings-based way out where one exists, consistent with the existing
      failure states.
- [ ] The built-in path is unaffected when no service grant exists.
