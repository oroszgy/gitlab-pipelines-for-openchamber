# Spec: Artifacts

Status: specified — tickets `artifacts/01`–`05` are mapped in [`README.md`](README.md).
Feature: `artifacts`
Follows: [`docs/specs/pipelines-panel.md`](pipelines-panel.md) (the Job list it extends),
[`docs/specs/log-drawer.md`](log-drawer.md) (the drawer it gains a tab on),
[`docs/specs/caching-and-transport.md`](caching-and-transport.md) (the 256 000-character body cap and
the conditional-GET cache), and [`docs/specs/pipeline-actions.md`](pipeline-actions.md) (the Job `⋯`
menu and the capability-gated posture); records ADR-0013.

## Problem Statement

A Job's artifacts — test reports, coverage, logs, screenshots and build output — are where the answer
to "why did it fail?" usually is, but the Panel cannot show them. The only way to read a failing
`junit.xml`, check a coverage number or open a screenshot is to leave OpenChamber and find the Job in
GitLab's web UI. The Trace answers "what happened"; it does not answer "which tests failed" or "what
did this Job produce". The extension already knows which Jobs produced artifacts — the Jobs response
carries the artifact metadata and its expiry — so the data is one step away and the context switch is
unnecessary.

The Pipeline's own reports are invisible too: GitLab surfaces a test report and a coverage figure for
every Pipeline, and the Panel shows neither.

## Solution

- **Artifacts tab.** A Job that produced artifacts grows an **Artifacts** tab beside its **Trace** in
  the drawer: the archive's file tree, browsed lazily directory by directory, and a read-only preview
  of a text artifact.
- **Reports strip.** The expanded Pipeline shows a compact `Tests … · Coverage …` strip when GitLab has
  a test report or coverage; opening it lists the failing tests and the suite breakdown, each failure
  reaching its Job.
- **Download.** One action saves the Job's whole archive to a local cache directory through the Proxy
  service, and the Panel names the saved path with a copy action.

## User Stories

1. As a developer looking at a failed Job, I want to see that it produced artifacts, so that I know
   there is more to the failure than the Trace.
2. As a developer, I want to browse the artifact archive as a file tree, so that I can find the report
   or log I need without downloading and unzipping.
3. As a developer, I want directories to open lazily, so that a large archive does not stall the Panel.
4. As a developer, I want to see each file's size, so that I can tell a small report from a large
   binary before opening it.
5. As a developer, I want to open a text artifact in a read-only preview, so that I can read a log or a
   JSON report in place.
6. As a developer, I want a large text artifact to say it is truncated, so that I do not mistake the
   first window for the whole file.
7. As a developer, I want a binary artifact not to be dumped into the preview, so that the Panel stays
   readable; I want it offered for download or opened in GitLab instead.
8. As a developer, I want to know when a Job's artifacts have expired, so that a missing archive is
   explained rather than looking broken.
9. As a developer, I want a Job that produced no artifacts to simply not offer the tab, so that absence
   is not shown as an error.
10. As a developer, I want to see the Pipeline's test summary — passed, failed, skipped — so that I can
    judge the failure at a glance.
11. As a developer, I want the failing tests named, so that I can go straight to the one that matters.
12. As a developer, I want a failing test to reach its Job, so that I can read the Trace around it.
13. As a developer, I want the Pipeline's coverage figure, so that I can see whether this change moved
    it.
14. As a developer, I want the report to be absent rather than wrong when GitLab has none, so that an
    empty report is distinct from a failed fetch.
15. As a developer, I want to download a Job's whole archive, so that I can unzip it locally.
16. As a developer, I want the saved path shown and copyable, so that I can open it in my file manager.
17. As a developer, I want a download to say when it exceeded the size cap, so that I know why it did
    not save.
18. As a developer, I want the download cache to be bounded and pruned, so that it does not grow
    without limit.
19. As a developer on an older GitLab, I want browsing to degrade with an explanation and a link, so
    that the tab is not a dead end.
20. As a security-conscious user, I want the Access token never to follow the archive's redirect to a
    CDN, so that a download cannot leak it to another host.
21. As a developer, I want the existing drawer actions to keep working beside Artifacts, so that the
    drawer stays one place.
22. As a maintainer, I want the download to stay inside the Proxy service, so that the sandboxed Panel
    still never holds the token or writes outside its allowed paths.

## Implementation Decisions

### Where it lives

