# 02: Trigger jobs in the Stage list

**What to build:** The pure logic that turns bridges into Stage rows and labels: a new `downstream`
module, and `stage-groups` accepting Trigger rows alongside build Jobs so a Pipeline's stages are
complete and its `done/total` counts them.

**Blocked by:** 01 — Fetch a Pipeline's bridges.

**Status:** ready-for-agent

- [ ] `downstream.triggerRows(bridges, project)` yields one row per Trigger job, with a state of
      `starting` (bridge unsettled, no downstream), `could-not-start` (bridge failed, no downstream) or
      `ready`, and the status the row should carry: the Downstream pipeline's when `ready`, else the
      bridge's own.
- [ ] `downstream.downstreamLabel(downstream, project)` returns `"child pipeline"` when the path parsed
      from `downstream.web_url` is the owning project's own path, else that path; and
      `project #<project_id>` when the URL cannot be parsed.
- [ ] `downstream.downstreamCount(bridges)` counts bridges that have a downstream.
- [ ] `MAX_DOWNSTREAM_GENERATIONS = 3` and `canExpand(generation)` live here.
- [ ] `stage-groups` groups Trigger rows into their Stage alongside build Jobs, preserving order, and
      includes them in `done/total`.
- [ ] Tests: the three states; both label fallbacks and the same-project case; the count; grouping,
      ordering and counting with a mix of build and Trigger jobs.
