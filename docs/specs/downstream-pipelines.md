# Spec: Downstream pipelines

Status: implemented — see tickets `downstream-pipelines/01`–`07` (mapped in [`README.md`](README.md)).
Feature: `downstream-pipelines`
Follows: [`docs/specs/pipelines-panel.md`](pipelines-panel.md) (whose Out of Scope deferred this) and
`docs/adr/0004-follow-trigger-edges-forward.md`.

## Problem Statement

A Pipeline can start other Pipelines. Under `trigger:strategy: mirror` (GitLab 18.2+; the older
`depend`) the Trigger job inherits the downstream pipeline's Status, so the upstream Pipeline goes red —
but none of its own build jobs explain why. The cause is a Pipeline in another project, or a child
Pipeline in the same project, and the Panel cannot see either. Worse, the Trigger jobs are not even in
the Panel's stage list: `GET /projects/:id/pipelines/:id/jobs` returns build jobs only, so a Pipeline's
stages and their `done/total` silently omit them. To find the failure the developer leaves the workspace
and opens GitLab, which is the loop the Panel exists to close.

## Solution

Follow each Pipeline's Trigger jobs forward into their **Downstream pipelines**, in place. A Trigger job
becomes a row in its Stage carrying the Downstream pipeline's own Status, and the Downstream pipeline
sits beneath it as a card: status, label (project path, or "child pipeline" for the same project), Ref,
short SHA and a link to GitLab. The card expands to that pipeline's Jobs by Stage, and its own Trigger
jobs expand again — bounded at three generations below the root. Collapsed Pipeline rows show a
"↳ N downstream" count. Downstream pipelines in another project are display-only beyond the card's own
Jobs; they never offer **Start session**, because the open checkout cannot fix them.

## User Stories

1. As a developer whose Pipeline is red under `mirror`, I want to see the Downstream pipeline that
   caused it, so that I do not have to guess from its own jobs.
2. As a developer, I want each Trigger job shown as a row in its Stage, so that a Pipeline's stages are
   complete and its `done/total` is honest.
3. As a developer, I want a Trigger job to carry its Downstream pipeline's Status, so that I read the
   real state rather than a `passed` trigger.
4. As a developer, I want a Trigger job that has not yet created its Downstream pipeline to read
   "starting", so that pending is distinguishable from failure.
5. As a developer, I want a Trigger job that failed before creating a Downstream pipeline to say so, so
   that a broken trigger is not mistaken for a pending one.
6. As a developer, I want the Downstream pipeline as a card beneath its Trigger job, with Status, a
   project label, Ref and short SHA, so that I can identify it at a glance.
7. As a developer, I want a same-project Downstream pipeline labelled "child pipeline" and a
   different-project one labelled with its project path, so that I know whether a fix belongs in my
   checkout.
8. As a developer, I want to expand a card to the Downstream pipeline's Jobs by Stage, so that I can
   find the failing job without leaving the Panel.
9. As a developer, I want a Downstream job's log in the same drawer, so that I can read why it failed.
10. As a developer, I want the walk bounded at three generations and to link out beyond that, so that a
    chain cannot run away or trap me.
11. As a developer, I want a "View pipeline in GitLab" link on every card, so that I can hand off when I
    need more than the Panel shows.
12. As a developer, I want a collapsed Pipeline row to show how many Downstream pipelines it has, so
    that I can spot fan-out without expanding.
13. As a developer, I want that count to cost no more than one call per Pipeline when the list loads and
    only active or expanded Pipelines after, so that polling stays cheap.
14. As a developer, I want Downstream statuses to keep the Panel polling, so that a card updates while
    its downstream runs even after the upstream settled.
15. As a developer, I want the Downstream job log to refresh while it runs, so that it is live too.
16. As a developer, I want an unreadable downstream project to show a per-card error distinct from "no
    jobs", so that I know it is a permission problem, not an empty pipeline.
17. As a developer, I want a failed bridge fetch to stay contained, so that it never blanks the list.
18. As a developer, I want **Start session** only on Jobs of the open project — including its child
    Pipelines — so that an agent is never asked to fix code it cannot see.
19. As a developer, I want `/bridges` used now and `/trigger_jobs` on 19.2+, so that older instances keep
    working.
