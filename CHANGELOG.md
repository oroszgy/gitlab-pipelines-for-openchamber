# Changelog

All notable, user-observable changes to this extension are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version follows
[Semantic Versioning](https://semver.org/) — minor for a feature, patch for a fix. The bump and the
entry land in the same commit as the change; see the Versioning section of `AGENTS.md`.

## [Unreleased]

## [0.6.1] - 2026-10-01

### Fixed

- Following a moved GitLab project no longer fails when GitLab answers a sub-resource request
  with that resource's own location rather than the project root — only the project is adopted
  from the redirect target, with its sub-path and query dropped.

## [0.6.0] - 2026-10-01

### Changed

- The Panel's typography now follows OpenChamber's own scale (14px primary, 13px prose, 12px
  meta and monospace) instead of rendering one to two sizes smaller — its base was ~11.4px and
  its fine print ~9.6px. It reads as part of the UI rather than a small insert; the Trace log,
  SHAs and stage labels were the most affected.

## [0.5.0] - 2026-10-01

### Added

- Show pipelines for a project opened as a Linked worktree. The panel follows the
  worktree's `.git` pointer to the primary repository through its host-runtime
  service, so the GitLab project and the worktree's own Ref resolve automatically
  instead of requiring the Project setting.

### Changed

- A Linked worktree is no longer always a dead end: the typed `linked-worktree`
  state remains only as the fallback when the service is not granted or cannot
  read the primary config.

## [0.4.0] - 2026-10-01

### Added

- Follow a pipeline's Trigger jobs into their Downstream pipelines: each Trigger job shows as a row
  in its Stage carrying the Downstream pipeline's own status, with a card beneath it for the
  pipeline — label (project path, or "child pipeline"), Ref, short SHA and a link to GitLab.
- Expand a Downstream card to that pipeline's jobs by stage, open a nested job's log in the same
  drawer, and expand its own Trigger jobs in turn — bounded at three generations below the root, with
  a "Continue in GitLab" link beyond.
- A collapsed pipeline row shows a `↳ N downstream` count, fetched once per listed pipeline on load
  and afterwards only for active or already-fanning-out pipelines.
- Downstream statuses keep the panel polling after a `mirror`'d upstream has settled, so a card stays
  live while its downstream runs.

### Changed

- A pipeline's stages now include its Trigger jobs, so its `done/total` counts them.
- **Start session** is offered only on failed jobs of the open project — the root pipeline and its
  child pipelines — not on jobs of a Downstream pipeline in another project.

## [0.3.0] - 2026-10-01

### Added

- Follow a GitLab project that has been renamed or moved: when the old path redirects, the panel adopts
  the project's new location and keeps showing its pipelines, up to five redirects.
- A one-time notice when a move is followed, naming the old path and the new project id.
- A "Project moved" state with a link to the project, when a move cannot be followed — a runaway
  redirect chain, or a target on another GitLab host — and a "GitLab redirected this request" state when
  the redirect is not a recognisable move.

### Fixed

- A moved or renamed GitLab project no longer shows `GitLab returned an unexpected response (301)`.

## [0.2.0] - 2026-09-30

### Added

- Read the open project's CI/CD pipelines, jobs and logs, with a branch / all-refs toggle, adaptive
  polling and a scrollable live log drawer.
- Start an OpenChamber session from a failed job, seeded with the job's identity, links and log tail.
- Reach a self-managed GitLab through a local proxy service, with a `host` setting and its own access
  token, without a rebuild.
- Typed failure and grant states: a missing token, an ungranted service, and a malformed host.

### Fixed

- Ship the rail icon as a package SVG so it renders.
