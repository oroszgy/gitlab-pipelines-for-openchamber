# Pass a curated header allowlist through the service

The Proxy service's envelope returned only `{ status, body, truncated }`, so every response header was
dropped before the Panel saw it. That made conditional requests, pagination and rate-limit signals
unreachable — none of them live in the body — and the Panel still holds all GitLab traffic through the
service. The service now forwards a small **request** allowlist down (just `If-None-Match` today) and a
fixed **response** allowlist up (`ETag`, `Link`, `X-Next-Page`/`X-Prev-Page`, `X-Total`/`X-Total-Pages`,
`RateLimit-*`, `Retry-After`), so the Panel can send a conditional request, follow a page, and back off
when throttled.

**Considered options.** A general header pass-through was rejected: the boundary exists to keep the
Access token and cookies from crossing, and forwarding every header enlarges it for no feature's sake.
No pass-through leaves the whole feature impossible, since a header is the only carrier for each signal.

**Consequences.** The allowlist is the seam's contract: a new header is a deliberate edit to it, never a
side effect. GitLab's REST ETags are **weak** and body-derived, so a `304` saves bandwidth but the query
still runs; the Trace endpoint suppresses its `ETag` on the Workhorse-delegated branch, so conditional
GET on a settled Trace is best-effort and degrades to a plain fetch. Pagination follows `Link rel="next"`
rather than a total, because `X-Total`/`X-Total-Pages` are often absent (`/jobs` never returns them).
The spec is [`docs/specs/caching-and-transport.md`](../specs/caching-and-transport.md).
