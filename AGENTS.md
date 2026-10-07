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

- **Verified findings** — host API, icon rendering, project/ref resolution: `docs/research/`
  (`inspecting-the-host.md` says how to read the host's shipped bundle when the SDK types cannot
  answer a behaviour question).
- **Feature specs** — `docs/specs/<feature>.md`, with their implementation tickets on GitHub Issues,
  mapped in `docs/specs/README.md`. When a feature ships, set its spec's `Status` to `implemented`
  and close its tickets, so the index never points at work that is done.
- **Coding standards** (read at review): `CODING_STANDARDS.md`.
- **Built bundles** — `panel/main.js`, `service/main.js` and `status/main.js` are built by `bun run
  build` and **committed**, because OpenChamber never compiles an extension and installs it straight
  from the repo URL. Regenerate and commit them with any source change (the pre-commit hook stages
  them; CI's `check:bundles` fails on drift); never hand-edit them, and skim their diff at review only
  to confirm they were regenerated.
- **Before committing** — `bun run check` (typecheck + build + tests). A Husky pre-commit hook runs it
  and stages the rebuilt bundles.

## Versioning

A user-observable change gets a version bump and a `CHANGELOG.md` entry, landed in one **release
commit** on its feature branch before merge — history reads `release: 0.11.0 — smart defaults`. A
multi-commit feature cannot bump every commit, so the release commit is the unit:

- Bump `package.json`'s `version` — minor for a feature, patch for a fix. OpenChamber reloads an
  extension when its version changes, so the bump is what makes a new manifest take effect.
- Add the entry under a new version heading in `CHANGELOG.md`, using `Added` / `Changed` / `Fixed` /
  `Removed` and a `YYYY-MM-DD` date.

The release commit must carry regenerated bundles: `bun run build` rewrites `panel/main.js`,
`service/main.js` and `status/main.js`, and the pre-commit hook stages them, so a release is
installable as pushed.

Docs- and chore-only changes no user can observe leave the version alone.
