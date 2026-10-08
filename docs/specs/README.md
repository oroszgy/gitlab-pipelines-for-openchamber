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
- [`caching-and-transport`](caching-and-transport.md) — Caching and transport speedups
- [`smart-defaults`](smart-defaults.md) — Smart defaults
- [`log-drawer`](log-drawer.md) — Log drawer usability
- [`notifications`](notifications.md) — Notifications
- [`artifacts`](artifacts.md) — Job artifacts and Pipeline reports

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
| `caching-and-transport/01` | Header allowlist through the service | [#50](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/50) |
| `caching-and-transport/02` | Conditional GET reuses unchanged data | [#51](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/51) |
| `caching-and-transport/03` | Load more Pipelines | [#52](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/52) |
| `caching-and-transport/04` | Rate-limit pause and notice | [#53](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/53) |
| `caching-and-transport/05` | Incremental Trace deltas | [#54](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/54) |
| `smart-defaults/01` | Remember the scope | [#55](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/55) |
| `smart-defaults/02` | Remember expansion and open drawer | [#56](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/56) |
| `smart-defaults/03` | Auto-expand the newest active Pipeline | [#57](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/57) |
| `smart-defaults/04` | Automatic All-refs fallback | [#58](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/58) |
| `log-drawer/01` | Windowed drawer rendering | [#59](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/59) |
| `log-drawer/02` | Line index, ANSI stripping, idle indexing | [#60](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/60) |
| `log-drawer/03` | Find in log | [#61](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/61) |
| `log-drawer/04` | Highlight and jump to error | [#62](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/62) |
| `log-drawer/05` | Copy the Trace | [#63](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/63) |
| `notifications/01` | Service watch store and `/watch` route | [#64](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/64) |
| `notifications/02` | Service poller and event log | [#65](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/65) |
| `notifications/03` | `/events` route and watermark | [#66](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/66) |
| `notifications/04` | Rail panel badge, failure toasts, watch toggle | [#67](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/67) |
| `notifications/05` | Status section contribution | [#68](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/68) |
| `notifications/06` | Badge lifecycle | [#69](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/69) |
| `notifications/07` | Older-service degradation | [#70](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/70) |
| `artifacts/01` | The Artifacts tab — browse the archive, preview a text file | [#71](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/71) |
| `artifacts/02` | The Reports strip — test report and coverage on the Pipeline | [#72](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/72) |
| `artifacts/03` | Download the archive to the cache directory | [#73](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/73) |
| `artifacts/04` | Degrade when the archive cannot be browsed | [#74](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/74) |
| `artifacts/05` | Docs, glossary and the download ADR | [#75](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/75) |
| `log-drawer/06` | Keep the open log through a re-render | [#76](https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues/76) |
