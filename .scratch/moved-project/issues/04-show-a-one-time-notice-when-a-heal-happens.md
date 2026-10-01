# 04: Show a one-time notice when a heal happens

**What to build:** When the Panel heals a moved project, show a one-time, dismissible notice naming the old
path and the target — `Showing <old path> as <target>` — so the user knows why pipelines appeared under a
new id and can fix their git remote in their own time. Dismissal is in-memory for the Panel's lifetime, so
a remount may show it again; nothing is persisted.

**Blocked by:** 02 — Heal the session project and retry.

**Status:** done

- [x] A successful heal renders a notice naming the old path and the target.
- [x] The notice is dismissible, and stays dismissed for the Panel's lifetime.
- [x] The notice does not appear when no heal has happened, including on a refresh that reuses the cache.
- [x] Panel tests cover: the notice appears once on heal, names both paths, and disappears when dismissed.
