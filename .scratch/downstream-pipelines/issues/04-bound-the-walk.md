# 04: Bound the walk, label the child

**What to build:** Nested Trigger jobs expand again, up to a fixed depth, then stop at a card that links
out. Same-project pipelines read "child pipeline"; another project reads with its path.

**Blocked by:** 03 — The downstream card, one hop.

**Status:** ready-for-agent

- [ ] A Downstream pipeline's own Trigger jobs expand in turn, to
      `MAX_DOWNSTREAM_GENERATIONS = 3` generations below the root.
- [ ] At the cap, a card still renders with its status and a "Continue in GitLab" link, but is not
      expandable.
- [ ] The same `(project, pipeline id)` never renders twice on one path (cycle guard), independent of the
      cap.
- [ ] Cards show "child pipeline" for a same-project pipeline and the parsed project path otherwise, with
      the `project #<id>` fallback.
- [ ] Tests: a two-generation chain expands; a fourth generation stops and links out; a cycle does not
      loop; the child label appears.