20. As a developer, I want nested rows to read correctly at rail width in both themes, so that nothing
    looks out of place.

## Implementation Decisions

**Client: one new endpoint.** `gitlab-client` gains `bridgesRequest(project, pipelineId)` and
`fetchBridges(requester, project, pipelineId)`, calling
`GET /api/v4/projects/:id/pipelines/:pipeline_id/bridges?per_page=100`. It reuses the existing `call`,
`parseJson` and `mapHttpStatus`, so failures map exactly as Pipelines, Jobs and Traces do. The endpoint
is `/bridges`; `/trigger_jobs` (the non-deprecated 19.2+ name, same payload) is a later swap-in.

**Types.** `types.ts` gains `DownstreamPipeline` (`id`, `iid`, `project_id`, `status`, `source`, `ref`,
`sha`, `web_url`, `created_at`, `updated_at`) and `Bridge` (a Trigger job: `id`, `name`, `stage`,
`status`, `web_url`, and `downstream_pipeline: DownstreamPipeline | null`). `Bridge` is deliberately not
a `Job`: it has no runner, duration or Trace.

**One new pure module: `downstream`.** `panel/downstream.ts` owns everything derived from bridges, with
no DOM, port or clock:

- `triggerRows(bridges, project)` → one row per Trigger job, with `state` of `starting` (bridge not
  settled and no downstream), `could-not-start` (bridge failed with no downstream) or `ready`.
- `downstreamLabel(downstream, project)` → the project path parsed from `downstream.web_url`, or
  `"child pipeline"` when that path is the owning project's own path (the payload gives a numeric
  `project_id`, not a path, so the URL is what identifies a project here); falls back to
  `project #<project_id>` when the URL cannot be parsed.
- `downstreamCount(bridges)` → the collapsed-row badge number.
- `MAX_DOWNSTREAM_GENERATIONS = 3` and `canExpand(generation)`.

**Stage groups accept Trigger rows.** `stage-groups` takes the build `Job[]` and the `triggerRows(...)`
and groups both by Stage, ordered as today. A Trigger job counts toward `done/total`, and its
contributing status is the Downstream pipeline's when it has one, otherwise its own.

**Nested state in the panel.** `jobs`, `bridges` and `traces` are keyed by `(project, pipeline id)` /
`(project, job id)`, not by pipeline or job id alone: a Downstream pipeline lives in another project, and
its `iid` is not unique across the view (its global `id` is). An expansion is a `{ project, pipelineId,
generation }` node; the same node is never rendered twice on one path (cycle guard), on top of the
generation cap.

**Rendering.** In an expanded Pipeline, each Trigger row shows the status glyph of its Downstream
pipeline (or its own `starting`/`could-not-start` state), marked as a trigger, and — when a downstream
exists — a card beneath it: `downstreamLabel`, Ref, short SHA, `#iid`, "View pipeline in GitLab". The
card expands to the Downstream pipeline's Stages, fetched lazily on open. Nested rows reuse the same
`stage-groups` renderer and the same log drawer; the drawer's `(project, job id)` is what a nested Job
opens with. There is no Panel-wide navigation: the header keeps showing the root project, and the card's
label carries the downstream's project. At the generation cap a card still renders with its Status and a
"Continue in GitLab" link, but is not expandable.

**The badge, and when bridges are fetched.** The collapsed row shows `↳ N downstream` from
`downstreamCount`. Bridges are fetched once per listed Pipeline when the list loads (`≤ PER_PAGE`
calls), cached by `(project, pipeline id)`, and afterwards refetched only for Pipelines that are active
or already known to have a Downstream pipeline. A bridge fetch that fails is not a list failure: the row
shows no count, or drops a stale one, and the rest of the list stands.

**Polling.** `visibleStatuses` includes every cached Trigger row's contributing status — its Downstream
pipeline's where it has one. Without this a mirror'd upstream that has already settled would stop the
poll while its Downstream pipeline is still running. Bridges and Jobs refetch on the poll only for
Pipelines that are expanded or active, and the open Job's Trace keeps refetching while its Job is active,
nested or not.

