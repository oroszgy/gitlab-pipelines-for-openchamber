## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, label string equal to role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Repo map

- **Verified findings** — host API, icon rendering, project/ref resolution: `docs/research/`.
- **Feature specs** — `.scratch/<feature>/spec.md`, with implementation issues beside them at
  `issues/NN-*.md`.
- **Coding standards** (read at review): `CODING_STANDARDS.md`.
- **Generated bundles** — `panel/main.js` and `service/main.js` are built by `bun run build`, are
  gitignored and never committed. Rebuild after touching their sources; skip them in searches and review.
- **Before committing** — `bun run check` (typecheck + build + tests). A Husky pre-commit hook runs it.

## Versioning

A user-observable change gets a version bump and a `CHANGELOG.md` entry **in the same commit** as the
change:

- Bump `package.json`'s `version` — minor for a feature, patch for a fix. OpenChamber reloads an
  extension when its version changes, so the bump is what makes a new manifest take effect.
- Add the entry under a new version heading in `CHANGELOG.md`, using `Added` / `Changed` / `Fixed` /
  `Removed` and a `YYYY-MM-DD` date.

Docs- and chore-only changes no user can observe leave the version alone.
