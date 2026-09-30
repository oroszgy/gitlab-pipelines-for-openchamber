# 06: Branch / All refs toggle

**What to build:** A segmented control in the header switches the list between the current Ref and
all refs, so a developer can widen from "my branch" to the whole project.

**Blocked by:** 03 — List Pipelines for the current Ref.

**Status:** ready-for-agent

- [ ] A segmented **Branch / All refs** control sits in the header and reflects the active scope.
- [ ] All refs lists the project's Pipelines ordered by most recently updated.
- [ ] The scope control is not shown when there is nothing to scope (no project / failure states).
- [ ] Switching scope re-fetches once and never leaves a stale list from the previous scope.
- [ ] Tests cover both scopes' path and query construction and the toggle behaviour through the fake
      host.
