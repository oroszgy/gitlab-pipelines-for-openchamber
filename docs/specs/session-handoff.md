# Spec: Session handoff

Status: implemented.
Feature: `session-handoff`
Follows: [`docs/specs/pipelines-panel.md`](pipelines-panel.md) (which deferred this under “Out of Scope”).

## Problem Statement

When a Job fails, the developer can already see *that* it failed in the Panel — but not act on it
there. To ask an agent to fix it, they leave the workspace, open the Trace in GitLab, copy the
context they think matters, and paste it into a new session by hand. That is exactly the loop the
Pipelines Panel exists to keep intact, and it is most painful precisely when CI is red.

## Solution

A **Debug this job** action on a failed Job. It starts a new OpenChamber session against the open
project, seeded with the Job's identity, links and the tail of its Trace, and opens that session so
the agent can investigate and fix. The action appears on the Job row and in the log drawer, two
clicks apart. It reads nothing new from GitLab and writes nothing to GitLab.

## User Stories

1. As a developer looking at a failed Job, I want a **Debug this job** action, so that I can hand the
   failure to an agent without leaving the workspace.
2. As a developer, I want the action on the Job row *and* in the log drawer, so that I can act
   whether I have already opened the log or not.
3. As a developer, I want the session seeded with the Job's project, Pipeline `iid`, Ref, short SHA,
   Stage and links, so that the agent knows exactly what failed.
4. As a developer, I want the last ~100 lines of the Trace included, so that the agent sees the
   failure without me copying it.
5. As a developer, I want the session to open on creation, so that I can watch the agent work.
6. As a developer, I want a clear message when the handoff cannot start (no open project, a failed
   log fetch, or the host skipping the send), so that I am not left thinking it worked.
7. As a developer, I want the action to work with the capabilities the Extension already has, so that
   installing it does not prompt me to approve anything new.
8. As a developer, I want the action to appear only on genuinely failed Jobs, so that the Panel does
   not suggest fixing runs that did not fail.

## Implementation Decisions

**A new pure module: `handoff`.** `panel/handoff.ts` turns `{ providerId, project, pipeline, job,
trace }` into a `StartSessionRequest` and the prompt text. It owns the prompt template, the tail
size (`HANDOFF_TRACE_LINES = 100`) and the clamp to the SDK's 16 000-char `GUEST_ATTACH_TEXT_MAX`.
Pure and table-tested: no DOM, no port, no clock.

**The host port gains one method.** `HostPort.startSession(request)` wraps `connectHost().startSession`;
the fake records the request and returns a configurable result. This is the Panel's **first outbound
action** — every other port method is a read.

**The request.** `providerId` is `PANEL_ID`; `id` is `job-<jobId>`; `title` is the Job's name;
`url` is the Job's `web_url`; `text` is the prompt; `navigation` is `'open'`. `projectId` is omitted,
so the host uses the open project's directory. Model, agent and the session's own title are the
host's to choose and are never sent. The host clamps the short fields itself, so only the prompt is
clamped here.

**The prompt.** Identifiers and links, then the fenced Trace tail, then an investigate-and-fix
instruction with an explicit infrastructure/flaky fallback (so the agent does not invent a code fix
for a runner or network failure). The Trace section is omitted when the log is empty. The whole text
is clamped under 16 000 chars by keeping the *end* of the tail, where failures surface.

**Where it appears.** Only Jobs whose Status is `failed`; a Job with `allow_failure` still failed, so
it is offered too (the label already reads “failed (allowed)”). Not on `canceled`, `manual`, running or
passing Jobs. On the Job row and in the log drawer's header. The Job row becomes a `div` with
`role="button"` and keyboard handling so a real `<button>` can sit inside it without nesting buttons.

**When it is unavailable.** With no open project (`ctx.directory === null`, e.g. a project pinned by
the `project` setting), the action is rendered **disabled** with a title explaining that a project
must be open — a session with no checkout cannot fix anything. If the open Job's Trace is not yet
cached, the handoff fetches it first; a failed fetch is its own message, never a silent no-op.

**Result handling.** `sent: 'sent'` needs nothing — the host opens the session. Any other outcome
(`'no-model'`, `'skipped'`, `'failed'`, or the failure union) is surfaced as an inline notice in the
Panel naming what happened, dismissible by hand. No toast: the notice is part of the rendered Panel
and is deterministic to test. The action disables itself while a handoff is in flight, so a double
click cannot start two sessions. A Job whose Pipeline object is not in the current list still hands
off — the Pipeline identifiers are simply omitted from the prompt.

**Manifest.** `prompt` is declared alongside `sessions`. A `startSession` carrying seed `text` is
guarded by *both* capabilities on the host — `startSession` answers `NOT_GRANTED` without `prompt` —
so `sessions` alone does not cover the handoff. `prompt` is a new capability, so OpenChamber
re-approves the extension once.

## Testing Decisions

A good test asserts external behaviour: what the module produces for a given input, or what the Panel
does through the fake port. Two seams:

- **`handoff`** (pure, `tests/handoff.test.ts`): the prompt contains every identifier and link; the
  tail is the last 100 lines (not more); a long tail is clamped under 16 000 chars with the failure
  end kept; an empty Trace omits the fence; `buildHandoff` sets id, title, url, text and
  `navigation: 'open'`.
- **`panel`** (through `FakeHost`, `tests/panel.test.ts`): a failed Job shows the action on its row
  and in the drawer; clicking either calls `startSession` with the seeded request; a non-`sent`
  result shows the notice; the action is disabled with an explanation when there is no open project;
  a passing Job has no action.

`FakeHost` gains `startSession` (recording requests), a configurable result, and a way to throw.

## Out of Scope

- **Selection-level handoff** — selecting text in the Trace drawer and starting a session from it.
  This is the deliberate next step (“Job action first, selection next”); it reuses this module.
- Attaching the Job as context to an **existing** session instead of starting a new one.
- Offering the action on `canceled`, `manual`, running or passing Jobs.
- Choosing the session's model, agent or title.
- Sending the **whole** Trace (only the tail travels; the Job `web_url` lets the agent fetch more).
- Any loop that watches the session or re-runs the Pipeline and reports back.

## Further Notes

- **Host API, cited:** `docs/research/openchamber-extension-research.md` §2.4 and §3.5 (the
  `startSession({ providerId, id, title, url, text })` sketch), and the shipped SDK types
  `StartSessionRequest`, `StartSessionResult`, `GUEST_ATTACH_TEXT_MAX` in
  `node_modules/@openchamber/sdk/dist/contract.d.ts`.
- **Domain language:** “Session handoff” in `GLOSSARY.md`; the Panel's read-only claim is scoped to
  GitLab there, since this is the Extension's only outbound action.
- **Deliberately deferred by the Pipelines Panel:** [`docs/specs/pipelines-panel.md`](pipelines-panel.md):215.
