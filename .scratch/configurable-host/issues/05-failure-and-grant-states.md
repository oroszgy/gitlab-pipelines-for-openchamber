# 05: Failure and grant states

**What to build:** Every way the host configuration can be wrong gets a clear, typed state rather than a
silent empty panel: a malformed host, a custom host with no token, a service the user has not granted,
a service that failed to start, and a proxy request that failed. A failed proxy call must read as an
error, never as a project that simply has no Pipelines.

**Blocked by:** 03 — A custom host, end to end.

**Status:** done

- [x] A malformed `host` is a typed failure ("Invalid GitLab host") naming what is wrong; it never
      silently falls back to the built-in host, and no request is made.
- [x] A custom host with no `token` has its own state ("No token for this host"), distinct from a
      missing connection on the built-in path.
- [x] A missing service grant or failed service (`NO_SERVICE`, `SERVICE_FAILED`, `NOT_GRANTED`) is a
      typed `service` state pointing at Settings → Extensions.
- [x] A proxy request failure maps to the existing network error ("Could not reach GitLab"), never to an
      empty list.
- [x] Each state offers the settings-based way out, consistent with the existing failure states.
- [x] The built-in path is unaffected when no service grant exists.
