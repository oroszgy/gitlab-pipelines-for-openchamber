# Spec: GitLab Pipelines panel

Status: implemented — see `.scratch/pipelines-panel/issues/01`–`08`.
Feature: `pipelines-panel`

## Problem Statement

Someone running AI coding sessions in OpenChamber against GitLab-hosted repos cannot see the state of
their CI without leaving the workspace. To answer "did my branch's Pipeline pass?", "what Stage is it
in?", or "why did that Job fail?", they switch to a browser and the GitLab UI. That context switch
breaks the loop between the code and the CI that validates it, and it happens constantly while an
agent is iterating.

## Solution

A read-only **Pipelines Panel** in OpenChamber's right-hand rail. It works out which GitLab project
the currently open project belongs to, shows that project's Pipelines for the current Ref (with a
toggle to all refs), expands a Pipeline into its Jobs grouped by Stage, and shows the tail of a Job's
log in a bottom drawer. Status stays live while anything is running; nothing is ever written back to
GitLab.

## User Stories

1. As a developer working in an OpenChamber session, I want a Pipelines Panel in the right rail, so
   that I can see CI status without leaving the workspace.
2. As a developer, I want the Panel to work out which GitLab project I am in from the project that is
   open, so that I do not have to configure anything.
3. As a developer, I want the Panel to read the GitLab host and project path from the open project's
   git remote, so that it targets the right project with no typing.
4. As a developer, I want the Panel to default to the Pipelines for my current Ref, so that the
   first thing I see is the CI for the code I am working on.
5. As a developer, I want a Branch / All refs toggle, so that I can widen the list to the whole
   project when I need to.
6. As a developer, I want the newest Pipeline shown first, so that the most relevant run is always
   at the top.
7. As a developer, I want each Pipeline row to show its Status, Ref, short SHA and duration/age, so
   that I can judge at a glance what happened and when.
8. As a developer, I want Pipeline rows to show their `iid` (and a merge-request marker where
   relevant), so that I can match a row to GitLab.
9. As a developer, I want to expand a Pipeline to see its Jobs grouped by Stage, so that I can see
   where a run got to and what failed.
10. As a developer, I want each Stage group to show how many of its Jobs are done, so that I can read
    progress without opening every group.
11. As a developer, I want a distinct, consistent colour and glyph for every Status across Pipelines,
    Jobs and Stages, so that I can read the panel by shape and colour alone.
12. As a developer, I want a Job whose failure is allowed to read as a warning rather than an error,
    so that I am not alarmed by a Pipeline that actually passed.
13. As a developer, I want to open a Job's log tail in a bottom drawer, so that I can see why it
    failed without losing my place in the list.
14. As a developer, I want the log tail to wrap rather than scroll sideways, so that it stays
    readable in a narrow rail.
15. As a developer, I want a "view full log in GitLab" affordance pinned in the log, so that I can
    get the whole thing when the tail is not enough.
16. As a developer, I want the log drawer to close back to the list, so that I can keep browsing.
17. As a developer, I want a running Pipeline to show a live elapsed time, so that I can see it is
    still making progress.
18. As a developer, I want the Panel to refresh itself while something is running, so that I do not
    have to click.
19. As a developer, I want the Panel to stop polling once everything has finished, so that it is not
    making pointless requests.
20. As a developer, I want a manual refresh control, so that I can force an update at any time.
21. As a developer, I want to see when the Panel last updated, so that I know how fresh the data is.
22. As a developer, I want the Panel to tell me clearly when no project is open, so that I know why
    it is empty.
23. As a developer, I want the Panel to tell me when the open project is not a Git repo, so that I am
    not left guessing.
24. As a developer, I want the Panel to tell me when the project's git remote is on a different
    GitLab host than the one configured, so that I understand the mismatch rather than seeing an
    unexplained failure.
25. As a developer, I want the Panel to tell me when my GitLab token is not connected, so that I know
    what to fix.
26. As a developer, I want the Panel to tell me when the current Ref simply has no Pipelines, so that
    an empty list does not look like an error.
27. As a developer, I want to optionally pin a specific GitLab project by setting, so that I can
    watch a project whose remote does not resolve.
28. As a developer, I want the Panel to read correctly in both the light and dark OpenChamber themes,
    so that it never looks out of place.
29. As a developer, I want the Panel to show during first load that it is loading, so that an empty
    panel is not mistaken for a result.
30. As a developer, I want a Pipeline or Job I select to be linkable back to GitLab, so that I can
    hand off to the full UI when I need more.
