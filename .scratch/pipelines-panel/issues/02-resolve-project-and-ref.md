# 02: Resolve the project and current Ref

**What to build:** The Panel works out which GitLab project the open project belongs to and which
Ref is checked out, and shows both in the header — or a typed failure state when it cannot. The host
port gains reading a project file and listing worktrees, and the manifest asks for the `files` and
`sessions` capabilities.

**Blocked by:** 01 — Skeleton: an installable Panel that shows the open project.

**Status:** done

- [x] With a GitLab-remote project open, the header shows the resolved host, project path and
      current Ref.
- [x] Remote URLs in the scp-like, ssh and https forms resolve correctly, including subgroups and a
      trailing `.git`.
- [x] The current Ref is found via the host's worktree list, falling back to reading the git HEAD
      file when the worktree list has no match — so a linked worktree still resolves its Ref.
- [x] A linked worktree (`.git` is a file pointing outside the project) is reported as its own
      `linked-worktree` failure, naming the Ref it found — not as `not-a-repo`. The host API exposes
      no remote, so the `project` override is the way to read its pipelines.
- [x] `no-project` shows when nothing is open, `not-a-repo` when the project is not a git
      repository, `linked-worktree` when a worktree hides the remote, and `host-mismatch` when the
      remote's host is not the configured one.
- [x] No header element shows a phantom value on a failure path.
- [x] Table-driven tests cover every URL form, the worktree/HEAD fallback and each typed failure.
