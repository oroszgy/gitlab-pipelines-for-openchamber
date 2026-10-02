# Spec: Public release — gitlab.com by default and service-owned configuration

Status: implemented — see `.scratch/oss-release/issues/01`–`06`.
Feature: `oss-release`
Supersedes: `.scratch/configurable-host` (for the transport and configuration model)

## Problem Statement

The Extension is still built for one internal GitLab instance. Its manifest bakes
`https://sdlc.webcloud.ec.europa.eu` into `integration.token.apiOrigin`, so an out-of-the-box install cannot
talk to `gitlab.com`; a public user would have to edit the code and rebuild. The earlier configurable-host
work (ADR-0002) added a `host` setting and a Proxy service, but kept a built-in host and treated every
other GitLab as an exception: a self-managed **Access token** has to sit in a plain integration setting the
Extension can neither mask nor give a default; the Integrations card shows a **Connect** flow whose token
the Extension does not use; and a user working across `gitlab.com` and a self-managed instance must
re-paste their token on every switch. The package is also still internal (`@ec/gitlab-pipelines`,
`private`, with no licence or README), so it is not something anyone else can install and trust.

## Solution

`gitlab.com` becomes the default GitLab host, and every host — `gitlab.com` included — is reached the same
way: through the Extension's **Proxy service**, which owns the configuration and the access tokens. The
Panel gains a small configuration form (Configured host, Project override, Access token) that renders the
token masked; the token is posted once to the service and never returned to the Panel. The service keeps
the configuration in a `0600` file in the user's config dir, keeps one token per host so switching hosts
never loses a token, and attaches the right token to each GitLab request itself. The manifest drops
`contributes.integration` entirely, so there is no Integrations card, no Connect flow and no host request
bridge. The package is renamed `gitlab-pipelines`, made public, and given an MIT licence and a README.

## User Stories

1. As a public user, I want to install the Extension and read my `gitlab.com` Pipelines with no host
   configuration, so that the default case just works.
2. As a self-managed user, I want to set my GitLab host, so that I can use my own instance.
3. As a user, I want the host field to accept a bare host or a full `https://` origin, so that I do not
   have to remember which spelling it wants.
4. As a user, I want `gitlab.com` to be the default even if I never open the configuration, so that the
   common case needs no setup.
5. As a user, I want to type my Access token into a masked field, so that it is not shown on screen.
6. As a user, I want to change or clear my Access token, so that I can rotate a leaked or expired one.
7. As a user, I want my token for one host to survive switching to another host, so that I never re-paste
   when I move between `gitlab.com` and a self-managed instance.
8. As a user, I want the Panel never to receive my Access token, so that a bug or an injected script in the
   panel cannot leak it.
9. As a user, I want the service to attach the token to my requests itself, so that I never handle it
   beyond typing it once.
10. As a user, I want a missing token for a host to be a clear state, so that I know what to fix.
11. As a user, I want an invalid or expired token to be a clear state, so that I know to replace it.
12. As a user, I want to see which GitLab user my token authenticates as, so that I know the credential is
    the right one.
13. As a user, I want the header to name the Configured host, so that I know which GitLab I am reading.
14. As a user, I want a project whose remote is on another host to report `host-mismatch` against my
    Configured host, so that a wrong setting is obvious rather than silent.
15. As a user, I want the Project override to keep working, so that I can read a project whose remote does
    not resolve to one.
16. As a user in a Linked worktree, I want the same resolution as before, so that nothing regresses there.
17. As a user, I want switching hosts to clear Pipelines and Jobs from the previous host, so that I never
    read another host's data as current.
18. As a user, I want the service to refuse a non-`https` host, so that a typo cannot send my token in the
    clear.
19. As a user, I want TLS verified with no opt-out, so that the connection cannot be quietly downgraded.
20. As a user, I want the service to time out and cap response size, so that a bad host or a huge Trace
    cannot wedge the Panel.
21. As a user, I want my token never written to a log and stripped from any error, so that it cannot leak
    through diagnostics.
