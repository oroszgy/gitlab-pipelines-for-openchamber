# Spec: Caching and transport speedups

Status: specified — tickets `caching-and-transport/01`–`06` are mapped in [`README.md`](README.md).
Feature: `caching-and-transport`
Follows: [`docs/specs/pipelines-panel.md`](pipelines-panel.md) (its polling model and the 256 000-char
body cap), and records ADR-0009 and ADR-0010.

## Problem Statement

Every Poll re-fetches the Pipeline list, every expanded Pipeline's Jobs and bridges, and the open Job's
Trace in full. The Proxy service's envelope returns only `{ status, body, truncated }` and drops every
response header, so the Panel cannot send a conditional request, cannot page past the newest Pipelines,
and cannot see GitLab's rate-limit signals — none of those live in the body. Three consequences follow:
the list is hard-capped at `PER_PAGE` (20) Pipelines forever; a long-running Job's Trace is re-read
whole on every 5-second poll; and a `429` is indistinguishable from any other unexpected status. The
cost is GitLab rate-limit pressure and wasted bandwidth, and a real usability ceiling.

## Solution

Let a curated allowlist of headers cross the service boundary. The Panel then:

- sends `If-None-Match` and reuses what it already holds on a `304`;
- loads older Pipelines with `Link rel="next"`;
- pauses and widens its Poll on `429`/`Retry-After`, with one notice per episode;
- grows a running Job's Trace as an incremental byte-range delta, accumulating windows past the body
  cap up to the drawer's line cap; and
- conditional-GETs a settled Job's Trace.

## User Stories

1. As a developer, I want the Panel to stop re-downloading a Pipeline list that has not changed, so
   that polling is cheap.
2. As a developer reading a self-managed instance, I want fewer GitLab requests, so that I do not burn
   the rate limit.
3. As a developer on a busy project, I want to load Pipelines older than the first page, so that the
   list is not stuck at 20.
4. As a developer, I want to know when the Panel has paused because GitLab rate-limited it, so that an
   idle-looking Panel is explained.
5. As a developer watching a running Job, I want its Trace to grow without re-downloading the whole
   log each Poll, so that long logs stay affordable.
6. As a developer, I want a Trace longer than the service's cap to become fully visible, so that the
   failure at the end is reachable.
7. As a maintainer, I want the service boundary to stay a small, named allowlist, so that the token and
   cookies can never cross it.

## Implementation Decisions

### The service envelope carries a header allowlist

`service/proxy.ts` gains a `headers` field on `ProxyRequest` and returns an allowlisted `headers` on
`ProxyResult`; `ProxyFetch`'s response type gains `headers`, and `readCapped` is unchanged. The
response allowlist is exactly: `etag`, `link`, `x-next-page`, `x-prev-page`, `x-total`, `x-total-pages`,
`ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset`, `retry-after`. Only `if-none-match` is
forwarded on the request side. `service/routes.ts` passes the allowlist through `ProxyRouteResult`;
`service/server.ts` includes it in the `/proxy` JSON envelope; `panel/host-port.ts`'s `HostRequest`
gains `headers` and `HostResponse` gains `headers`, both optional so an older service is still readable.
Anything not on the allowlist never crosses.

### Conditional GET and a request cache

`panel/gitlab-client.ts` splits its `Requester` into a request that carries headers. A small keyed cache
(method + path + query) stores the last `ETag` and the last parsed body for the list endpoints and for a
**settled** Trace. A fetch sends `If-None-Match` when a key is cached; a `304` returns the cached body
rather than a failure — the existing `mapHttpStatus` must not treat `304` as a redirect. The cache is
dropped wholesale when the Configured host or the Access token changes, alongside the Panel's existing
`forgetHostData`. A missing `ETag` on a `200` simply means "not cacheable this time".

### Pagination

