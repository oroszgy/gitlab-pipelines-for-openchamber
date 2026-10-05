# Spec: A configurable GitLab host

> **Superseded.** The built-in-host / proxy split described here is replaced by
> [`docs/specs/oss-release.md`](oss-release.md) and ADR-0006. Kept for the decision trail.

Status: superseded by [`docs/specs/oss-release.md`](oss-release.md) — the built-in/proxy split is replaced by service-owned configuration with `gitlab.com` as the default host.
Feature: `configurable-host`

## Problem Statement

The Extension talks to exactly one GitLab, baked into its manifest at build time. A developer who works
across a self-managed instance and `gitlab.com`, or who wants to install the Extension against a
different GitLab, has to edit `package.json` and `panel/config.ts` and rebuild. The Integrations card
has nowhere to type the host, and the Panel's `project` setting only pins a project, not where to find
it. In practice the host is a fact about the installation, not about the code, and it should be
configurable without a rebuild.

## Solution

Add a `host` setting to the Integrations card. Left empty — or set to the built-in instance — nothing
changes: the Extension uses the origin baked into its manifest and the host-injected token, exactly as
today. Set to any other GitLab, the Extension routes its GitLab calls through a small local proxy
service it ships, using a personal access token supplied in the `token` setting. The header always
shows which **Configured host** the Panel is talking to, and a project on any other host is still
reported as `host-mismatch`.

## User Stories

1. As a developer, I want to set the GitLab host on the Integrations card, so that I can point the
   Extension at my instance without editing code.
2. As a developer, I want the Extension to work with no `host` set, so that installing it against the
   built-in instance needs no configuration at all.
3. As a developer, I want typing the built-in instance into `host` to keep using the secure built-in
   path, so that I never manage two credentials for the same host.
4. As a developer, I want the built-in path to keep the token inside OpenChamber's token store, so that
   the default install is no less safe than it is today.
5. As a developer using a custom host, I want to supply a personal access token in a setting, so that
   the proxy can authenticate to that host.
6. As a developer using a custom host, I want the Panel to tell me clearly when that token is missing,
   so that I know what to fix rather than seeing an unexplained failure.
7. As a developer, I want the settings labelled tersely but declared next to the existing Connect flow,
   so that the card stays readable.
8. As a developer, I want the header to show the Configured host and resolved project, so that I can see
   which GitLab the Panel is actually talking to.
9. As a developer, I want a project whose remote is on some other host to keep reporting
   `host-mismatch` against the Configured host, so that a wrong setting is obvious.
10. As a developer, I want the `project` override to keep working on both paths, so that a project whose
    remote does not resolve is still watchable.
11. As a developer, I want the Extension to refuse a non-`https` host, so that a typo cannot send my
    token over plaintext.
12. As a developer, I want TLS verified with no opt-out, so that the proxy cannot be quietly downgraded.
13. As a developer, I want the proxy to time out rather than hang the Panel, so that a bad host fails
    fast.
14. As a developer, I want a response size cap on the proxy, so that a huge log cannot wedge the Panel.
15. As a developer, I want my token never written to a log, so that it cannot leak through diagnostics.
16. As a developer, I want the proxy bound to loopback and requiring the host-issued bearer, so that
    nothing else on the machine can use it as an open relay.
17. As a developer, I want switching the `host` setting to re-resolve and re-fetch, so that I can move
    between GitLabs without restarting.
18. As a developer, I want switching the host to clear stale Pipelines and Jobs from the previous host,
    so that I never read another host's data as if it were current.
19. As a developer, I want the built-in Connect flow hidden or inert once a custom host is set, so that I
    am not asked to connect a token that will not be used.
20. As a developer, I want Pipelines, Jobs, stages, the log drawer and polling to behave identically on
    both paths, so that the host is a transport detail, not a second product.
21. As a developer, I want the `host-mismatch` state to name both the detected host and the Configured
    host, so that I can correct whichever is wrong.
22. As a developer, I want a failed proxy request to surface as a network error, not as an empty result,
    so that a broken proxy does not look like a project with no Pipelines.
23. As a developer, I want the Extension to keep working when the proxy service is not granted, so that
    the built-in path is unaffected by the service grant.
24. As a developer, I want the Extension to tell me when the service is unavailable on a custom host, so
    that I understand it is a grant or process problem.
25. As a developer, I want the install to show the service grant before anything is spawned, so that I
    consent to a local process knowingly.
26. As a developer, I want the built-in host and the custom-host mode to be distinguishable in the
    header, so that I can tell at a glance which one is in use.
27. As a developer, I want the proxy to forward only the request the Panel asks for, so that the service
    is a narrow proxy and not a general fetch tool.
28. As a developer, I want the host setting to accept a bare host or a full `https://` origin, so that I
    do not have to remember which spelling the setting wants.
29. As a developer, I want a malformed host setting to be a clear failure state, so that a typo does not
    silently fall back to the built-in host.
30. As a developer, I want the proxy to strip the token from anything it returns, so that the Panel never
    has to defend against echoing it back.
31. As a maintainer, I want all GitLab path, query and status logic to stay in the Panel's tested
    modules, so that the proxy stays small and the behaviour stays testable.
32. As a maintainer, I want the Settings payload to be the only thing that crosses the Panel→service
    boundary, so that there is one place to audit the token's journey.
33. As a maintainer, I want the request seam to stay single, so that a second transport does not become a
    second way to talk to GitLab.
