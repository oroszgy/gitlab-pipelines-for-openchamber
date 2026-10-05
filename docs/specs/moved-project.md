# Spec: Follow a moved GitLab project

Status: ready-for-agent
Feature: `moved-project`

## Problem Statement

A GitLab project can be renamed or transferred to another namespace, and the Panel's path for it — derived
from the git remote, or set in the `project` override — can go stale. GitLab answers a request for the old
path with a redirect (301) whose `Location` names the project's current identity. OpenChamber's `request`
bridge returns only `{ status, body }` and does not follow the redirect, so the Panel shows
`GitLab returned an unexpected response (301)` and offers no way out. The user has to know to update their
git remote or the Project setting — the very thing the failure does not tell them.

## Solution

When a GitLab fetch comes back as a redirect, the Panel follows it. The GitLab client recognises the
redirect statuses, parses the new location out of GitLab's documented response text — `This resource has
been moved permanently to <url>` — and returns a typed `redirect` failure carrying that target. The Panel
adopts the target as the project for the session, retries the fetch, and carries on showing pipelines. A
project keeps its numeric id across a move, so the target (`/api/v4/projects/<id>`) is stable and the Panel
calls the project by it from then on.

When the target cannot be read — the body is not a recognisable move, or the redirect chain runs away — the
Panel stops and explains: a "Project moved" state when the body looked like a move, a plain "GitLab
redirected this request" state otherwise, both pointing at the git remote or the Project setting and
offering to open the project in GitLab. A successful heal is surfaced once, so the user knows why pipelines
appeared and what to fix in their remote. Healing is session-scoped: the Panel cannot write integration
settings.

## User Stories

1. As a developer whose GitLab project was moved, I want the Panel to follow the move and keep showing
   pipelines, so that a rename on GitLab's side does not break my view.
2. As a developer, I want the project's stable numeric id used after a heal, so that later renames do not
   break the view again.
3. As a developer, I want the header to show the id the Panel is actually using, so that what I see matches
   the requests being made.
4. As a developer, I want a one-time notice naming the old path and the target, so that I understand what
   happened and can fix my git remote at my leisure.
5. As a developer whose remote is stale, I want the notice dismissible, so that it does not nag after I have
   read it.
6. As a developer who cannot be healed, I want a clear "Project moved" state pointing at the git remote or
   the Project setting, so that I know the one thing to change.
7. As a developer, I want that state to offer opening the project in GitLab, so that I can see it and copy
   the new path.
8. As a developer, I want a redirect that is _not_ a move — an expired session bounced to SSO, a host or
   scheme redirect — reported as a redirect, not mistaken for a move, so that the next step is not
   misleading.
9. As a developer, I want a redirect loop to stop and explain rather than spin, so that a broken host does
   not hang the Panel.
10. As a developer on a custom host, I want the same redirect handling as the built-in host, so that
    behaviour does not depend on which transport is in use.
11. As a developer, I want a refresh not to pay for the move again, so that polling stays cheap after the
    first heal.
12. As a maintainer, I want the parse and the redirect statuses in the tested client, so that the wire
    knowledge stays in one place.
13. As a maintainer, I want the failure to distinguish a parsed target from an unparsed redirect, so that
    the Panel can word two flavours from one state.
14. As a maintainer, I want healing to change only the resolved project, so that jobs, traces, ref, scope
    and polling are all untouched.
15. As a maintainer, I want a host switch to forget a healed project, so that one host's identity never
    leaks into another's.

## Implementation Decisions

**Redirect statuses.** The client treats `301`, `302`, `303`, `307`, `308` as redirects. `300` (Multiple
Choices) and `304` (Not Modified) are not redirects and stay ordinary failures. All the Panel's calls are
`GET`, so the method-preserving distinction between `301`/`302`/`303` and `307`/`308` does not arise.

**The parse.** A pure function matches GitLab's documented sentence and pulls the target out of it. The
documented body is plain text:

```
This resource has been moved permanently to https://gitlab.example.com/api/v4/projects/81
```

The failure carries the target **URL**. Later, the Panel takes the project reference from it — the segment
after `/api/v4/projects/`, a numeric id or an encoded path — but only when the URL's host is the effective
host. A body that does not match yields `null`, never a guess. This strictness is deliberate: the reason
to parse at all is that `Location` is unreachable, and a loose URL scan would turn an unrelated redirect
into a false move.

**The typed failure.** `ClientFailure` gains `{ kind: 'redirect'; target: string | null }`. `null` means "a
redirect, but not a recognisable move". `call()` produces it, so every fetch — pipelines, jobs, trace —
surfaces it the same way.

**Who heals.** The client surfaces the failure; the Panel decides. On a `redirect` with a target the Panel
sets the resolved project to the target, records it, and retries the fetch. On a `redirect` with no target,
or on exceeding the hop cap, it shows the fallback state. The hop count lives in the Panel's retry loop,
not in the client, which stays stateless.

**Lifetime.** The healed target is cached on the Panel, keyed by the project path that triggered the move,
for the Panel's lifetime. A refresh — which re-derives the same stale remote path — reuses the cache and
never re-follows. `forgetHostData()` clears it on a host switch, so a healed id never crosses hosts. Nothing
is written to settings; the user fixes the remote or the `project` override.

**Origin.** The bridge pins `request` to the manifest origin, so the only followable target is one on the
effective host. A target on any other host is not followed; it falls to the *Project moved* state, which
names the target.

**Downstream.** Jobs, traces, the ref, the scope and polling are unchanged: they read the resolved project,
which is now the healed target.

**The fallback state.** One problem kind, two flavours, chosen by whether the client parsed a move:

- _Project moved_ — `"This project's path no longer resolves; GitLab has moved it to"` the target. Hint:
  update the git remote or the Project setting.
- _GitLab redirected this request_ — the redirect was not a recognisable move. Hint: check the host and the
  Project setting.

Both offer an action to open the **old path's** web URL (`<origin>/<old project>`) — GitLab's own redirect
takes the browser from there to the project's page.

**The notice.** A successful heal shows a one-time, dismissible notice: `Showing <old path> as <target>`.
Dismissal is in-memory for the Panel's lifetime.

**Vocabulary.** _Moved project_ and _Project id_ are defined in `GLOSSARY.md`; the decision and its
alternatives are recorded in `docs/adr/0003-follow-a-moved-projects-redirect.md`.

## Testing Decisions

A good test asserts external behaviour — what a module produces for a given input — never internal
structure. The feature uses the two seams that already exist.

- **The client (existing seam).** `gitlab-client` tests already pass a fake requester. New cases: each
  redirect status with the documented body yields `{ kind: 'redirect', target }`; a redirect body without
  the sentence yields `target: null`; `300`/`304` stay ordinary failures; a `404`/`401` is unchanged; the
  parse accepts a full `https` URL, tolerates an `http` one, and returns `null` otherwise.
- **The Panel (existing seam).** Panel tests drive the whole Panel through the fake host port. New cases: a
  `301` with a target heals and renders the pipelines; the header then shows the target; a refresh reuses
  the cached target without a second redirect; a chain over five redirects falls to the fallback; a
  redirect with no target falls to the fallback; each flavour renders its own title; a wrong-host target
  falls to the fallback; the action calls `openUrl` with the old path's web URL; the notice appears once
  and dismisses; switching hosts clears a healed target.
- **No new test kind.** The proxy handler is untouched; the custom-host path is covered through the same
  Panel fake.

## Out of Scope

- Writing the corrected path back to the `project` setting, or to the user's git config.
- Resolving a move without a redirect: a search by name, a project-alias API, or any guessing when the body
  does not say.
- Persisting a healed target across Panel remounts or across sessions.
- Following a redirect to a different host, or to a non-`api/v4` URL.
- Changing the transport (the built-in bridge still does not follow redirects); the upstream note stands.
- Any change to project/Ref resolution, the log drawer, or polling.

## Further Notes

- **Why parse text at all:** the host bridge returns only `{ status, body }` (`panel/host-port.ts:25-29`;
  SDK `contract.d.ts:70-73`), validated to those two keys, so `Location` never reaches the Panel. GitLab's
  documented body is the only in-repo handle on the target. See ADR-0003.
- **The custom-host asymmetry:** the proxy's Node `fetch` follows same-origin redirects by default, so a
  custom host already healed implicitly and non-obviously. Implementing in the shared client makes both
  paths explicit and identical; there the new code is a safety net.
- **Upstream note:** the durable fix is for the host to follow redirects (or expose `Location`) in
  `host.request`. That is outside this repo; the Panel-side heal is what unblocks users now.
- **Settled in the grilling** that produced ADR-0003: heal-then-guide; strict documented-text parse; call
  and display the target; typed failure from the client; panel-lifetime cache; five-hop cap; two fallback
  flavours; one-time from→to notice.
