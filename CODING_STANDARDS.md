# Coding standards

Rules that need judgement at review time — cross-file consistency, shape, boundaries. Mechanical
patterns (types, import shape) are left to tooling: `bun run check` (typecheck + tests) and the Husky
pre-commit hook. Prefer adding a check to adding a rule here.

Source is formatted by hand: single quotes, and lines may run past 80 columns. No formatter runs here
(`opencode.json` disables auto-formatting, because Prettier cannot reproduce this style), so a
whole-file reformat in a diff is a mistake, not a preference.

## Architecture

- **One host seam.** Every dependency on OpenChamber goes through `panel/host-port.ts`. The real
  adapter wraps `connectHost()`; tests substitute `FakeHost`. A new host operation is a method on the
  seam, never a direct `connectHost()` call elsewhere.
- **Pure logic behind the seam.** Resolution, request building, status mapping, grouping, polling,
  formatting and the handoff prompt are pure modules (`panel/*.ts` minus `panel.ts`). `panel/panel.ts`
  is the only module that touches the DOM.
- **No writes to GitLab.** GitLab access is read-only. The one outbound action is starting a host
  session (`panel/handoff.ts` → `startSession`); it is a host action, not a GitLab write.

## Tests

- **Assert external behaviour, not structure.** Drive pure modules with table cases; drive the panel
  through `FakeHost` and assert on the rendered DOM. Do not reach into private state or assert on
  internal wiring.
- **Distinguish failure from absence.** A failed fetch is an error; an empty result is a different
  state. Both must be represented and labelled apart — never conflate them.
- **Test the interactive edge.** A new interactive control needs a test proving it activates the way
  a user would (including keyboard, where relevant), not only that it renders.

## Language

- **Use `GLOSSARY.md` terms**, and avoid their `_Avoid_` synonyms (e.g. say _Job_, not _task_; _Trace_,
  not _log output_; _Ref_, not _branch_).
- **The extension is "GitLab Pipelines"** — always with a capital `L`, matching GitLab's own brand. That
  exact name is the manifest `panel.name`, the panel document title and the in-panel header title; the
  short "Pipelines" is only for prose that already names the extension.
