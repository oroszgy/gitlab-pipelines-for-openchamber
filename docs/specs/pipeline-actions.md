# Spec: Pipeline and Job actions

Status: implemented — see tickets `pipeline-actions/01`–`07` (mapped in [`README.md`](README.md)).
Feature: `pipeline-actions`
Follows: [`pipelines-panel.md`](pipelines-panel.md) (whose Out of Scope deferred "any write action"),
[`downstream-pipelines.md`](downstream-pipelines.md) (which deferred retry/cancel/play/trigger), and
[`session-handoff.md`](session-handoff.md) (the first, host-side outbound action this generalises).

## Problem Statement

The Panel shows a red Pipeline, a waiting manual Job, or a Pipeline stuck running, but cannot act on
any of it. To retry a Job, play a manual Job, cancel a runaway Pipeline, or start a fresh Pipeline,
the developer leaves the workspace, finds the right GitLab page and clicks there. That is the loop
the Panel exists to close, and it is most painful exactly when CI needs attention.

The Extension has been deliberately read-only: the Proxy service refuses every non-`GET`, and
`README.md`, `CODING_STANDARDS.md` and `GLOSSARY.md` all promise that. Adding actions means changing
that promise, so the change has to be explicit, capability-gated, and reversible for a user who has
only a read-scoped token.

## Solution

A small set of GitLab write actions, offered only when the token and the user's role allow them:

- On a Job row and in the log drawer: **Retry**, **Play** (manual jobs), **Cancel**, **Force cancel**.
- On a Pipeline row: **Retry pipeline**, **Cancel pipeline**.
- In the Panel header: **Run pipeline**, which triggers a new Pipeline for the current Ref.

Each row carries a single `⋯` overflow menu holding the actions that apply to that row's Status. The
existing **Debug this job** handoff stays a visible, labelled button beside the menu. Actions are
offered for the open project's rows *and* for other-project Downstream cards, each gated by that
project's own permissions. Outcomes are reported in a Panel-level notice, and the affected data is
refetched immediately.

## User Stories

1. As a developer whose Job failed, I want to **Retry** it without leaving the Panel, so that I can
   re-run a flaky or fixed job.
2. As a developer whose Job was canceled, I want to **Retry** it, so that I can recover it.
3. As a developer whose Job passed but whose environment drifted, I want to **Retry** it too, so that
   I can re-run a passing job on purpose.
4. As a developer, I want a manual Job to offer **Play**, so that I can start a deploy or a manual
   gate from the Panel.
5. As a developer, I want a running or pending Job to offer **Cancel**, so that I can stop work I no
   longer need.
6. As a developer, I want a Job already `canceling` to offer **Force cancel**, so that a Job stuck in
   cancellation can be finished off.
7. As a developer, I want a failed or canceled Pipeline to offer **Retry pipeline**, so that I can
   re-run its failed Jobs in one click.
8. As a developer, I want an active Pipeline to offer **Cancel pipeline**, so that I can stop a whole
   run.
9. As a developer, I want a **Run pipeline** action for the current Ref, so that I can start a fresh
   Pipeline without guessing the ref.
10. As a developer, I want actions as a compact `⋯` menu on each row, so that the list stays readable
    at rail width.
11. As a developer, I want the menu mirrored in the log drawer, so that I can act while reading a Job.
12. As a developer with a `read_api` token, I want the actions to be absent or disabled with a reason,
    so that I am never offered a button that can only fail.
13. As a developer without permission on a project, I want its actions hidden, so that I do not chase
    a 403.
14. As a developer, I want to act on a Downstream card in another project when my token allows it, so
    that a broken downstream is fixable without switching projects.
15. As a developer, I want the outcome of an action to appear as a notice — auto-dismissing on
    success, persistent on failure with the reason — so that I know what happened.
16. As a developer, I want the affected Pipeline to refresh immediately after an action, so that I see
    the new state without waiting for a poll.
17. As a developer read-only by choice, I want the documentation to say plainly that actions are
    possible only when my token allows them, so the security posture is honest.
18. As a developer, I do not want a confirmation dialog for Retry or Play, so that the common action
    is one click.

## Implementation Decisions

### The service boundary changes, deliberately

`service/proxy.ts` currently allows only `GET` (`METHODS`, `handleProxy`). It gains a second rule: a
`POST` is permitted when its path starts with `/api/v4/`; every other method stays refused. This is
the loosest option considered: it lets the Panel reach **any** GitLab write endpoint its token
permits, not only the six actions here, and it is the first GitLab-specific policy in a proxy that
was "deliberately knowing nothing about GitLab". It is recorded in an ADR and named in the README.