`pipelinesRequest` gains a `page` query. A pure `nextPageFromLink(linkHeader)` reads `rel="next"`; when
absent, there is no more. `fetchPipelines` returns the page's Pipelines plus the next page (or null).
The Panel keeps the accumulated list and renders a **Load more** control at the end; loading a page
appends and does not disturb expansion, scope, or the remembered state. `X-Total`/`X-Total-Pages` are
used only as a hint, never required.

### Rate limits

`mapHttpStatus` gains `{ kind: 'rate-limited'; retryAfterMs: number | null }` for `429`, parsed from
`Retry-After` (seconds or an HTTP date). The Poll reschedules itself at `max(backoff, retryAfterMs)` and
shows a one-time notice for the episode; an ordinary `200` with a low `RateLimit-Remaining` widens the
Poll pre-emptively. The notice clears once a request succeeds.

### Incremental traces

`traceRequest` gains `byte_offset`/`byte_limit`; `fetchTraceRange` returns the window, the next offset,
and whether the service signalled truncation (more remains). For a **running** Job the Panel requests
from its current offset with `byte_limit` at the service cap and appends; it keeps requesting while the
service reports truncation, until the Job settles or the drawer's `LOG_MAX_LINES` is reached. For a
**settled** Job it reverts to one conditional GET. The accumulated text is what find, highlight and
Copy operate on.

## Testing Decisions

A good test asserts external behaviour, never internal wiring.

- **`service/proxy.test.ts`**: the allowlisted response headers are returned and everything else is
  dropped; `If-None-Match` is forwarded; a `304` is returned as a success with its headers.
- **`service/routes.test.ts` / `service/server.test.ts`**: the envelope carries `headers`.
- **`panel/gitlab-client.test.ts`**: `nextPageFromLink` for present/absent/malformed `Link`;
  `pipelinesRequest` with `page`; `mapHttpStatus` for `429` with and without `Retry-After`; the request
  carries `byte_offset`/`byte_limit`; a `304` reuses the cached body and no `ETag` means a plain fetch.
- **`panel/panel.test.ts`** (through `FakeHost`): Load more appends a page; the Poll widens and notices
  on `429`, then clears; a running Job's Trace accumulates two windows into one log; a settled Job
  conditional-GETs.

`FakeHost` gains per-request header capture and configurable response headers, and can answer `304`.

## Out of Scope

- A durable cache in the service; the request cache is in-panel and dies with the Panel.
- GraphQL, or any second transport.
- Keyset pagination (`pagination=keyset`); the Pipeline list keeps offset pagination.
- HTTP `Range` on the Trace — GitLab does not support it.
- Conditional GET on non-2xx responses (GitLab emits no `ETag` on an error).
- Retry logic beyond the Poll's own rescheduling.

## Further Notes

- **Verified against:** GitLab REST docs and `gitlab-org/gitlab`, 2026-10-06. Weak, body-derived Rack
  `ETag` + `If-None-Match` → bodyless `304` on the JSON list endpoints (pipelines confirmed live);
  `Last-Modified`/`If-Modified-Since` unsupported; `HEAD` returns no `ETag`. Pagination headers
  `Link`, `X-Total`, `X-Total-Pages`, `X-Next-Page`, `X-Prev-Page`; `X-Total`/`X-Total-Pages` absent on
  `/jobs` and beyond 10 000 records. `RateLimit-*` on normal responses; `429` + `Retry-After` only when
  throttled. Trace `byte_offset`/`byte_limit` (≤512 000) added ~GitLab 18.11; no `Range`.
  <https://docs.gitlab.com/api/rest/>, <https://docs.gitlab.com/administration/settings/user_and_ip_rate_limits/>,
  <https://gitlab.com/gitlab-org/gitlab/-/commit/5ed55fbc0560cf3433ebbf44c542b9e2e8f1fab1>.
- **Decisions recorded:** ADR-0009 (header allowlist), ADR-0010 (trace delta and accumulation).
- **Domain language:** no new `GLOSSARY.md` term.
