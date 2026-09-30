# 04: Switching hosts cleanly

**What to build:** Change the `host` setting and the Panel follows: it re-resolves, drops everything it
was showing for the previous host, and refetches — the same way changing the open project already
works. A reader can see at a glance which mode the Panel is in.

**Blocked by:** 03 — A custom host, end to end.

**Status:** ready-for-agent

- [ ] Changing `host` (or clearing it) re-resolves and refetches without a reload.
- [ ] Pipelines, Jobs and cached Traces from the previous host are cleared, so no stale foreign data is
      shown as current.
- [ ] The built-in Connect flow is inert while a custom host is set, so it never asks for a token that
      will not be used.
- [ ] The header distinguishes the built-in mode from a custom host.
- [ ] Switching back to the built-in host restores the secure path without needing an extra token.
