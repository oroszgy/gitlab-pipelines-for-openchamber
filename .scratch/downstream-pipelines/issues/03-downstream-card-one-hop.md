# 03: The downstream card, one hop

**What to build:** In an expanded Pipeline, Trigger jobs render in their Stages and each shows its
Downstream pipeline as a card; the card expands to that pipeline's Jobs by Stage, and its jobs open their
Trace in the existing drawer. All per-pipeline state becomes project-keyed.

**Blocked by:** 01 — Fetch a Pipeline's bridges; 02 — Trigger jobs in the Stage list.

**Status:** ready-for-agent

- [ ] An expanded Pipeline's Stages include its Trigger jobs as rows, each visibly marked as a trigger
      and carrying the status from `triggerRows`.
- [ ] A `starting` or `could-not-start` Trigger job renders as that state, with no card.
- [ ] A `ready` Trigger job renders a card beneath it: label, Ref, short SHA, `#iid`, and
      "View pipeline in GitLab".
- [ ] Opening the card fetches that pipeline's Jobs (lazily, on open) and renders them by Stage through
      the existing renderer.
- [ ] A Job in a Downstream pipeline opens its Trace in the existing drawer, fetched against that
      pipeline's own project.
- [ ] `jobs`, `bridges` and `traces` are keyed by `(project, pipeline id)` / `(project, job id)`, so one
      pipeline id can exist in two projects.
- [ ] A Jobs/Trace fetch that fails for a Downstream project shows a per-card error, distinct from "no
      jobs" and from the Panel-wide unauthorized state.
- [ ] Tests through the fake host: the card and its fields, expansion to Stages, a nested Trace, and the
      same pipeline id in two projects.
