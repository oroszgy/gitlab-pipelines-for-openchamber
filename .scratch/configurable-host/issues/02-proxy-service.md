# 02: The proxy service, proven on its own

**What to build:** The local proxy the Extension will use for a custom GitLab host, shipped as a built
service entry and verifiable before the Panel is wired to it. It is a dumb HTTPS proxy: it is handed a
base URL, a personal access token, a method, a path and a query, performs the call, and returns a status
and body. It knows nothing about GitLab.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The proxy logic is a pure handler with an injected fetch, tested directly: it forwards only the
      request it is handed.
- [x] A base URL is accepted as a bare host or a full origin, and refused unless it is `https` with no
      embedded credentials and no path.
- [x] TLS is verified with no bypass (the default fetch is used with no agent override), requests time
      out (`PROXY_TIMEOUT_MS`, 20 s), and responses are size-capped (`PROXY_BODY_MAX`, 256 000).
- [x] The token travels in the request body (never the query), is never logged, and is redacted from any
      body or error the handler returns.
- [x] A thin loopback server binds only `127.0.0.1` on `OPENCHAMBER_SERVICE_PORT`, requires the
      host-issued bearer on every request including health, and serves one health route and one proxy
      route.
- [x] The build produces `service/main.js` (Node ESM) alongside the Panel bundle, via `build:service`.
