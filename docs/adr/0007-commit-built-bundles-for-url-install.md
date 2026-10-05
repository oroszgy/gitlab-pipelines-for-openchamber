# Commit the built bundles so the extension installs from the repository URL

OpenChamber installs an extension from a git URL by copying the repository and running it exactly as
it sits; it never compiles TypeScript. The install check fails with `missing-build` unless
`panel/main.js` and `service/main.js` exist on disk, and the shipped `panel/index.html` loads
`./main.js`. The repo gitignored both bundles, so pasting the repository URL failed and only a manual
clone-and-build folder install worked. A git URL is also the only install OpenChamber can update in
place (it compares the package `version`), and the only one enterprise mode allows for an extension
that declares a `service`.

We commit `panel/main.js` and `service/main.js` to the default branch. A source change regenerates
them with `bun run build`; the Husky pre-commit hook rebuilds and stages them, so the committed
artifact always matches the source. Releases are tagged (`v0.7.4`), and the README installs by pasting
the repository URL into Settings → Extensions.

**Considered options.** A built `.zip` attached to each GitHub Release keeps generated JS out of git,
but zip installs do not update, and enterprise mode refuses them because of the declared service. A
separate `dist` branch carrying only the built package keeps `main` clean, but without CI it must be
kept in step by hand on every release and it splits the version bump from the source commit. Both add
a heavier release ritual than this project wants, for a benefit — a clean history — that is not worth
the installability we would lose.

**Consequences.** Generated files appear in diffs and must never be hand-edited; review skims them
only to confirm they were regenerated. The version bump OpenChamber keys on lands in the same commit
as the regenerated bundles, and every tagged commit is directly installable.