**Per-card unreadable.** The bridges call authorises read on the upstream project only; the Downstream
project may be unreadable by the token. The card still renders (its Status and link come from the
bridges payload); expanding its Jobs that 403s or 404s shows a per-card error saying the project cannot
be read, kept distinct from "no jobs". This never escalates to a Panel-wide state.

**Handoff stays in the open project.** `Start session` appears only for a failed Job of the root
Pipeline or of a same-project child pipeline. A multi-project Downstream pipeline's Jobs render without
it: the session runs in the open checkout, which cannot fix another project.

## Testing Decisions

A good test asserts external behaviour: what a module produces for a given input, or what the Panel does
through the fake host port. Three seams:

- **`gitlab-client`** (`tests/gitlab-client.test.ts`): the bridges path and `per_page=100`, and that its
  failures map exactly as the other fetches do.
- **`downstream`** (`tests/downstream.test.ts`, new): `triggerRows` gives `starting`, `could-not-start`
  and `ready` for the three bridge shapes; `downstreamLabel` gives "child pipeline" for the same project,
  the path parsed from `web_url` for another, and a `project #<id>` fallback; `downstreamCount` counts
  bridges with a downstream; `canExpand` stops at three generations.
- **`stage-groups`** (extended): Trigger rows join their Stage in order and count in `done/total`; a
  Trigger job takes its Downstream pipeline's status.
- **`panel`** (through `FakeHost`): the collapsed badge and its fetch-once-then-active rule; a Trigger row
  carrying its Downstream status; the two no-downstream states; expanding a card to its Stages; a nested
  Job's Trace opening in the drawer against the other project; the generation cap and its "Continue in
  GitLab" link; the cycle guard; the per-card unreadable error distinct from "no jobs"; a failed bridge
  fetch leaving the list intact; polling driven by a Downstream status after the upstream settled; and
  `Start session` absent on a multi-project Downstream job but present on a child's.

`FakeHost` gains bridge responses keyed by `(project, pipeline id)`, so a test can make the same pipeline
id exist in two projects.

## Out of Scope

- **Following upstream** to the Pipeline that started this one. REST exposes no parent; it would mean
  scanning candidate parents (ADR-0004).
- **Panel-wide drill-in navigation** — re-pointing the whole Panel at a Downstream pipeline with its own
  project header, scope toggle and back stack. Expansion is in place only.
- **GraphQL** and any second transport.
- **`/trigger_jobs`** until the target instance is GitLab 19.2+.
- **Cross-instance triggers.** `trigger:project` resolves within one instance, so a Downstream pipeline is
  always on the Configured host; a trigger that reaches another host is invisible to the API, not
  mis-rendered.
- **Child Pipelines as top-level rows.** A child Pipeline appears through its upstream's Trigger job, not
  in the Pipeline list (which GitLab already excludes it from by default).
- **Retried-Job grouping**, and anything that writes to GitLab: retry, cancel, play, or trigger.
- Chains deeper than three generations, other than their "Continue in GitLab" link.

## Further Notes

- **Verified against:** GitLab docs and `gitlab-org/gitlab` `master`, 2026-09-30. Key facts: the bridges
  payload and that `/jobs` excludes bridges (`app/finders/ci/jobs_finder.rb`, `pipeline.builds` vs
  `pipeline.bridges`); a default Trigger job goes `pending → passed` on creation and does not wait; only
  `strategy: mirror`/`depend` inherits the downstream's status
  (`Ci::Bridge#inherit_mirrored_status_from_downstream!`, `Ci::PipelineBridgeStatusService`); child vs
  multi-project `source` (`parent_pipeline` vs `pipeline`); `/bridges` deprecated in 19.2 in favour of
  `/trigger_jobs`; `trigger:project` resolves within one instance only.
  <https://docs.gitlab.com/ci/pipelines/downstream_pipelines/>,
  <https://docs.gitlab.com/api/jobs/#list-all-trigger-jobs-by-pipeline>,
  <https://docs.gitlab.com/ci/yaml/#triggerstrategy>.
- **Domain language:** "Trigger job", "Downstream pipeline" and "Child pipeline" in `GLOSSARY.md`; "Job"
  was broadened and "Trace" qualified to build jobs there.
- **Deliberately deferred by the Pipelines Panel:** [`docs/specs/pipelines-panel.md`](pipelines-panel.md) Out of Scope.

## Comments