31. As a developer working in a git worktree, I want the Panel to find my current Ref anyway — and to
    tell me plainly when a linked worktree hides the remote — so that it works in the way OpenChamber
    sessions commonly run and the one case needing the override is obvious.
32. As a developer, I want the Panel to keep working if I switch the open project, so that it follows
    my context.

## Implementation Decisions

**Extension shape.** A folder Extension: `package.json` with the `openchamber` manifest, a
`panel/index.html`, and a built IIFE `panel/main.js`. OpenChamber never compiles it; the source is
TypeScript bundled with the SDK's own `openchamber-guest-bundle` via bun. This repo is the Extension
itself — manifest and `panel/` at the root, docs alongside.

**Identity.** Panel id `gitlab-pipelines`, rail label **Pipelines**, built-in Remixicon
`git-merge-line`.

**Integration.** An `integration.token` whose `apiOrigin` is baked to the single GitLab host
(self-managed or `gitlab.com`) and whose `scheme` is `bearer`; the user supplies a personal access
token with `read_api`. The host injects the token, so it never reaches the panel. See ADR-0001 for
why one host is baked in. Capabilities: `files` and `sessions` (plus the implicit `network`). An
optional `project` setting overrides the derived project.

**One seam: the host port.** Every dependency on OpenChamber is expressed as a narrow interface —
ready context and connection changes, `request` to the configured origin, reading a project file,
listing projects, listing worktrees, opening a URL, dispose. The real adapter wraps `connectHost()`;
tests substitute a fake. All logic sits behind it as pure modules:

- **project-resolver** — ready context + raw file contents + worktrees → `{ host, projectPath, ref }`
  or a typed failure: `no-project`, `not-a-repo`, `host-mismatch`. Owns remote-URL parsing for the
  scp-like, ssh and https forms, including subgroups and a trailing `.git`.
- **gitlab-client** — builds the paths and query for Pipelines, Jobs and a Job's trace against the
  configured origin, and maps host errors and HTTP statuses to typed failures. Path building is pure;
  the call itself is one line over the port.
- **status** — a Pipeline or Job Status (accounting for `allow_failure`) → tone, label and glyph. One
  map, shared by pipeline rows, job rows and stage chips.
- **stage-groups** — a flat Job list → ordered Stage groups with `done/total` counts.
- **poll** — the current Statuses plus elapsed time (clock injected) → the next delay or stop. This
  is the adaptive rule: poll while anything is `pending`, `running`, `created`, `preparing`,
  `canceling` or `waiting_for_*`; stop otherwise. The interval backs off (×2 after 2 minutes of
  continuous activity, ×3 after 10) so an all-night run is not polled at full rate.
- **format** — short SHA, duration, relative age.
- **panel** — the only module that touches the DOM. Consumes the port and the modules above, mounts
  into the rail, renders rows, stage groups and the log drawer, and owns the Branch / All refs
  toggle, the refresh control and the stale-response guard.

**Project resolution.** Take the open project's `directory` from the ready context. Read `.git/config`
to find the remote URL and parse out the host and project path; if that host is not the configured
`apiOrigin`, resolve to `host-mismatch`. Determine the current Ref from the host worktree list
(matching `directory`), falling back to reading `.git/HEAD`. A configured `project` setting
short-circuits all of this.

`.git` may itself be a **file** — a linked worktree, which is how OpenChamber sessions commonly run —
in which case `.git/config` and `.git/HEAD` are unreadable because the pointer target normally lies
outside the open project. The host API exposes **no** git remote (and no project id/remote in the
ready context), so the remote cannot be recovered in this case; the Ref still comes from the worktree
list. This is reported as its own `linked-worktree` failure — naming the Ref it did find — rather than
the misleading `not-a-repo`, and the `project` override is the way out. See
`docs/research/openchamber-project-context-research.md` §3–§4, §7.

**Data.** Pipelines come from the project's pipelines endpoint, filtered by `ref` in Branch scope and
ordered by most-recently-updated in All refs scope, with a modest page size. Expanding a Pipeline
fetches its Jobs. Opening a Job fetches its trace, from which the tail is shown.

**Panel behaviour.** Adaptive polling with a manual refresh, a stale-response guard so a slow reply
cannot overwrite a newer one, and the timer cleared when the Panel is disposed. A manual refresh is
always available. A Jobs or trace fetch that *fails* is reported as an error, kept distinct from a
genuinely empty result (no Jobs, no log output): the two mean different things and must not be
conflated. Beyond the connected/disconnected failures the Panel names four non-happy states —
`no-project`, `not-a-repo`, `linked-worktree`, `host-mismatch` — plus `unauthorized`/`not-found` for
a token or project GitLab cannot see.

