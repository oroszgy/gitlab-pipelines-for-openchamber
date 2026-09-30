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
- **Before committing** — `bun run check` (typecheck + tests). A Husky pre-commit hook runs it.