34. As a developer in a linked worktree or on a non-happy path, I want the existing states
    (`no-project`, `not-a-repo`, `linked-worktree`, `host-mismatch`, `unauthorized`, `not-found`) to
    behave the same on both paths, so that resolution does not fork.
35. As a developer, I want polling, the stale-response guard and the live log to be transport-agnostic,
    so that a custom host gets the same liveness as the built-in one.

## Implementation Decisions

**Two modes, one seam.** A **Configured host** is either the **Built-in host** or the `host` setting. The
Panel resolves it once per refresh:

- **Built-in mode** — `host` empty, or `hostOfOrigin(host) === hostOfOrigin(manifest apiOrigin)`. Uses the
  existing `integration.token` + host request bridge. The PAT is host-held; the Panel never sees it.
- **Custom-host mode** — anything else. Uses the new local proxy service. The `token` setting is the PAT.

Everything downstream is unchanged: the same `gitlab-client` builds the same paths and queries, the same
`status`/`stage-groups`/`poll`/`format` modules run, the same renderer draws. Only the transport differs,
and it differs by injecting a *requester* into the client rather than by branching inside it.

**The manifest** gains `contributes.service` (`entry`, `runtime: "host"`, no `exec` or `socket`
permissions) alongside the existing `integration.token`, whose `apiOrigin` stays the Built-in host. The
integration declares two more settings, `host` and `token`, terse labels, next to `project`. Declaring
both an integration and a service is supported.

**The proxy service** is a dumb HTTPS proxy. The Panel sends a request carrying the base URL, the PAT,
the method, the path and the query; the service performs the call and returns `{ status, body }`. It
holds no GitLab knowledge. Contract decisions:

- Base URL and PAT travel in the request **body**, never the query string, so the PAT is not left in
  anything that logs a URL.
- Base URL must parse as `https:` with an empty username/password and no path beyond `/`; anything else
  is refused.
- TLS is verified and never bypassed.
- A request timeout on the order of the host's own (~20 s), and a response size cap, so a bad host or a
  huge log cannot wedge the Panel.
- The PAT is never logged, and is stripped from any error the service returns.
- The service binds `127.0.0.1` on `OPENCHAMBER_SERVICE_PORT` and requires
  `Authorization: Bearer <OPENCHAMBER_SERVICE_TOKEN>` on every request, including its health route. It
  serves one health route and one proxy route, nothing else.
- It cannot push to the Panel; the Panel's existing polling is the model.

**The Panel** treats the mode as part of its configured-host resolution:

- `configuredHost()` returns the Configured host, and `host-mismatch` compares the derived remote against
  it. The mismatch state names both hosts.
- The disconnected state is mode-aware: built-in mode still uses the connection event; custom-host mode
  reports a missing `token` setting as its own state.
- Changing `host` behaves like changing the project: it re-resolves, clears Pipelines and Jobs from the
  previous host, and refetches. A custom host never shows the built-in host's data.
- A malformed `host` is a typed failure, not a silent fallback to the Built-in host.
- Proxy failures map to the existing `network` failure, so a broken proxy is an error, never an empty
  list.

**Vocabulary.** *Built-in host* and *Configured host* are defined in `GLOSSARY.md`; ADR-0002 supersedes
ADR-0001 for custom hosts. See `docs/research/openchamber-extension-research.md` §8 for the mechanism it
builds on.

## Testing Decisions

A good test asserts external behaviour — what a module produces for a given input — never internal
structure. The feature adds no new kind of test; it uses the two seams the Panel already has.

- **The Panel's host port (extended).** `HostPort` gains `serviceRequest`, mirroring `request`; the fake
  host implements it. Panel tests keep driving the whole Panel through that one fake, now asserting both
  modes: built-in uses the request bridge, custom-host uses the service, and the mode-aware header,
  mismatch and disconnected states. This is the existing panel-test pattern.
- **The proxy handler (new).** The service's logic is a pure handler taking the request, the settings it
  was handed and an injected `fetch`, returning status and body. It is tested directly — https-only
  refusal, base-URL forms, timeout, size cap, token never logged or echoed, and forwarding only what it
  was asked for. The Node server around it stays a shell and is not unit-tested.
- **The client (unchanged seam).** `gitlab-client` tests already pass a request function; they keep using
  a fake requester, so transport swaps never reach them.
- **Manifest test.** Asserts the service contribution, the `host`/`token` settings, and that the built-in
  `apiOrigin` still matches the built-in constant.

## Out of Scope

- Talking to more than one GitLab at once, or aggregating a cross-host view.
- Trusting a custom CA or skipping TLS verification.
- OAuth against a custom host; authentication stays a personal access token.
- Streaming or push updates from the service; polling is the model.
- Encrypting the `token` setting, or moving the PAT into the host token store for custom hosts.
- Changing project/Ref resolution, the log drawer, or any behaviour that is not transport.
- A UI to manage several saved hosts.

## Further Notes

- **Why a service at all:** `apiOrigin` is static, the shipped SDK has no `origins` capability, and the
  host-injected token is bound to the baked origin; the only runtime-origin mechanism is a
  `contributes.service` (`docs/research/openchamber-extension-research.md` §8.5-8.6). The constraints were
  settled in the grilling that produced ADR-0002.
- **The trade accepted:** on a custom host the PAT leaves the token store and lives in a plain setting, in
  page memory, and in an unsandboxed process. This was chosen knowingly over a per-host build, which
  would keep the PAT host-side but require a rebuild per GitLab.
- **Same-host shortcut:** if the `host` setting names the Built-in host, the Panel stays on the secure
  path, so the common case never needs the second PAT.
