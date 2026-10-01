# 03: Explain a redirect that could not be followed

**What to build:** When a redirect cannot be healed — the body is not a recognisable move, the chain ran
past five hops, or the target is on another host — the Panel stops and explains, instead of showing the raw
status. One problem kind, two flavours:

- **Project moved** when the client parsed a move (the chain ran away, or the target was on another host):
  name the target, and hint to update the git remote or the Project setting.
- **GitLab redirected this request** when the body was not a move (an expired session bounced to SSO, a
  host or scheme redirect): hint to check the host and the Project setting.

Both flavours offer an action that opens the **old path's** web URL (`<origin>/<old project>`); GitLab's
own redirect takes the browser from there to the project's page. The action uses the host port's `openUrl`.

**Blocked by:** 02 — Heal the session project and retry.

**Status:** done

- [x] A redirect with no parsed target renders the "GitLab redirected this request" flavour.
- [x] A move that overran the hop cap, or whose target was on another host, renders the "Project moved"
      flavour naming the target.
- [x] Each flavour offers an action that calls `openUrl` with the old path's web URL.
- [x] The generic `unexpected response (301)` string is no longer reachable for a redirect status.
- [x] Panel tests cover both flavours of title and hint, and the action's URL.
