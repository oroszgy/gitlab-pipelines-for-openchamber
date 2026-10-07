# Changelog

All notable, user-observable changes to this extension are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version follows
[Semantic Versioning](https://semver.org/) — minor for a feature, patch for a fix. The bump and the
entry land in the same commit as the change; see the Versioning section of `AGENTS.md`.

## [Unreleased]

## [0.12.1] - 2026-10-07

### Fixed

- The Work Status **Status section** now follows the host theme, so it renders in OpenChamber's font
  and colours instead of the iframe's browser default.
- When the Proxy service predates the watch routes, the explanation now says how to update it —
  restart OpenChamber, or disable and re-enable the extension — instead of "update the service".

## [0.12.0] - 2026-10-07

### Added

- The service can **watch one Ref per project** and polls it in the background, so
  a Pipeline that finishes while you are away is noticed even when the Panel is
  not open.
- A **rail badge** counts Unseen events, and a **host toast** announces each
  watched Pipeline that failed or was canceled; a success changes the badge only.
- A **Status section** in Work Status shows the watched Ref, its latest Status and
  the unseen count, and toggles the watch; clicking it opens the rail panel.
- A **watch toggle** in the Panel header sets and clears the watch for the current
  project and Ref.

### Changed

- The Extension talks to a service that predates the watch and event routes: the
  watch UI is disabled with an explanation instead of failing.

### Added

- The Panel remembers your view per host, project and Ref: the scope, the
  expanded Pipeline, its Downstream chain and the open Job drawer are restored
  when you come back.
- The newest running or failed Pipeline is expanded on load, so its stages are
  visible without a click.
- When the current Ref has no Pipelines, the Panel falls back to All refs once,
  with a dismissible notice naming the Ref and a **Back to branch** action.

## [0.10.6] - 2026-10-06

### Fixed

- Scrolling the log drawer no longer sticks at the top. Repainting clears the
  scroller's content, which resets its offset to zero; the offset is now captured
  before the clear and restored after, so a repaint neither loses the position
  nor fights the user's scrolling.
- Scrolling is smoother: a scroll that stays within the rendered window no longer
  rebuilds it.

## [0.10.5] - 2026-10-06

### Fixed

- Scrolling the log drawer now reaches the bottom. Repainting the open drawer no
  longer rewrites the scroll offset, so it stops fighting the browser and
  bouncing back before the end.

### Removed

- The temporary window-metrics readout added in 0.10.4; its diagnosis is done.

## [0.10.4] - 2026-10-06

### Fixed

- The log drawer now renders a fixed-size window around the scroll position,
  instead of one sized from a height it may not have been able to measure. This
  is what stops a tall panel showing blank space above or below the lines.
- The panel script is requested with the package version (`main.js?v=…`), so a
  version bump actually busts a cached bundle rather than continuing to serve
  the old one.

## [0.10.3] - 2026-10-06

### Fixed

- The log drawer no longer renders a short window into a tall panel, leaving a
  large empty area above or below the lines. When the drawer cannot yet measure
  its own height — it is painted before layout, and the host may resize the panel
  just after — it now falls back to the panel's height, always paints at least a
  full screenful, and repaints after layout and on resize.

## [0.10.2] - 2026-10-06

### Fixed

- The log drawer no longer leaves gaps above and below the visible lines. The
  first paint happened before the drawer had a size, and those guessed row
  heights were kept, so a long wrapped Trace had a scroll geometry that drifted
  as more lines were measured. Row heights are now estimated from the drawer's
  real width and font, re-estimated when it resizes, and the drawer repaints
  once it is laid out.

## [0.10.1] - 2026-10-06

### Fixed

- Scrolling the log drawer now renders the lines you scroll to. The windowed
  drawer only painted its first screenful and never repainted on scroll, so a
  long Trace looked like it began at whatever was on screen — usually the
  exception and its context — with blank space above.

## [0.10.0] - 2026-10-06

### Added

- The log drawer now works on the Trace rather than just displaying it. Only the
  lines on screen are rendered, so a 20 000-line Trace opens without laying out
  the whole log, and long lines still wrap.
- **Find in log** with a match count and previous/next, opened with `Ctrl/Cmd+F`.
- **Jump to error**, which appears only when the Trace has failure lines and
  scrolls to the last one; error and failure lines are highlighted in place.
- **Copy** puts the whole accumulated Trace on the clipboard.

## [0.9.0] - 2026-10-06

### Added

- Polling is now much cheaper. The panel reuses a Pipeline list, and a settled
  Job's log, when GitLab says they have not changed, instead of re-downloading
  them every few seconds.
- **Load more** at the end of the Pipeline list pages back through older
  Pipelines, so the list is no longer stuck at the newest 20. Loading a page
  keeps the rows you have expanded.
- When GitLab rate-limits the panel, it pauses and explains why, resuming on its
  own once the limit clears.
- A running Job's Trace now grows as an incremental delta and accumulates across
  the service's response cap, so a long Trace becomes fully readable rather than
  stopping at one capped window.

### Changed

- The panel asks GitLab for a wider set of response headers (paging, rate-limit
  and caching signals) through a small, named allowlist, so the token and
  cookies still never cross the service boundary.

## [0.8.2] - 2026-10-06

### Fixed

- **Debug this job** now works: the manifest declares the `prompt` capability. A session seeded with
  the Job's log needs both `sessions` and `prompt`, so without it OpenChamber refused to start the
  session. This adds a capability, so OpenChamber asks you to approve the extension once more.

## [0.8.1] - 2026-10-06

### Fixed

- When **Debug this job** cannot start a session, the panel now names OpenChamber's reason — no
  model, a busy session, a timeout, or a rejected request — instead of only saying it failed.

## [0.8.0] - 2026-10-06

### Added

- Pipeline actions: retry a Job or Pipeline, play a manual Job, cancel or force-cancel a running Job
  or Pipeline, and run a new Pipeline on the current Ref — from a per-row `⋯` menu and a header
  button. Each is offered only when the Access token has the `api` scope and your project role
  allows it, and a refused action is reported in the panel.

### Changed

- The panel can now write to GitLab when the token allows it, so the footer, the configuration hints
  and the README read "read-only unless your token allows actions" rather than plain read-only.

## [0.7.8] - 2026-10-06

### Changed

- The action that starts an agent session from a failed Job is now labelled **Debug this job** and
  carries a bug icon, so its purpose is clear at a glance rather than only in its tooltip.

## [0.7.7] - 2026-10-06

### Fixed

- The log drawer trusts the Proxy service's truncation signal instead of guessing from the body length,
  so a log that happens to be exactly the cap is no longer wrongly labelled as capped.
- A remote whose scp-style host is capitalised (`git@GitLab.com:…`) now matches the configured
  `gitlab.com` instead of reporting “Different GitLab host”.

## [0.7.6] - 2026-10-06

### Fixed

- The Panel now follows a GitLab project that has been renamed or moved when it reaches GitLab through
  the Proxy service. The service was following the redirect itself, so the Panel never saw the move and
  reported an authorization error instead; the service now returns the redirect for the Panel’s heal
  path to follow.

## [0.7.5] - 2026-10-06

### Fixed

- The proxy service refuses any request whose path resolves off the Configured GitLab host, so a crafted
  protocol-relative path can no longer carry the Access token to another host.
- The proxy service forwards only `GET`, so GitLab access is read-only at the service boundary rather
  than relying on every caller to be.
- The proxy service reads a GitLab response incrementally and stops at the size cap, so a huge response
  can no longer be fully buffered in memory before it is trimmed.
- The service rejects a request body over its cap with `413`, and an invalid `OPENCHAMBER_SERVICE_PORT`
  now fails at startup with a clear message instead of a `NaN` listen crash.
- A configuration-write failure — an unwritable config directory, say — now answers `500` instead of
  leaving the Panel's request unanswered.

## [0.7.4] - 2026-10-02

### Fixed

- The Panel no longer repeats the GitLab icon and “GitLab Pipelines” heading that the host’s panel
  title bar already draws; the header keeps only the status and the Configure/Refresh controls.
- The header context line is now a single row — `host/project · user` on the left, freshness and the
  Configure/Refresh controls on the right — instead of two stacked rows.

## [0.7.3] - 2026-10-02

### Fixed

- The configuration form’s Save button now saves. The panel runs in an iframe sandboxed with
  `allow-scripts` only, so a native form submit never fired and the form sat there with no feedback;
  Save is now an explicit button click (Enter in a field also saves).

## [0.7.2] - 2026-10-02

### Fixed

- The “Different GitLab host” state now points at the Configured host — which is the real fix —
  instead of the Project setting, and offers a Configure button that opens the form with the
  detected host pre-filled.

## [0.7.1] - 2026-10-02

### Changed

- The extension now shows as "GitLab Pipelines" in the rail, the document title and the panel header,
  and the authenticated username appears in the header instead of the footer.
- The Configure control uses a standard settings (cog) icon.

## [0.7.0] - 2026-10-02

### Added

- `gitlab.com` as the default GitLab host, so a fresh install reads a gitlab.com project with no
  host configuration.
- A configuration form in the Panel (Configured host, Project override, Access token) whose token
  field is masked and posted once to the extension's Proxy service; the Panel never reads the token
  back.
- One Access token per host, held by the Proxy service in a `0600` file, so switching between
  `gitlab.com` and a self-managed instance keeps each token.
- The authenticated username, read through the Proxy service, in the Panel footer.

### Changed

- Every GitLab call now goes through the extension's Proxy service, which resolves and attaches the
  Access token itself; the Panel no longer uses OpenChamber's host request bridge or connection
  state.
- The Extension no longer declares an Integration, so it does not appear in Settings → Integrations
  and shows no Connect flow.
- The Proxy service must now be granted for any GitLab access, `gitlab.com` included.

### Removed

- The baked-in `apiOrigin` and the `host` / `token` integration settings.

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
