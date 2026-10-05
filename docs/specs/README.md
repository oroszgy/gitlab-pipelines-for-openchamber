# Specs and tickets

Feature specs live here as `docs/specs/<feature>.md`. Their implementation tickets are GitHub
Issues titled `<feature>/<NN>: <title>`; this table maps each stable ticket id to its issue.

## Specs

- [`pipelines-panel`](pipelines-panel.md) — GitLab Pipelines panel
- [`oss-release`](oss-release.md) — Public release — gitlab.com by default and service-owned configuration
- [`configurable-host`](configurable-host.md) — A configurable GitLab host (superseded)
- [`moved-project`](moved-project.md) — Follow a moved GitLab project
- [`downstream-pipelines`](downstream-pipelines.md) — Downstream pipelines
- [`session-handoff`](session-handoff.md) — Session handoff

## Tickets

| Ticket | Title | GitHub |
| ------ | ----- | ------ |
| `pipelines-panel/01` | Skeleton — an installable Panel that shows the open project | — |
| `pipelines-panel/02` | Resolve the project and current Ref | — |
| `pipelines-panel/03` | List Pipelines for the current Ref | — |
| `pipelines-panel/04` | Expand a Pipeline into Jobs by Stage | — |
| `pipelines-panel/05` | Job log drawer | — |
| `pipelines-panel/06` | Branch / All refs toggle | — |
| `pipelines-panel/07` | Adaptive polling, freshness and manual refresh | — |
| `pipelines-panel/08` | Project override setting | — |
| `pipelines-panel/09` | Scrollable log, live while the Job runs | — |
| `oss-release/01` | Service configuration module | — |
| `oss-release/02` | Service serves configuration and resolves tokens | — |
| `oss-release/03` | Panel owns configuration through the service | — |
| `oss-release/04` | Configuration states and host switching | — |
| `oss-release/05` | Package and document the public release | — |
| `oss-release/06` | Contract the transitional token path | — |
| `configurable-host/01` | Inject the requester into the GitLab client | — |
| `configurable-host/02` | The proxy service, proven on its own | — |
| `configurable-host/03` | A custom host, end to end | — |
| `configurable-host/04` | Switching hosts cleanly | — |
| `configurable-host/05` | Failure and grant states | — |
| `moved-project/01` | Recognise a redirect and parse its target | — |
| `moved-project/02` | Heal the session project and retry | — |
| `moved-project/03` | Explain a redirect that could not be followed | — |
| `moved-project/04` | Show a one-time notice when a heal happens | — |
| `downstream-pipelines/01` | Fetch a Pipeline's bridges | — |
| `downstream-pipelines/02` | Trigger jobs in the Stage list | — |
| `downstream-pipelines/03` | The downstream card, one hop | — |
| `downstream-pipelines/04` | Bound the walk, label the child | — |
| `downstream-pipelines/05` | The collapsed-row downstream count | — |
| `downstream-pipelines/06` | Keep it live | — |
| `downstream-pipelines/07` | Handoff only within the open project | — |