Everything else at the boundary is unchanged: the base URL is still normalised to an `https` origin
the service holds a token for, the path is still pinned to that origin, redirects are still manual,
and the body/size/time caps still hold. The transport already types `POST`, so no type changes.

### Client: project detail, token scopes, and six write calls

`panel/gitlab-client.ts` gains:

- `fetchProject(requester, project)` → `GET /api/v4/projects/:id`, typed `ProjectDetail`
  (`id`, `path_with_namespace`, `permissions`, `ci_restrict_pipeline_cancellation_role`). This is the
  first whole-project call; every existing call appends a sub-resource.
- `fetchTokenScopes(requester)` → `GET /api/v4/personal_access_tokens/self`, typed
  `{ scopes: string[] }`, with a `not-found`/`forbidden` result meaning "unknown", not "no scope".
- `retryJob`, `playJob`, `cancelJob(jobId, force)`, `retryPipeline`, `cancelPipeline`,
  `triggerPipeline(ref)` — each a `POST` to its documented path (`?ref=` for the trigger, a JSON
  `{ force: true }` body for force-cancel). All reuse `call()`; none passes variables or job inputs.

`mapHttpStatus` splits its current 401/403 collapse into `unauthorized` (401) and `forbidden` (403),
so a refused write can say "not allowed" rather than reusing the "token rejected" copy. The read
paths that relied on the old `unauthorized` kind are updated to match, with their tests.

### Capability: a pure module in front of the Panel

`panel/actions.ts`, pure and table-tested, turns `(project access level, cancel-restriction role,
token has `api` scope, entity status, entity kind)` into the list of allowed action ids, and says why
each is absent. The rules:

| Action | Allowed when |
| --- | --- |
| Retry (Job) | status `failed`, `canceled` or `success`; role ≥ Developer |
| Play (Job) | status `manual`; role ≥ Developer |
| Cancel (Job) | status `created`, `pending`, `preparing`, `running`, `waiting_for_resource` or `waiting_for_callback`; role ≥ the project's cancel-restriction role |
| Force cancel (Job) | status `canceling`; role ≥ Maintainer |
| Retry pipeline | status `failed` or `canceled`; role ≥ Developer |
| Cancel pipeline | status `created`, `pending`, `preparing`, `running`, `canceling` or `waiting_for_resource`; role ≥ cancel-restriction role |
| Run pipeline | always, when the project is resolved and writable |

The access level is `max(project_access.access_level, group_access.access_level)`, absent → none.
Developer is 30, Maintainer 40. `ci_restrict_pipeline_cancellation_role` is `developer` (default),
`maintainer` or `no_one`; `no_one` removes Cancel entirely. GitLab's protected branches and
environments can restrict a specific action further; that is not pre-checkable, so a post-check
`403` is the backstop.

### Gating and how it is shown

- **Role too low** → the row renders no `⋯` menu at all.
- **Token known to lack `api`** → the menu renders **disabled**, with one Panel-level notice
  explaining that actions need an `api`-scoped token.
- **Scope unreadable** (not a personal access token, or the self call is refused) → the menu is
  enabled and the write's own `403` is surfaced.
- **`GET /projects/:id` fails** → no menu for that project.

Capability is fetched once per distinct project the Panel displays — the open project and any
Downstream project — and cached until the host, project override or token changes. The token-scope
probe runs once and is invalidated when the token is saved or cleared.

### Rendering: one `⋯` menu per row

Each Job row and Pipeline row mounts an SDK `mountMenu` (`panel/panel.ts`) labelled `⋯`, whose items
are the allowed actions. Because `mountMenu`'s trigger is a text label and its items carry no icon,
the mounted trigger button is patched after mount with `aria-label="Pipeline actions"` and a title,
and the menu's `onSelect(id)` dispatches to the matching handler. A single handle is pushed into
`this.handles` so `disposeHandles()` tears it down on every re-render, exactly as the other SDK
mounts do. The trigger stops click propagation, so pressing it never expands the row or opens the
drawer.

- **Debug stays visible.** `renderHandoffAction` is unchanged in placement; the `⋯` menu sits beside
  it, so Part A's discoverability is not undone.
- **The drawer mirrors the row.** The log drawer's header gets the same `⋯` menu for the open Job,
  alongside the existing **Debug this job** button.
- **Header.** A `mountButton` labelled `Run pipeline` sits in the header near Refresh, shown only
  when the open project is writable; it triggers `triggerPipeline(currentRef)`.
- **Trigger jobs get no menu.** A Trigger job's Status stands in for its Downstream pipeline's, so
  there is nothing of its own to act on; the Downstream card beneath it carries the menu.

### Outcome and refresh

