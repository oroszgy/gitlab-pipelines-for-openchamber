# 02: Heal the session project and retry

**What to build:** When a fetch fails with a `redirect` that carries a target, the Panel adopts the target
as the resolved project for the session, retries the fetch, and carries on. The healed target is cached —
keyed by the project path that triggered it — for the Panel's lifetime, so a refresh or poll that
re-derives the same stale remote path reuses it and never re-follows. The chain is capped at five hops; a
sixth redirect, or a target on a host other than the effective one, stops healing and hands off to 03.

Jobs, traces, the ref, the scope and polling are untouched: they read the resolved project, which is now
the healed target. `forgetHostData()` clears the cache on a host switch.

**Blocked by:** 01 — Recognise a redirect and parse its target.

**Status:** done

- [x] A `redirect` with a target sets the resolved project to it and retries the fetch.
- [x] The healed target is cached for the Panel's lifetime, keyed by the triggering project path; a refresh
      reuses it without issuing a second redirecting request.
- [x] Healing is capped at five hops; a further redirect stops healing.
- [x] A target on a host other than the effective one is not followed.
- [x] The header shows the healed target, since it renders the resolved project.
- [x] Switching hosts clears a healed target, so one host's identity never crosses into another.
- [x] Panel tests cover: a `301` with a target heals and renders pipelines; the header shows the target; a
      refresh reuses the cache; a chain over five redirects stops healing; a wrong-host target is not
      followed; a host switch clears the healed target.
