# 01: Skeleton — an installable Panel that shows the open project

**What to build:** The thinnest Extension that installs into OpenChamber and renders on the
right-hand rail, establishing the manifest, the build and the one host seam the rest of the work
hangs off. The Panel mounts once and shows the open project's directory, or a clear empty state when
nothing is open. It ships as a folder install: the manifest declares the Panel, TypeScript is bundled
to a classic IIFE ahead of time, and a test harness runs green against a fake host.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Installing the folder in OpenChamber shows a **Pipelines** Panel in the rail with the
      `git-merge-line` icon.
- [x] The Panel mounts once and renders the ready context — the open project's directory, or a clear
      empty state when none is open.
- [x] Source is TypeScript bundled by `openchamber-guest-bundle` into a classic IIFE at build time;
      nothing is compiled at install.
- [x] The host port seam exists: a narrow interface for the ready context and the operations the
      Panel needs, a real adapter over `connectHost()`, and a fake the tests use.
- [x] `bun test` runs and passes against the fake.
