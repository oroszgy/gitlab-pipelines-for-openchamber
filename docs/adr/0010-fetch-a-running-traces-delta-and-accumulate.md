# Fetch a running Trace as a delta and accumulate the windows

A running Job's Trace was re-read whole on every poll, and the service caps any single response at
256 000 characters, so a longer log was shown as "GitLab returned a capped log" and never got past the
cap. GitLab's trace endpoint gained `byte_offset`/`byte_limit` (limit ≤ 512 000), so the Panel fetches
only the bytes past what it already has. Because one response is still capped at 256 000 characters, the
Panel accumulates successive windows — past the old cap, up to the log drawer's own 20 000-line safety
cap — so the whole of a large log becomes reachable.

**Considered options.** Keeping a single 256 KB window would leave a long log capped forever. A fixed
total byte cap was rejected in favour of the existing line cap, so one bound (lines) governs the drawer
rather than two. HTTP `Range` is not supported by GitLab (the feature request is open), so the offset is
a query parameter the Panel tracks itself; a **settled** Trace uses conditional GET instead, since its
body no longer changes.

**Consequences.** A very large log costs several requests to become complete; the Panel must track a
byte offset per open Job and handle a service-truncated response as "there is more". The spec is
[`docs/specs/caching-and-transport.md`](../specs/caching-and-transport.md).