**Layout (settled by the prototype, `prototype/panel-ui`).** Variant A's accordion is the base, with
Variant B's bottom drawer for the log:

- Collapsed Pipeline row is **two lines** — Ref and short SHA with duration/age right-aligned on the
  first, Status and `iid` and source/merge-request on the second. A third line does not fit at 320px.
- Ref scope is a segmented **Branch / All refs** control in the header. Ref stays a *row field* —
  there is no ref grouping.
- A Stage group is indented under its Pipeline with a `done/total` count, all Stages visible at once.
- The log opens in a **bottom drawer** over the Panel, showing the **last 40 lines** wrapped
  (`white-space: pre-wrap`, never a horizontal scroll axis), with "view full log in GitLab" pinned.
  If the drawer proves too cramped at the narrowest width, a full-panel push view is the fallback.
- Active state: one spinning ring on the running glyph (`info` tone), a live-ticking elapsed time,
  and an "updated Ns ago" indicator with a pulsing dot in the header; an indeterminate top bar only
  during first load.
- The header **degrades** on non-happy paths: no phantom project path, no empty `Branch 0 / All refs
  0` tabs, no "just now" when nothing is loading.
- The SDK UI kit's `mountList` row (leading / title+subtitle / badge / meta) cannot express this row
  at 320px, so the row is composed from kit primitives and `--oc-*` tokens, kept in one place.

**Status → colour.** One shared map across Pipelines, Jobs and Stages, covering `success`, `failed`,
`failed + allow_failure` (reads as a warning, "failed (allowed)"), `running`, `pending`, `preparing`,
`canceling`, `created`, `scheduled`, `waiting_for_resource`, `waiting_for_callback`, `canceled`,
`skipped` and `manual`. Every Status has a unique **label and glyph** pair, its own tone where the
distinction earns one, and only the running glyph animates. (`preparing` and `canceling` deliberately
share the loader glyph and warning tone; their labels keep them apart.)

## Testing Decisions

A good test asserts **external behaviour** — what the module produces for a given input — never
internal structure. Tests drive the pure modules directly with table-driven cases, and the panel
through the fake host port, asserting on the rendered DOM.

Modules under test:

- **project-resolver** — every remote-URL form, subgroups, trailing `.git`, worktree and HEAD
  fallback, linked-worktree detection, and each typed failure.
- **gitlab-client** — path and query construction for each scope, and error mapping.
- **status** — every Status, including `failed` with and without `allow_failure`, and that no two
  Statuses share a label and glyph.
- **stage-groups** — ordering, `done/total`, empty stages, skipped and manual Jobs.
- **poll** — active vs settled status sets, and the stop condition.
- **format** — short SHA, durations, relative ages at their boundaries, and the trailing-newline
  terminator in the log tail.
- **panel** — driven through the fake host: a fake `.git/config`, fake worktree data and fake
  `request` responses; asserts the list, expansion, the log drawer, the non-happy states (including
  `linked-worktree`), that a failed Jobs/trace fetch reads as an error rather than an empty result,
  and that polling continues only while something is running.

There is no prior art in the repo (it is greenfield); the prototype is a visual reference, not a
test. The runner is `bun test`, with a DOM shim only for the panel tests.

## Out of Scope

- Handing a failed Pipeline to an agent (a session with context).
- Any write action: retry, cancel, play a manual Job, trigger a Pipeline.
- More than one GitLab host, or an arbitrary host chosen at runtime — that needs the service
  transport ADR-0001 rejects.
- A cross-project view of Pipelines.
- Nested or child Pipeline rendering, and retried-Job grouping.
- GraphQL; authentication beyond a personal access token (no OAuth).
- Push or streaming updates; polling is the model.
- Localisation, mobile layout, and settings beyond the single project override.

## Further Notes

- **Primary source for the layout:** branch `prototype/panel-ui`, commit `5ee4b71` — its `README.md`
  and `shots/` are the reference for row density, the drawer, the error states and the status→colour
  map. It is not to be merged; `main` keeps only the validated decisions.
- **Decisions already recorded:** `docs/adr/0001-bake-gitlab-host-into-manifest.md`; domain language
  in `GLOSSARY.md`.
- **Research, cited:** `docs/research/openchamber-extension-research.md` (SDK, manifest, host API,
  GitLab endpoints, and the verified self-managed mechanism) and
  `docs/research/openchamber-project-context-research.md` (how the project and Ref are derived).
- The literal GitLab host is filled in when the Extension is implemented against a specific instance.

## Comments
