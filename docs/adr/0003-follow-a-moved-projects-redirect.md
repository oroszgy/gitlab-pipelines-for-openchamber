# Follow a moved project's redirect instead of reporting its 301

GitLab answers a request for a renamed or transferred project with a redirect whose `Location` names
the project's current identity (`/api/v4/projects/<id>`). The host `request` bridge returns only
`{ status, body }` — never headers — so the Panel cannot read `Location`, and an unfollowed redirect
surfaced as `GitLab returned an unexpected response (301)`. We decided the Panel follows the move
itself: the GitLab client recognises a redirect status (301, 302, 303, 307, 308), parses the
documented body text — `This resource has been moved permanently to <url>` — for the target, and
returns a typed `moved` failure carrying it. The Panel caches that target for its lifetime, calls the
project by it, and retries. Only when the body cannot be parsed, or the chain exceeds five redirects,
does it fall back to a "Project moved" state that points the user at their git remote or the Project
setting.

**Considered options.** Reporting the redirect and stopping (guide-only) leaves the common case a dead
end for the sake of a message. Waiting for the host to follow redirects, or to expose `Location`,
would fix this at the right layer for every extension — but it is outside this repo's control and
unblocks nobody now, so it is an upstream note rather than a plan. A loose scan for any
`…/api/v4/projects/…` URL in the body was rejected in favour of matching GitLab's documented sentence,
so that a redirect which is _not_ a move (an expired session bounced to SSO, a host or scheme
redirect) is reported as what it is instead of being mistaken for one.

**Consequences.** The parse leans on GitLab's response text: documented, but not a stable API contract.
A wording change degrades to the guide state rather than breaking. Healing is session-scoped — the
Panel cannot write integration settings, and a refresh re-derives the stale remote path — so the
healed target lives only in memory. Because the header then shows the project id, the recognisable
path survives only in the one-time notice (`old path → target`). Both transports share the one
client-side path; the custom-host proxy already follows redirects implicitly through Node `fetch`, so
there the explicit handling is a safety net, not the fix.

> **Note (2026-10-06).** The last sentence was half wrong. With service-owned configuration as the
> only transport (ADR-0006), the proxy *was* following the redirect, so the client-side handling
> never ran and a moved project surfaced as an authorization error. The proxy now requests
> `redirect: 'manual'`, returning the `301` and its move body for the Panel to act on — so the
> client-side handling is the fix, not a safety net. See issue #32.