An action's outcome is a Panel-level inline notice (`role="alert"`), reusing the existing
`renderHandoffNotice` shape. Success names the action and auto-dismisses after a few seconds (one
timer, cleared on dispose); failure stays until dismissed and names the reason — `403` (token scope
or project role), `404` (the Job or Pipeline is gone), `429` (GitLab rate limit) or the proxy/service
failure. No toast, so the notice is deterministic to test and needs no new host capability.

On success the affected data is refetched immediately — the Pipeline's Jobs (and Bridges for a
Pipeline action) for retry/play/cancel, and the Pipeline list for **Run pipeline** — then the normal
poll resumes. No optimistic UI.

### Documentation and posture

`README.md`'s Security section, `CODING_STANDARDS.md`'s "No writes to GitLab" rule, `GLOSSARY.md`'s
Introduction line and a new term for these actions, and `package.json`'s `description` are all
updated from "read-only" to "read-only unless the token allows actions". A new ADR records the
change and the loosened proxy rule. The manifest's `capabilities` is unchanged: the Panel still
declares no `network`, because the service, not the Panel, owns the network.

## Testing Decisions

A good test asserts external behaviour: what a module produces for an input, or what the Panel does
through the fake host port. Seams:

- **`proxy`** (`tests/proxy.test.ts`): `POST` to an `/api/v4/` path is forwarded; `POST` elsewhere,
  and `PUT`/`PATCH`/`DELETE` anywhere, are refused; the origin-pinning and caps still hold.
- **`gitlab-client`** (`tests/gitlab-client.test.ts`): each write builds the documented method, path,
  query and body; `mapHttpStatus` yields `forbidden` for 403 and `unauthorized` for 401; the project
  detail and token-scope parsers keep only their fields.
- **`actions`** (new, `tests/actions.test.ts`): the status → allowed-actions table, the
  Developer/Maintainer and cancel-restriction thresholds, `no_one`, and the absent-reason for each
  blocked case.
- **`panel`** (through `FakeHost`, `tests/panel.test.ts`): a failed Job shows a menu with Retry while
  Debug stays visible; a manual Job shows Play; a running Job shows Cancel; a `canceling` Job shows
  Force cancel only; a failed Pipeline shows Retry pipeline; the header shows Run pipeline; clicking
  an item posts the right request and refreshes; a `read_api` token disables the menu with the notice;
  a low role hides it; a 403 after the pre-check shows the failure notice; a Trigger job has no menu;
  a Downstream card in another project gets a menu gated by that project; the notice auto-dismisses on
  success and persists on failure.

`FakeHost` gains the project-detail and token-scope responses and records the write requests.

## Out of Scope

- **Pipeline variables and Job inputs.** Every action is parameterless; **Run pipeline** uses the
  current Ref only. Adding a variables form is a follow-up.
- **Confirmations and undo.** No action asks first, and none can be undone.
- **Switch, retry, or delete individual Jobs from the Pipeline list** beyond the actions above.
- **Scheduling, pipeline schedules, or runner management.**
- **A narrow route allowlist at the proxy** — the looser `/api/v4/` `POST` rule is the chosen
  boundary; record the trade-off and revisit if the Panel ever runs untrusted code.
- **Acting on a Trigger job itself** (its Status is its Downstream pipeline's).
- **Watching an action to completion** and reporting the result back into a session.

## Further Notes

- **GitLab facts, cited:** retry Job is valid for any completed Job (`…/ci/jobs/#retry-jobs`); Play is
  documented for `manual` (`…/api/jobs/#run-a-job`); Retry pipeline re-runs failed/canceled Jobs of
  the same Pipeline and is a no-op otherwise (`…/api/pipelines/#retry-jobs-in-a-pipeline`); Cancel
  pipeline returns 200 regardless of state (`…/api/pipelines/#cancel-all-jobs-for-a-pipeline`);
  Force cancel needs Maintainer (`…/ci/jobs/#force-cancel-a-job`); the roles are the project CI/CD
  permissions table (`…/user/permissions/#project-cicd`); Cancel is restrictable via
  `ci_restrict_pipeline_cancellation_role` (`…/ci/pipelines/settings/#restrict-roles-that-can-cancel-pipelines-or-jobs`);
  `permissions` and the access-level ladder come from `…/api/projects/#retrieve-a-project` and
  `…/api/personal_access_tokens/#list-all-token-associations`; `/personal_access_tokens/self` returns
  `scopes` but is documented only for personal access tokens (`…/api/personal_access_tokens/#self-inform`).
- **Domain language:** a new `GLOSSARY.md` term for these write actions; "Debug this job" remains the
  handoff action's name.
- **The earlier deferral:** [`docs/specs/pipelines-panel.md`](pipelines-panel.md):216 and
  [`docs/specs/downstream-pipelines.md`](downstream-pipelines.md):170 both list these writes as out of
  scope; this spec is the deliberate reversal.
