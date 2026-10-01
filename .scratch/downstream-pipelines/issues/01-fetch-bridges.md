# 01: Fetch a Pipeline's bridges

**What to build:** The GitLab client learns one endpoint: a Pipeline's bridges — its Trigger jobs, each
carrying the Downstream pipeline it started. Types for both shapes, and the request and fetch built the
same way as Pipelines, Jobs and Traces.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `types.ts` gains `DownstreamPipeline` (`id`, `iid`, `project_id`, `status`, `source`, `ref`, `sha`,
      `web_url`, `created_at`, `updated_at`) and `Bridge` (`id`, `name`, `stage`, `status`, `web_url`,
      `downstream_pipeline: DownstreamPipeline | null`). `Bridge` is not a `Job`.
- [ ] `bridgesRequest(project, pipelineId)` builds `GET /api/v4/projects/:id/pipelines/:pid/bridges`
      with `per_page=100`, mirroring `jobsRequest`.
- [ ] `fetchBridges(requester, project, pipelineId)` returns `ClientResult<Bridge[]>`, reusing `call`,
      `parseJson` and `mapHttpStatus` so failures map exactly as the other fetches.
- [ ] Tests cover the path and query, a parsed payload, and that 401/404/host errors map as today.
