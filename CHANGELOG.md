# Changelog

All notable, user-observable changes to this extension are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version follows
[Semantic Versioning](https://semver.org/) — minor for a feature, patch for a fix. The bump and the
entry land in the same commit as the change; see the Versioning section of `AGENTS.md`.

## [Unreleased]

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
