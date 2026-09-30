# 04: Switching hosts cleanly

**What to build:** Change the `host` setting and the Panel follows: it re-resolves, drops everything it
was showing for the previous host, and refetches — the same way changing the open project already
works. A reader can see at a glance which mode the Panel is in.

**Blocked by:** 03 — A custom host, end to end.

**Status:** done

- [x] Changing `host` (or clearing it) re-resolves and refetches without a reload.
- [x] Pipelines, Jobs and cached Traces from the previous host are cleared before re-resolving, so no
      stale foreign data is shown as current (Jobs are keyed by pipeline id, not unique across hosts).
- [x] The built-in Connect flow is inert while a custom host is set: the connection event is ignored in
      custom mode, so no host-injected token is required or asked for.
- [x] The header and footer distinguish a custom host (a "Custom host" tag and the host named in the
      footer) from the built-in mode.
- [x] Switching a remote on the built-in host back to the built-in path restores it without an extra
      token; a remote that does not match the built-in host reports the mismatch rather than stale rows.
