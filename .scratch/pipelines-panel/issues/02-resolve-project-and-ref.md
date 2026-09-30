# 02: Resolve the project and current Ref

**What to build:** The Panel works out which GitLab project the open project belongs to and which
Ref is checked out, and shows both in the header — or a typed failure state when it cannot. The host
port gains reading a project file and listing worktrees, and the manifest asks for the `files` and
`sessions` capabilities.

**Blocked by:** 01 — Skeleton: an installable Panel that shows the open project.

**Status:** ready-for-agent

- [ ] With a GitLab-remote project open, the header shows the resolved host, project path and
      current Ref.
- [ ] Remote URLs in the scp-like, ssh and https forms resolve correctly, including subgroups and a
      trailing `.git`.
- [ ] The current Ref is found via the host's worktree list, falling back to reading the git HEAD
      file when the worktree list has no match — so a linked worktree still resolves.
- [ ] `no-project` shows when nothing is open, `not-a-repo` when the project is not a git
      repository, and `host-mismatch` when the remote's host is not the configured one.
- [ ] No header element shows a phantom value on a failure path.
- [ ] Table-driven tests cover every URL form, the worktree/HEAD fallback and each typed failure.
