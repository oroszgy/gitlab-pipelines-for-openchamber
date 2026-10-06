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
- [`pipeline-actions`](pipeline-actions.md) — Pipeline and Job actions

## Tickets

| Ticket | Title | Issue |
| ------ | ----- | ----- |
| `pipelines-panel/01` | Skeleton — an installable Panel that shows the open project | [#1](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/1) |
| `pipelines-panel/02` | Resolve the project and current Ref | [#2](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/2) |
| `pipelines-panel/03` | List Pipelines for the current Ref | [#3](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/3) |
| `pipelines-panel/04` | Expand a Pipeline into Jobs by Stage | [#4](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/4) |
| `pipelines-panel/05` | Job log drawer | [#5](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/5) |
| `pipelines-panel/06` | Branch / All refs toggle | [#6](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/6) |
| `pipelines-panel/07` | Adaptive polling, freshness and manual refresh | [#7](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/7) |
| `pipelines-panel/08` | Project override setting | [#8](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/8) |
| `pipelines-panel/09` | Scrollable log, live while the Job runs | [#9](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/9) |
| `oss-release/01` | Service configuration module | [#10](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/10) |
| `oss-release/02` | Service serves configuration and resolves tokens | [#11](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/11) |
| `oss-release/03` | Panel owns configuration through the service | [#12](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/12) |
| `oss-release/04` | Configuration states and host switching | [#13](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/13) |
| `oss-release/05` | Package and document the public release | [#14](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/14) |
| `oss-release/06` | Contract the transitional token path | [#15](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/15) |
| `configurable-host/01` | Inject the requester into the GitLab client | [#16](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/16) |
| `configurable-host/02` | The proxy service, proven on its own | [#17](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/17) |
| `configurable-host/03` | A custom host, end to end | [#18](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/18) |
| `configurable-host/04` | Switching hosts cleanly | [#19](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/19) |
| `configurable-host/05` | Failure and grant states | [#20](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/20) |
| `moved-project/01` | Recognise a redirect and parse its target | [#21](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/21) |
| `moved-project/02` | Heal the session project and retry | [#22](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/22) |
| `moved-project/03` | Explain a redirect that could not be followed | [#23](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/23) |
| `moved-project/04` | Show a one-time notice when a heal happens | [#24](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/24) |
| `downstream-pipelines/01` | Fetch a Pipeline's bridges | [#25](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/25) |
| `downstream-pipelines/02` | Trigger jobs in the Stage list | [#26](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/26) |
| `downstream-pipelines/03` | The downstream card, one hop | [#27](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/27) |
| `downstream-pipelines/04` | Bound the walk, label the child | [#28](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/28) |
| `downstream-pipelines/05` | The collapsed-row downstream count | [#29](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/29) |
| `downstream-pipelines/06` | Keep it live | [#30](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/30) |
| `downstream-pipelines/07` | Handoff only within the open project | [#31](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/31) |
| `pipeline-actions/01` | Proxy permits POST under /api/v4/ | [#43](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/43) |
| `pipeline-actions/02` | Client project detail, token scopes and write calls | [#44](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/44) |
| `pipeline-actions/03` | The capability module | [#45](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/45) |
| `pipeline-actions/04` | The row action menu | [#46](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/46) |
| `pipeline-actions/05` | Capability gating and the header action | [#47](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/47) |
| `pipeline-actions/06` | Outcome notice and refresh | [#48](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/48) |
| `pipeline-actions/07` | Docs, glossary and the posture ADR | [#49](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/49) |
