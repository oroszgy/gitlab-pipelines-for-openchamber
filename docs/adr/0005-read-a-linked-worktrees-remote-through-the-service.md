# Read a Linked worktree's remote through the service

The Panel resolves the open project's GitLab project from the git remote in `.git/config`, read with the
host's `files` capability. That read is scoped to the open project directory. A **Linked worktree** —
the shape OpenChamber commonly runs sessions in — has `.git` as a *file* containing
`gitdir: <primary>/.git/worktrees/<name>`, so `.git/config` and `.git/HEAD` are not there. The guest SDK
(2.0.3) exposes no git remote and no project id for a worktree, so the Panel could not derive the
project and reported a typed `linked-worktree` failure, leaving the `project` setting as the only way to
read such a project's pipelines.

ADR-0002 already added a `contributes.service` process for custom GitLab hosts. That process runs with
the user's rights and is not confined to the sandbox, so it is the one seam that can read outside the
open project.

We add one read-only route to the service, `/git-config`, taking a directory. It reads that directory's
`.git`: a **directory** → its own `config`; a **file** → follow the `gitdir:` pointer, then its
`commondir` when present, to the primary repository's `config`. The service returns the raw config text
and nothing else; the Panel parses the remote with the same `project-resolver` code as a normal
checkout, so GitLab and remote parsing stay in one place. The Panel still derives the primary checkout's
directory locally from the `.git` pointer — enough to find the registered project and read this
worktree's Ref from its worktree list — so the service is only needed for the remote, and a missing
grant or a failed read still falls back to the `linked-worktree` state.

**Considered options.** A **`contributes.filesystem` glob** for the primary repository fails because the
primary path is not known ahead of time and a pattern wide enough to cover it would ask the user for
near-arbitrary filesystem access. A **guest git-remote API** does not exist in the SDK and is not this
package's to add. **Remembering the project** the first time the same repository's primary checkout is
opened is unreliable and silently wrong when that has not happened. **Shelling out to `git`** in the
service was rejected as unnecessary: reading the config is enough, needs no `exec` declaration, and
keeps the service as close to its transport-only remit as the requirement allows.

**Consequences.** The service now reads files as well as proxying HTTPS; it was already an unconfined,
grant-approved process, but its remit widens, and the install's grant description should stay honest
about that. In built-in host mode the Panel now starts the service only when the open directory is a
Linked worktree. Config text never carries the token, so nothing new reaches the Panel. The path stays
read-only.
