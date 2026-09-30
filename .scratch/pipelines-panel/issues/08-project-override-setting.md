# 08: Project override setting

**What to build:** An optional setting pins a specific GitLab project, so a developer can watch a
project whose remote does not resolve, and the failure states offer it as the way out.

**Blocked by:** 02 — Resolve the project and current Ref.

**Status:** ready-for-agent

- [ ] A `project` setting, when set, is used instead of the derived project.
- [ ] Clearing the setting returns to derived behaviour.
- [ ] The `no-project`, `not-a-repo` and `host-mismatch` states offer the setting as the escape
      hatch.
- [ ] Tests cover override-vs-derived precedence.
