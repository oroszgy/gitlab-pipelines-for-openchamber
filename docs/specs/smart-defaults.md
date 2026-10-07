# Spec: Smart defaults

Status: implemented — tickets `smart-defaults/01`–`04` are mapped in [`README.md`](README.md).
Feature: `smart-defaults`
Follows: [`docs/specs/pipelines-panel.md`](pipelines-panel.md) (its scope toggle and polling) and
[`docs/specs/downstream-pipelines.md`](downstream-pipelines.md) (the expansion it restores).

## Problem Statement

The Panel opens to a list the developer must click before seeing anything useful, even though the
answer they want is almost always "what is running, and did it fail?". A branch that has never had a
Pipeline reads as an empty list, which looks like a fault rather than the truth — and GitLab pipelines
are habitually sparse on fresh branches. Scope, the expanded Pipeline, its Downstream chain and the
open log are all forgotten on every remount, so a developer working in a worktree re-establishes the
same view repeatedly.

## Solution

Three defaults that make the first frame useful and the second visit instant:

1. **Auto-expand** the newest active Pipeline on load, so its stages are visible without a click.
2. **Fall back to All refs** automatically when the current Ref has no Pipelines, with a dismissible
   notice and a way back.
3. **Remember** the scope, expanded root Pipeline, Downstream chain and open Job drawer per
   host+project+ref in `host.storage`.

## User Stories

1. As a developer, I want the newest running or failed Pipeline already expanded, so that I see where
   it is at without clicking.
2. As a developer, I do **not** want a log drawer forced open on load, so that the list stays the focus.
3. As a developer on a fresh branch, I want to see the project's other Pipelines when mine has none, so
   that an empty branch does not look broken.
4. As a developer, I want that fallback explained and reversible, so that I know why the scope changed.
5. As a developer returning to a project, I want my scope and expansion restored, so that I resume
   where I left off.
6. As a developer who was reading a Job's Trace, I want it reopened, so that a remount does not lose it.
7. As a developer, I want a remembered Pipeline that no longer exists to fall back cleanly, so that a
   deleted Pipeline does not leave a dangling view.
8. As a maintainer, I want remembered state to stay out of the token file, so that UI preferences never
   touch the secret store.

## Implementation Decisions

### Where state lives

The host seam (`panel/host-port.ts`) gains `storage.get/set/delete/keys`, wrapping the SDK's ungated
`host.storage`. A small `panel/prefs.ts` owns the keys and their shape; keys are namespaced
`gp:v1:<host>:<project>:<ref>`, since `host.storage` is per-extension and global, not scoped per project.
Storage is best-effort: a failed read yields no remembered state and a failed write is ignored, never
blocking a render.

One record per key: `{ scope, pipelineId, downstream, jobId }`, all optional. On write, records are
LRU-pruned to a fixed count (a small constant) so the 2 000-key / 2 MiB budget is never approached.

### Auto-expand

A pure `panel/defaults.ts` chooses what to expand from the loaded list, the remembered record and the
active-status set already used by `poll.ts`:

- a remembered `pipelineId` that is still in the list **wins**;
- otherwise the **newest active** Pipeline (the first with an active Status in the list's own order)
  expands;
- otherwise nothing expands.

Auto-expand never opens the drawer. A remembered `downstream` chain and `jobId` are restored only when
their Pipeline/Job still resolves, and are dropped otherwise.

### All-refs fallback

On a **fresh** load in Branch scope where the resolved Ref exists and the list is empty, the Panel
switches to All refs once, records that this Ref has fallen back (in memory for the session), and shows
a one-time, dismissible notice naming the Ref and offering **Back to branch**. A manual scope change,
or the notice's action, suppresses the fallback for that Ref for the session. A subsequent Poll in All
refs never re-triggers it.

### Precedence and reset

Remembered state is per Ref, so switching Ref (or scope) is a different record and does not leak
expansion across branches. A host switch, a Project override change, or a token change clears the
in-memory view as it already does; storage records for other hosts simply remain for next time.

## Testing Decisions

- **`panel/defaults.test.ts`** (new): remembered wins; newest active otherwise; nothing when all
  settled; a stale remembered id falls back to auto-expand.
- **`panel/prefs.test.ts`** (new): key namespacing per host/project/ref; round-trip; an unreadable or
  unwritable store is non-fatal; LRU pruning drops the oldest.
- **`panel/panel.test.ts`** (through `FakeHost`): a running Pipeline is expanded on load and no drawer
  opens; a remembered expansion is restored; an empty branch falls back to All refs with the notice,
  and **Back to branch** returns and suppresses it; a remembered open Job reopens its drawer.

`FakeHost` gains an in-memory `storage` implementing get/set/delete/keys.

## Out of Scope

- A settings UI for defaults; the behaviour is fixed and the remembered record is implicit.
- Remembering per **worktree** rather than per project+ref.
- Cross-host or cross-project default views.
- Persisting anything in the service config; that file stays host/project/tokens.

## Further Notes

- **Host API, cited:** `host.storage` is per-extension, persistent on disk, global across projects, and
  needs no capability (`node_modules/@openchamber/sdk/dist/host.d.ts`, `workspace.d.ts`; API.md "needs no
  extra capability"). Limits: 64 KiB/value, 2 MiB and 2 000 keys per extension.
- **Domain language:** no new `GLOSSARY.md` term.