The Job drawer (`log-drawer`'s surface) becomes tabbed: **Trace**, and — only when the Job has
artifacts — **Artifacts**. The tab is driven by the artifact metadata already in the Jobs response;
selecting a Job with no artifacts shows only Trace, exactly as today. The expanded Pipeline gains a
**Reports** strip above its jobs when it has a test report or coverage, opening a report view.

### What the Panel reads

- **The artifact tree:** `GET /projects/:id/jobs/:job_id/artifacts/tree`, with `path` to descend and
  `recursive` left off; entries carry `name`, `path` (directories with a trailing `/`), `type` (`file`
  or `directory`), `size` and `mode`. The tree fetches lazily per directory and goes through the
  existing conditional-GET cache.
- **A single artifact:** `GET /projects/:id/jobs/:job_id/artifacts/*artifact_path`. A text artifact is
  shown up to the proxy's body cap, and a larger one carries the existing truncation notice. A binary
  artifact is never previewed.
- **The test report:** `GET /projects/:id/pipelines/:pipeline_id/test_report` for the counts and cases,
  with `test_report_summary` as the cheaper path where the full report is not needed.
- **Coverage:** the `coverage` field the Pipeline and Job payloads already carry.

Report artifacts are **not** read from the archive: GitLab does not include `artifacts:reports` files in
the archive unless they are also listed under `artifacts:paths`, and the `file_type` download that
serves them individually exists only from GitLab 19.4. The Pipeline's parsed `test_report` is the
supported, older route, so Tests and Coverage render from GitLab's structured endpoints.

### The archive download (a new service route)

The archive is a zip, and the `/proxy` route decodes every body as UTF-8 text and caps it at 256 000
characters, so a binary archive cannot cross it. A new service route mirrors `/proxy`'s contract — the
Panel supplies the base URL, the service resolves the Access token from its own configuration and
refuses when none is stored — but:

- it fetches the archive as bytes and writes it to a file, never returning the body to the Panel;
- it follows redirects **only** while the target stays on the Configured host, and drops the
  `Authorization` header on a cross-host hop (the GitLab.com CDN), refusing a non-`https` target or a
  runaway chain, so the Access token can never reach another host;
- it streams to a temporary file and renames on success, and enforces a byte cap — over it, it aborts,
  removes the temporary file and reports the failure, so no partial archive is left;
- it writes under a cache directory resolved the way the config path already is (`XDG_CACHE_HOME` on
  Linux, `Caches` on macOS, `%LOCALAPPDATA%` on Windows), under
  `gitlab-pipelines/artifacts/<host>/<project>/<job>/artifacts.zip`, every path segment sanitised;
- it prunes older saved archives best-effort so the cache stays within a bounded total size.

The Panel receives `{ path, size }` and shows a toast naming the path with a **Copy path** action
(`host.writeClipboard`) — the precedent the log-drawer spec set when it rejected writing to
`~/Downloads`. No new host capability is needed: the download is a `serviceRequest`, and the `files`
capability the Panel already holds is untouched.

### New and changed modules

- A pure **artifact module** owns everything derived without the DOM: classifying a file as text or
  binary from its `file_type` and extension, joining and sanitising archive paths, and formatting sizes.
- A pure **report module** parses `test_report` into counts, suites and failures, ranks the failures for
  display, and formats the coverage figure.
- The **GitLab client** gains the tree, single-file, test-report and download calls behind the existing
  injected `Requester`, so tests drive them exactly as the current reads are driven.
- The **service** gains one config-resolving route handler (like the proxy route) and one module for the
  binary fetch-to-file, both with `fetch` and the filesystem injected.
- The `Job` and `Pipeline` shapes gain the metadata the API already returns: `artifacts`,
  `artifacts_expire_at` and `coverage`.

### States

Failure and absence stay distinct, per the coding standards: an absent `artifacts` array means the tab
does not appear; a 404 on the tree means the archive cannot be browsed, with an Open-in-GitLab link; an
`artifacts_expire_at` in the past means expired; a missing or empty `test_report` hides the strip; a
failed fetch is an error state of its own. A tree 404 on an older GitLab degrades to "browsing is not
available on this GitLab" rather than an error.

## Testing Decisions

Good tests assert externally visible behaviour — what the Panel renders for a Job with artifacts, what
a click fetches and shows, what the service does with a redirect or an oversized body — and never reach
into private state.

- **The pure artifact and report module(s)** are driven with table cases: text-vs-binary classification
  by type and extension; path join and sanitisation; size and coverage formatting; `test_report`
  parsing into counts and a ranked failure list. Prior art: `panel/defaults.test.ts`.
- **`panel/panel.test.ts` (through `FakeHost`)** proves the interactive edge: the Artifacts tab appears
  only for a Job with artifacts; opening it lists the tree and descending a directory fetches the next
  level; a text file previews and a binary file does not; **Download archive** calls the service and
  raises a toast with the path; the Reports strip appears only when a report exists; a failing test
  reaches its Job. Prior art: the drawer and downstream tests in the same file.
- **The service module and route** run with an injected `fetch` and filesystem: a same-host redirect
  keeps the token, a cross-host redirect drops it, a non-`https` target is refused, an oversized body
  aborts and removes the temporary file, and the path is sanitised. Prior art: `tests/proxy.test.ts`
  and `tests/routes.test.ts`.
- **`FakeHost`** gains the new service route so panel tests reach it the way the real service is
  reached, and its `job()`/`pipeline()` builders gain the artifact fields.

## Out of Scope

- Downloading a **report file** directly (`?file_type=`) — GitLab 19.4 and later only.
- Extracting the archive in the service; the Panel saves the zip.
- Artifacts of a Downstream pipeline in **another project** — the archive belongs to a project the
  checkout is not in, so those link to GitLab instead. A child pipeline in the same project is in
  scope with the root's Jobs.
- A downloads list or a cache-management UI; the cache is pruned, not browsed.
- Editing, deleting or keeping artifacts (`artifacts/keep`, `erase`).
- Rendering report types other than the test report and coverage (code quality, SAST and the rest).
- Previewing binary artifacts in the Panel.

## Further Notes

- **Host API, cited:** the download needs **no** host capability — it is a `serviceRequest`, and
  `host.writeClipboard` is ungated (`node_modules/@openchamber/sdk/dist/host.d.ts`, API.md). The
  sandboxed Panel cannot fetch binary or open a file path, which is why the service writes the file.
- **Decision recorded:** ADR-0013 — "Stream a Job's artifact archive to a cache directory in the
  service".
- **Domain language:** new `GLOSSARY.md` terms **Artifact** and **Report artifact** (avoid "build
  output").
- **Versioning:** a user-observable feature — a minor bump with a `CHANGELOG` entry in one release
  commit carrying the regenerated bundles.
