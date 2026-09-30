# 02: The proxy service, proven on its own

**What to build:** The local proxy the Extension will use for a custom GitLab host, shipped as a built
service entry and verifiable before the Panel is wired to it. It is a dumb HTTPS proxy: it is handed a
base URL, a personal access token, a method, a path and a query, performs the call, and returns a status
and body. It knows nothing about GitLab.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The proxy logic is a pure handler with an injected fetch, tested directly: it forwards only the
      request it is handed.
- [ ] A base URL is accepted as a bare host or a full origin, and refused unless it is `https` with no
      embedded credentials and no path.
- [ ] TLS is verified with no bypass, requests time out, and responses are size-capped.
- [ ] The token travels in the request body, never the query, is never logged, and is stripped from any
      error the handler returns.
- [ ] A thin loopback server binds only `127.0.0.1` on the host-issued port, requires the host-issued
      bearer on every request including health, and serves one health route and one proxy route.
- [ ] The build produces the service entry alongside the Panel bundle.