22. As a user, I want the service bound to loopback and requiring the host-issued bearer, so that nothing
    else on the machine can use it as an open relay.
23. As a user, I want a clear state when the service is not granted or has failed, so that I know to go to
    Settings → Extensions.
24. As a user, I want the Extension to stay read-only, so that it never writes to GitLab.
25. As a user, I want the same Pipelines, Jobs, stages, log drawer and polling on every host, so that the
    host stays a transport detail and not a second product.
26. As a user, I want session handoff from a failed Job to keep working, so that I can investigate a
    failure as before.
27. As a maintainer, I want one panel host seam, so that there is a single place to audit host access.
28. As a maintainer, I want the Panel to have exactly one network path — the service — so that there is no
    second transport to keep in step.
29. As a maintainer, I want the configuration logic to be pure and tested against an injected filesystem,
    so that its tests need no disk.
30. As a maintainer, I want the proxy handler's contract unchanged, so that its existing tests still hold.
31. As a maintainer, I want configuration to come from one place, so that there is no settings/connection
    duality to reason about.
32. As a maintainer, I want the Access token's journey to be a single hop from the form to the service, so
    that it is easy to audit.
33. As a maintainer, I want the token file to be `0600`, so that at-rest security matches OpenChamber's own
    token store.
34. As a maintainer, I want an ADR and glossary that describe the new model, so that future readers know
    why it is shaped this way.
35. As a maintainer, I want the superseded `.scratch/configurable-host` spec marked as such, so that there
    is one source of truth.
36. As a maintainer, I want the package renamed and licensed, so that it can be published.
37. As a maintainer, I want a README covering install, configuration and security, so that a newcomer can
    adopt it.
38. As a maintainer, I want a version bump and a changelog entry, so that OpenChamber reloads the new
    manifest.
39. As a maintainer, I want the manifest to declare no integration, so that the Connect flow cannot appear
    at all.
40. As a user, I want the Extension's name and description in Settings to be clear, so that I can find it
    and know what it does.

## Implementation Decisions

**Manifest.** Remove `contributes.integration` entirely: no `apiOrigin`, no token scheme, no declared
settings, and therefore no Integrations card or Connect flow. Keep `contributes.panel` and
`contributes.service` (`entry`, `runtime: "host"`, no `exec` or `socket` permissions). Declare the `files`
and `sessions` capabilities only; `service` follows from the service contribution, and `network` is no
longer needed because the Panel makes no `host.request` calls. The package becomes `gitlab-pipelines`,
`private: false`, MIT-licensed, with a README.

**Host model.** `gitlab.com` is the default Configured host, a plain constant, not a special case. There
is no Built-in host. A project's derived remote host is compared against the Configured host for
`host-mismatch`, exactly as before but with no built-in fallback.

**Service configuration.** The service owns one configuration file at a per-user path (XDG
`$XDG_CONFIG_HOME` or `~/.config` on Linux, Application Support on macOS, `%APPDATA%` on Windows), written
`0600`. Its shape is the Configured host (defaulting to `gitlab.com`), the Project override, and a map of
Access tokens keyed by host. One token per host is kept, so switching hosts never discards a token. The
service never writes a token into any log or any response.

**Service routes.** `/health` is unchanged. `/git-config` is unchanged (ADR-0005). A configuration route
answers `GET` — returning the Configured host, the Project override, and, per host, only whether a token is
present — and accepts a write that sets the Configured host and Project override. A token route sets or
clears the Access token for the current host. On `/proxy`, the request carries the base URL and the GitLab
request but **not** the token; the service resolves the token for that host from its own configuration and
attaches it. A missing token is a typed error the Panel maps to its no-token state; a malformed or
non-`https` base URL is refused before any call.

**Panel.** The Panel has one network path, the service, through the single host seam. It loses the host
request bridge and the connection listener. On ready it loads configuration from the service, then
resolves the project as before. It gains a small configuration form that renders the Access token masked;
the form posts the token once and never reads it back, so the Panel can show only whether a token exists.
The Panel still shows the authenticated user by proxying `/api/v4/user` through the service, which doubles
as a token check. All existing states (`no-project`, `not-a-repo`, `linked-worktree`, `host-mismatch`,
`unauthorized`, `not-found`, the service grant/failure states) remain, with the disconnected/no-token
state now derived from the service configuration rather than the host connection.

