# 01: Recognise a redirect and parse its target

**What to build:** In `gitlab-client`, treat the redirect statuses (`301`, `302`, `303`, `307`, `308`) as a
typed `redirect` failure instead of a generic `http` one, and parse GitLab's documented move text for the
new target. The failure carries the target **URL** parsed from the response body's
`This resource has been moved permanently to <url>` sentence; the Panel extracts the project later. A body
that does not match yields `null` — never a guess, and never a move. `300` and `304` are not redirects and
stay ordinary failures.

This ticket changes the client only. Until 02 lands, a `redirect` failure renders through the Panel's
existing generic error; that is expected.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `ClientFailure` gains `{ kind: 'redirect'; target: string | null }`.
- [x] The redirect status set is exactly `301`, `302`, `303`, `307`, `308`; `300` and `304` are unchanged.
- [x] A pure parse function matches the documented sentence and returns the target **URL**; it accepts a
      full `https://` URL, tolerates a `http://` one, and returns `null` when the sentence is absent.
- [x] `call()` returns `redirect` (with the parsed target) for a redirect status, so pipelines, jobs and
      trace all surface it.
- [x] Client tests cover: each redirect status with the documented body; a redirect body without the
      sentence (`target: null`); `300`/`304` as ordinary failures; unchanged `401`/`403`/`404`.
