# 03: A custom host, end to end

**What to build:** The tracer bullet. Set the `host` setting to a GitLab other than the built-in
instance, supply a token, and the Panel lists that host's Pipelines for the current Ref — expanding to
Jobs and opening a log — with the header showing which Configured host it is talking to. Left empty, or
set to the built-in instance, the Extension works exactly as today over the host request bridge and the
host-injected token.

**Blocked by:** 01 — Inject the requester into the GitLab client; 02 — The proxy service, proven on its
own.

**Status:** done

- [x] The manifest declares the service and the `host` and `token` settings next to the existing Connect
      flow, with the built-in `apiOrigin` unchanged.
- [x] The Panel resolves the Configured host: the built-in host when `host` is empty or names it, the
      setting otherwise.
- [x] In built-in mode the Panel uses the host request bridge and the host-injected token, unchanged.
- [x] In custom-host mode the Panel routes Pipelines, Jobs and Trace fetches through the proxy, carrying
      the base URL in the service path/query and the token in the request body.
- [x] The header shows the Configured host and resolved project (the resolver compares the derived remote
      against the Configured host, so a custom host's own remote no longer reads as a mismatch).
- [x] `host-mismatch` compares against the Configured host and names it.
- [x] A custom host produces the same rows, stage groups, log drawer and polling as the built-in one.
