# Follow trigger edges forward in the Panel

Status: accepted

The Panel shows the open project's Pipelines. With `trigger:strategy: mirror` (GitLab 18.2+; the older
`depend`) a Trigger job inherits the downstream pipeline's Status and can turn the upstream Pipeline
red, while none of that Pipeline's own build jobs explain why — the cause is a Pipeline in another
project (a multi-project pipeline) or another Pipeline in the same project (a child pipeline). Two REST
facts make this awkward: `GET /projects/:id/pipelines/:id/jobs` returns build jobs only, so Trigger jobs
are currently missing from a Pipeline's stages altogether; and no endpoint returns a Pipeline's
upstream or parent, so a failing Pipeline cannot be walked backwards.

We follow the edge **forward only**, from each Trigger job to its Downstream pipeline. The Panel fetches
`GET /projects/:id/pipelines/:id/bridges` (one call per Pipeline, `per_page=100`), renders each Trigger
job in its Stage carrying the Downstream pipeline's own Status, and renders that pipeline as a card
beneath it. A card expands to the Downstream pipeline's Jobs by Stage, and its own Trigger jobs expand
again, bounded at `MAX_DOWNSTREAM_GENERATIONS = 3` generations below the root, where a card still shows
its Status and a "Continue in GitLab" link but stops expanding. The Panel never recomputes a Pipeline's
Status; it surfaces the downstream's real one. Handoff stays inside the open project, so a multi-project
Downstream pipeline offers no **Start session**.

**Considered options.** Walking **backwards** was rejected: REST exposes no parent, so it would mean
scanning candidate parents' bridges and guessing. **GraphQL** (`upstream`/`downstream`) would answer both
directions, but the Extension is REST-only against a single `apiOrigin` (ADR-0001, ADR-0002); adding a
second transport for one feature is not worth it. **Link out only** — a "view in GitLab" affordance with
no in-Panel expansion — was rejected because it is exactly the context switch the Panel exists to remove:
the failing job stays in GitLab. **`/trigger_jobs`** returns the same payload and is not deprecated, but
exists only from GitLab 19.2; we use `/bridges` now and treat `/trigger_jobs` as a swap-in.

**Consequences.** `/bridges` is deprecated in GitLab 19.2, so this carries a known migration. Trigger
jobs enter the Stage list and its `done/total` counts, and downstream Statuses enter the adaptive poll's
active set — without that, a mirror'd upstream that has already settled would freeze its card mid-run.
A downstream count on collapsed rows costs one `/bridges` call per listed Pipeline on first load; after
that only active or already-expanded Pipelines are refetched. Jobs and Traces are keyed by
`(project, pipeline id)`, since a Downstream pipeline may live in another project. Reverses the
"Nested or child Pipeline rendering" and, for trigger edges, the "cross-project view" bullets that
`docs/specs/pipelines-panel.md` put out of scope.
