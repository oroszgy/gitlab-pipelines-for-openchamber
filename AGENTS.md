## Agent skills

Important: ALWAYS use OpenCode's question tool to ask questions!

### Issue tracker

Issues live on GitHub: <https://github.com/oroszgy/gitlab-pipelines-for-openchamber/issues>. See
`docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, label string equal to role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Repo map

- **Verified findings** — host API, icon rendering, project/ref resolution: `docs/research/`.
- **Feature specs** — `docs/specs/<feature>.md`, with their implementation tickets on GitHub Issues,
  mapped in `docs/specs/README.md`.
- **Coding standards** (read at review): `CODING_STANDARDS.md`.
- **Built bundles** — `panel/main.js` and `service/main.js` are built by `bun run build` and
  **committed**, because OpenChamber never compiles an extension and installs it straight from the
  repo URL. Regenerate and commit them with any source change (the pre-commit hook stages them);
  never hand-edit them, and skim their diff at review only to confirm they were regenerated.
- **Before committing** — `bun run check` (typecheck + build + tests). A Husky pre-commit hook runs it
  and stages the rebuilt bundles.

## Versioning

A user-observable change gets a version bump and a `CHANGELOG.md` entry **in the same commit** as the
change:

- Bump `package.json`'s `version` — minor for a feature, patch for a fix. OpenChamber reloads an
  extension when its version changes, so the bump is what makes a new manifest take effect.
- Add the entry under a new version heading in `CHANGELOG.md`, using `Added` / `Changed` / `Fixed` /
  `Removed` and a `YYYY-MM-DD` date.

The bump commit must carry regenerated bundles: `bun run build` rewrites `panel/main.js` and
`service/main.js`, and the pre-commit hook stages them, so a release is installable as pushed.

Docs- and chore-only changes no user can observe leave the version alone.
