# 08: Project override setting

**What to build:** An optional setting pins a specific GitLab project, so a developer can watch a
project whose remote does not resolve, and the failure states offer it as the way out.

**Blocked by:** 02 — Resolve the project and current Ref.

**Status:** done

- [x] A `project` setting, when set, is used instead of the derived project.
- [x] Clearing the setting returns to derived behaviour.
- [x] The `no-project`, `not-a-repo`, `linked-worktree` and `host-mismatch` states offer the setting
      as the escape hatch. (No host API opens the settings UI, so this is the hint naming the
      setting; the Panel cannot take the user there itself.)
- [x] Tests cover override-vs-derived precedence.
