# Inspecting the host's shipped web bundle

Some host-behaviour questions are not answerable from `@openchamber/sdk`'s `.d.ts` files — for
example, how the rail hides an inactive panel, or whether a hidden panel iframe still intersects the
viewport (the question behind ADR-0012's `IntersectionObserver` visibility seam). The host ships as an
Electron app, and its renderer bundle sits inside `resources/app.asar`.

Locate the installed app's asar — typically `~/Applications/*/resources/app.asar`, or an AppImage's
mounted `/tmp/.mount_*/resources/app.asar` — then extract it to a scratch directory outside the repo:

```sh
npx @electron/asar extract <app.asar> /tmp/opencode/asar-out
```

Read the web bundle at `/tmp/opencode/asar-out/node_modules/@openchamber/web/` — its `src/` for the
source, its built assets for what actually runs. Use it as a primary source for a behaviour question,
then record the finding in a research note here rather than re-deriving it next time.
