# 06: Contract the transitional token path

**What to build:** With the Panel off the body token, remove the transitional body-token fallback from
`/proxy` and delete the dead code the cutover left behind — the manifest integration remnants, the baked
origin constant, and any unused host-seam members or test doubles. The service now attaches the token only
from its own configuration.

**Blocked by:** 03 — Panel owns configuration through the service

**Status:** ready-for-agent

- [ ] `/proxy` no longer accepts or reads a token from the request body; its request type no longer
      carries one.
- [ ] No code references the removed integration, `apiOrigin`, the baked origin constant, or the host
      request bridge.
- [ ] No unused host-seam member or fake remains.
- [ ] `bun run check` stays green.
