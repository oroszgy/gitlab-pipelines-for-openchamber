# Spec: Notifications

Status: specified — tickets `notifications/01`–`08` are mapped in [`README.md`](README.md).
Feature: `notifications`
Follows: [`docs/specs/pipelines-panel.md`](pipelines-panel.md) (its Poll is the surface-lived part) and
[`docs/specs/pipeline-actions.md`](pipeline-actions.md), and records ADR-0011.

## Problem Statement

The Panel only tells a developer that CI failed if they are already looking at it. Nothing watches a
ref: closing the tab, or simply working in the editor, means a red Pipeline goes unnoticed until the
developer next opens the Panel — the opposite of the loop the Extension exists to close. But
OpenChamber cannot push to an extension, and neither can the Proxy service; the rail panel runs only
while its tab is open and a Work Status section only while that panel is shown and expanded. A watch
that survives with **no surface mounted** is therefore the whole problem.

## Solution

A **Watched Ref** per project, polled by the **Proxy service** itself — a host-runtime process that is
already running with the user's rights and Access token. The service records **Terminal events**
(success / failed / canceled) in a bounded, persisted event log. Surfaces consume events through a
watermark they advance as they read: **failed/canceled raise a host toast**, **success is badge-only**,
and the rail **badge** counts Unseen events. A compact **Status section** in Work Status shows the
watched Ref, its latest Status and the unseen count, and toggles the watch. A mounted surface also
records the transitions it observes, and the service dedupes by identity, so nothing toasts twice.

## User Stories

1. As a developer, I want to watch the Ref I am working on, so that its CI is noticed even when the
   Panel is closed.
2. As a developer, I want a toast when a watched Pipeline fails, so that I find out without asking.
3. As a developer, I want a rail badge counting unseen outcomes, so that I can see at a glance that
   something finished while I was away.
4. As a developer, I want the badge to clear when I open the Panel, so that it means "new since last
   look".
5. As a developer, I want a compact status line in Work Status, so that CI status is visible beside my
   session without opening the rail.
6. As a developer, I want to toggle the watch from that section, so that opt-in is one click.
7. As a developer, I want terminal outcomes to survive a restart in the event log, so that a failure
   while away is not lost.
8. As a developer, I do not want a success to interrupt me, so that only failures toast.
9. As a maintainer, I want the service's unattended polling to be bounded and opt-in, so that the token
   is not used without the user's intent.
10. As a maintainer, I want an older service without a poller to degrade gracefully, so that a Panel and
    service from different versions still work.

## Implementation Decisions

### Watches are service-owned, one per project

The service's configuration gains a watch record keyed by normalized host+project holding one Ref, its
`addedAt`, and a per-watch watermark. New routes: `GET`/`PUT /watch` (read and set/clear the watch for a
host+project) and `GET /events` (terminal events after a cursor). Watches are **one per project**:
setting a watch for a project replaces its Ref. Watch and event state persist across a service restart
(ADR-0011).

### The service poller

`service/poller.ts` polls each watched Ref on a slower floor than the Panel (a constant, ~60 s),
adaptively widening on activity age, and honours `429`/`Retry-After` exactly as
[`caching-and-transport.md`](caching-and-transport.md) defines. It calls the Pipeline list for
`ref=<watched ref>` and records a Terminal event for each newly settled Pipeline (identity:
watch + Pipeline id + Status). It never runs with no watches. It reuses the same caps and redirect
handling as a proxied call; a moved project is recorded as a watch error rather than followed.

### The event log and watermarks

Events are `{ host, project, ref, pipelineId, status, at }`, kept in a bounded log (a fixed cap, oldest
dropped) and persisted. A surface reads `GET /events?after=<cursor>`; as it consumes them it advances
its **seen** marker, which is what makes the events "seen" to both surfaces. A mounted surface may also
`POST /events` for a transition it observed itself, so a running Panel toasts instantly; the service
dedupes by identity so the poller does not record it again.

### Surfaces

- **Rail panel.** On mount, reads unseen events, recomputes the badge via `setBadge`, advances the seen
  marker, toasts failed/canceled, and offers a watch toggle for the current project+Ref. Opening the
  visible rail panel clears the badge (host behaviour) and advances the seen marker.
- **Status section.** A new `contributes.statusSection` entry (its own `status/main.js` +
  `status/index.html`, built alongside the panel and service bundles). It shows the watched Ref, the
  latest Status, the unseen count, and a watch toggle; clicking opens the rail panel. It runs only while
  Work Status is shown and its section expanded, and it does **not** clear the badge.

### Badge and toasts

`setBadge(unseenCount)` where `unseenCount` is the number of events past the seen marker, capped at the
host maximum. It is in-memory and rebuilt from persisted events on mount; a reload does not lose
unseen events because the watermark lives in the service. `toast({ kind: 'error', message })` is raised
once per failed/canceled event; success changes the badge only. Neither needs a capability.

### Degradation

The `/watch` and `/events` routes are additions; a Panel talking to an older service sees them 404 and
disables watching with an explanation rather than failing. The manifest gains only
`contributes.statusSection` — no declared capability — so no re-approval is required.

## Testing Decisions

- **`service/poller.test.ts`** (new): records a terminal event on a first settled Pipeline; does not
  re-record the same identity on a later poll; widens on age; pauses on `429`; no calls when there are
  no watches; a moved project records a watch error.
- **`service/routes.test.ts`** (extended): `PUT /watch` sets and replaces; `GET /events?after` returns
  only later events; `POST /events` dedupes by identity; the bounded log drops the oldest.
- **`service/config.test.ts`** (extended): watches and events round-trip and persist.
- **`panel/panel.test.ts`** (through `FakeHost`): unseen events set the badge and toast failed/canceled
  but not success; opening the panel clears the badge and advances the watermark; a Panel/older service
  without `/watch` disables watching with an explanation.
- **`panel/status-section.test.ts`** (new, DOM shim): renders the watched Ref, latest Status and count;
  the toggle calls `PUT /watch`; clicking opens the rail panel.
- **`tests/manifest.test.ts`** (extended): `contributes.statusSection` is present and no capability was
  added.

## Out of Scope

- Watching more than one Ref per project, or all refs at once.
- Watching across projects from one surface.
- Notifying on non-terminal Statuses (running, pending, manual).
- Push or streaming; polling remains the model (ADR-0002, ADR-0011).
- An OS-level or out-of-app notification; only the rail badge and host toast exist.
- Choosing which Statuses toast per watch; failed/canceled toast, success does not.

## Further Notes

- **Host API, cited:** `host.setBadge` and `host.toast` are ungated; the rail panel is hidden-but-running
  while its tab is open and is torn down when the tab closes; the badge is in-memory and cleared by the
  visible rail panel; a status section runs only while Work Status is shown and expanded, can set the
  badge/toast, and does not clear the badge (`node_modules/@openchamber/sdk/dist/host.d.ts`,
  `manifest.d.ts`; API.md).
- **Decision recorded:** ADR-0011.
- **Domain language:** **Watched Ref**, **Terminal event**, **Unseen event** and **Status section** in
  `GLOSSARY.md`.