**Proxy handler.** Its signature stays as it is — it receives an already-resolved token and an injected
`fetch`. https-only base-URL validation, TLS verification, the ~20 s timeout, the `256 000`-character cap,
and token redaction of bodies and errors all stay.

**Documentation.** ADR-0006 records this decision and supersedes ADR-0001 and ADR-0002. `GLOSSARY.md`
retires **Built-in host** and **Integration**, updates **Configured host** and **Proxy service**, and adds
**Access token** and **Project override**. The `.scratch/configurable-host` spec is marked superseded.

**Release mechanics.** Bump the version (a minor, since this is a user-observable feature) and add a
`CHANGELOG.md` entry in the same commit as the change.

## Testing Decisions

A good test asserts external behaviour — what a module produces for a given input — never internal
structure, private state or wiring. This feature reuses the two seams the codebase already has and adds
one service-side seam; no new Panel seam.

- **The Panel's host seam (existing).** Every Panel test drives the whole Panel through `FakeHost` and
  asserts on the rendered DOM. `FakeHost` gains canned configuration responses and the masked-form
  round-trip; the Panel tests cover: the default host with no configuration, a configured host, the masked
  field and its save, a missing token, an invalid token, `host-mismatch`, switching hosts clearing stale
  data, and the service grant/failure states. Prior art: the existing Panel tests.
- **The service configuration module (new).** Pure functions over an injected filesystem and injected
  path/environment, mirroring the existing git-config seam: read when absent (defaults to `gitlab.com`),
  write `0600`, set and clear a token per host, resolve a token by host, and refuse a malformed host. Prior
  art: the git-config tests.
- **The proxy handler (existing).** Its tests keep passing unchanged in intent, since its contract does
  not change; add cases for the resolved-token path where useful. Prior art: the existing proxy tests.
- **The manifest (existing).** The manifest test changes to assert the service contribution, the `files`
  and `sessions` capabilities, that there is **no** `integration`, and that nothing still pins an
  `apiOrigin`.

## Out of Scope

- Talking to more than one GitLab at once, or aggregating a cross-host view.
- Storing tokens in the OS keyring. Deferred; the `0600` file is the same security class as OpenChamber's
  own store, and a keyring would add an `exec` grant and per-platform backends. ADR-0006 records the
  deferral.
- OAuth; authentication stays a personal Access token.
- A per-host Project override; the override stays a single value.
- Migrating existing `host`/`token` settings. The Extension is pre-release, so old settings are ignored
  rather than carried over.
- The bug, performance and security audit of the existing solution, which is a separate flow over the
  resulting code.
- Publishing to npm or a marketplace; this spec makes the repo shippable, not published.

## Further Notes

**Why the integration goes.** Settings can only be declared on an integration, and an integration must
declare one of `oauth`/`token`/`host`; an integration setting field is `{ id, label }` with no secret type
and no default. So any design that keeps the self-managed token in a setting inherits an unmaskable field,
no declared default, and — because the Extension would no longer call `host.request` — a Connect flow
whose token it never uses. Moving configuration into the service removes all three at once, and lets the
service attach the token itself so the Panel never holds it.

**The trade accepted.** Every user, including a `gitlab.com`-only user, must grant the Proxy service, and
the Access token's home changes from OpenChamber's host token store to the Extension's own service process
and file. In exchange, the default host is `gitlab.com`, the token is masked and per-host, and the
Extension has a single transport and a single configuration source.

**The service had to be granted anyway for Linked worktrees** (ADR-0005); this widens its remit from "when
a Linked worktree or a custom host is in play" to "always", which the install's grant description and the
README should state plainly.

**Follow-on:** once this ships, the pre-release review (`/code-review` since the root commit) runs over it;
its findings become their own tickets.
