# OpenChamber extensions: research for a GitLab pipelines panel

Status: research notes, written 2026-09-30. Every factual claim has an inline source.
Local artifacts (config files, the shipped SDK, the installed AppImage) are cited by path and, where
possible, by the equivalent public repository file.

---

## TL;DR

- **OpenChamber is a separate product built on top of OpenCode.** It is an "open-source workspace for
  running and reviewing AI coding work on desktop, web, VS Code, and mobile" and "uses OpenCode to run
  coding agents" ([README](https://github.com/openchamber/openchamber#why-opencode)). It is MIT, lives
  at [github.com/openchamber/openchamber](https://github.com/openchamber/openchamber), docs at
  [docs.openchamber.dev](https://docs.openchamber.dev/).
- **The extension mechanism is not OpenCode's plugin system.** OpenChamber has its own "extension" SDK
  (`@openchamber/sdk`). The docs say explicitly: "They are not the same thing as OpenCode plugins"
  ([Extensions](https://docs.openchamber.dev/extensions/)).
- **An OpenChamber extension is a folder** with `package.json` (an `openchamber` manifest block),
  `panel/index.html`, and `panel/main.js` (a prebuilt IIFE). It runs in a sandboxed iframe and talks to
  the host through `connectHost()` ([Build an extension](https://docs.openchamber.dev/sdk/)).
- **A GitLab pipelines panel maps cleanly onto this**: declare a `panel` plus an `integration.token`
  with `apiOrigin: "https://gitlab.com"` and `scheme: "bearer"`, then call
  `host.request({ path: "/api/v4/projects/:id/pipelines", ... })`. GitLab accepts a personal access
  token as `Authorization: Bearer <token>` ([GitLab REST auth](https://docs.gitlab.com/api/rest/authentication/#personal-project-and-group-access-tokens)),
  which is exactly what OpenChamber's `bearer` scheme sends ([manifest.ts](https://github.com/openchamber/openchamber/blob/main/packages/sdk/src/manifest.ts)).
- **OpenCode's plugin / skill / MCP surfaces do carry over**, because OpenChamber drives an OpenCode
  server; OpenChamber documents MCP servers and skills itself and bundles an OpenCode CLI
  (installed app `package.json` declares `opencodeCli.version: 2.0.18`). But those surfaces are for the
  **agent**, not for the UI panel the user asked for.
- **Open questions** are collected at the end; the biggest are self-managed GitLab (the `apiOrigin` is a
  static manifest field) and OAuth (the schema has `oauth`, but I could not confirm the redirect
  behaviour or client-secret handling from a primary source).

---

## 1. What OpenChamber is, architecturally

**Product.** "OpenChamber is an open-source workspace for running and reviewing AI coding work on
desktop, web, VS Code, and mobile." Surfaces: Desktop (macOS/Windows/Linux), Web/PWA, VS Code, iOS/
Android, and CLI/Server ([README](https://github.com/openchamber/openchamber)).

**It is built on OpenCode.** The README's "Why OpenCode?" section: "OpenChamber uses
[OpenCode](https://opencode.ai) to run coding agents... OpenChamber is an independent project and is
not affiliated with the OpenCode team." Desktop "bundles the matching OpenCode CLI"
([README](https://github.com/openchamber/openchamber)).

**Concrete local evidence of the architecture** (installed AppImage, mounted read-only at
`/tmp/.mount_openchUPJI5m`; the AppImage itself is
`/home/gorosz/Applications/openchamber_ae8965d6bb106d58bec26979739c47a9.appimage`, 277,829,829 bytes):

- The app is an **Electron application**. `resources/app.asar` has top-level entries `package.json`,
  `dist-bundle/` (`entry.mjs`, `main.mjs`), `preload.mjs`, and `node_modules/`; there is also
  `resources/web-dist/` and `resources/opencode-cli/opencode`.
- `app.asar` → `package.json`: `"name": "@openchamber/electron"`, `"version": "2.0.3"`,
  `"opencodeCli": { "version": "2.0.18" }`, dependencies include `@openchamber/web`, `electron-updater`,
  `electron-log`, `zod`.
- The UI/backend package is **`@openchamber/web`** (desktop main calls `startWebUiServer(...)` and passes
  `builtInExtensionsDir` = `node_modules/@openchamber/web/server/built-in-extensions` when packaged).
- `@openchamber/web/package.json` (v2.0.3) depends on **`@opencode/client": "2.0.18"`** and
  `@opencode/schema": "2.0.18"`, and exposes the CLI binary `openchamber` (`bin/cli.js`). So the web
  server talks to an OpenCode server over its client/SDK.
- The installed OpenCode CLI reports **`opencode v2.0.16`** (`~/.opencode/bin/opencode --version`), i.e.
  the OpenCode **v2** line.

Public equivalents: the repo has `packages/` including `packages/sdk`, `packages/web`, `packages/vscode`,
`packages/ui` ([repo tree](https://github.com/openchamber/openchamber)). The server's own modules split
by domain (`packages/web/server/lib/` in the repo; the shipped `@openchamber/web/server/index.js`
imports from `./lib/opencode/...`, `./lib/guests/...`, `./lib/projects/...`). Notably there is a
`lib/guests/` module — "guest" is OpenChamber's internal name for an extension
(`extensionsPersistPath` comes from `lib/guests/persist.js`; `findInstalledGuest` from
`lib/guests/catalog.js`).

**Already-seen local state** (useful to know but not architecture):
`~/.config/openchamber/` (settings, projects, sessions, `preferences.json`, etc.) and
`~/.config/OpenChamber/` (Electron/Chromium profile: Cookies, Cache, Session Storage).

---

## 2. How to build an extension for OpenChamber

This is the core answer. OpenChamber ships a first-party extension SDK, **`@openchamber/sdk`**, and the
extensions are called "guests" internally and "extensions" in the docs.

### 2.1 Mechanism

From the shipped SDK (`@openchamber/sdk` v2.0.3, extracted from `resources/app.asar` →
`node_modules/@openchamber/sdk/`, which mirrors
[github.com/openchamber/openchamber/tree/main/packages/sdk](https://github.com/openchamber/openchamber/tree/main/packages/sdk)):

| Piece                      | What it is                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `@openchamber/sdk`         | Manifest parsing, the iframe `postMessage` protocol, and `connectHost()`                  |
| `@openchamber/sdk/ui`      | An optional plain-DOM UI kit (buttons, lists, fields, popups) that uses host theme tokens |
| `@openchamber/sdk/schemas` | Zod schemas for the manifest and wire messages                                            |
| `openchamber-guest-bundle` | The SDK's bundler binary (`scripts/bundle-guest.ts`)                                      |

The docs describe the model:

- "An extension is a small web page that OpenChamber shows on the right-hand rail. It talks to the app
  through `connectHost()`" ([Build an extension](https://docs.openchamber.dev/sdk/)).
- The page runs in a **sandboxed iframe**; it "cannot reach the network on its own... `fetch` reaches
  only your package's files." Outside calls go through `host.request`, with the user's token attached,
  and "the token never reaches your page" ([Build an extension § Accounts and network](https://docs.openchamber.dev/sdk/)).
- **Manifest lives under an `openchamber` key inside `package.json`** ([SDK README](https://github.com/openchamber/openchamber/blob/main/packages/sdk/README.md)).
- **No TypeScript at install time**: "OpenChamber never compiles your code. Ship the built `.js` file."
  The panel script must be a **classic IIFE**, because "the iframe cannot load ESM". Bundle with
  `bunx openchamber-guest-bundle panel/main.ts panel/main.js`, or esbuild with
  `--format=iife --platform=browser` ([API.md § Ship checklist](https://github.com/openchamber/openchamber/blob/main/packages/sdk/API.md); [Build an extension](https://docs.openchamber.dev/sdk/)).

### 2.2 File layout

```
my-gitlab-pipelines/
├── package.json          # name, semver version, and the "openchamber" manifest block
├── icon.svg              # optional, only if panel.icon names a .svg file
├── panel/
│   ├── index.html        # <script src="./main.js"></script>
│   └── main.js           # built IIFE (not ESM)
└── service/
    └── main.js           # optional, only for contributes.service (built JS)
```

Source: [API.md `Ship checklist`](https://github.com/openchamber/openchamber/blob/main/packages/sdk/API.md),
[SDK README "What you ship"](https://github.com/openchamber/openchamber/blob/main/packages/sdk/README.md).

### 2.3 The manifest (concrete, GitLab-flavoured)

Fields confirmed in the shipped
[`manifest.ts`](https://github.com/openchamber/openchamber/blob/main/packages/sdk/src/manifest.ts)
and the [docs manifest table](https://docs.openchamber.dev/sdk/#manifest):

```json
{
  "name": "@ec/gitlab-pipelines",
  "version": "0.1.0",
  "openchamber": {
    "apiVersion": 1,
    "engines": { "openchamber": ">=1.24.0" },
    "contributes": {
      "panel": {
        "id": "gitlab-pipelines",
        "name": "Pipelines",
        "icon": "git-merge-line",
        "entry": "panel/index.html"
      },
      "attach": false,
      "capabilities": ["sessions", "prompt"],
      "integration": {
        "name": "GitLab (token)",
        "description": "Reads CI/CD pipelines from a GitLab project.",
        "token": {
          "apiOrigin": "https://gitlab.com",
          "account": { "path": "/api/v4/user", "name": "username" },
          "scheme": "bearer"
        },
        "settings": [{ "id": "project", "label": "Project path or ID" }]
      }
    }
  }
}
```

Key manifest rules (all from the [manifest table](https://docs.openchamber.dev/sdk/#manifest) and
[`manifest.ts`](https://github.com/openchamber/openchamber/blob/main/packages/sdk/src/manifest.ts)):

- `apiVersion` must be `1`.
- `panel.id` is kebab-case; `panel.icon` is a Remixicon kebab name (`git-merge-line`) **or** a package
  `.svg` path. A URL/absolute path fails.
- `contributes.integration` must have **exactly one** of `oauth`, `token`, or `host` (the code counts
  them: `resolveIntegrationAuth` returns `null` unless exactly one is present).
- `integration.token.scheme` is `raw` (default; sends `Authorization: <token>`), `bearer`
  (`Authorization: Bearer <token>`), or `basic` (`Basic base64(username:token)`).
- `integration.token.apiOrigin` is the **only origin** `host.request` may call.
- `capabilities` are `prompt`, `sessions`, `files`, `model`; declaring an `integration` adds `network`
  automatically, a `service` adds `service`, `filesystem` globs add `filesystem`, and a session action
  asking for messages adds `conversation`. The user approves the full list once at install.
- Panel page + reading the open project/session need **no** capability
  ([docs, "What an extension may do"](https://docs.openchamber.dev/extensions/#what-an-extension-may-do)).

### 2.3.1 Icon resolution (`panel.icon`)

Verified against the installed app (`resources/app.asar` + `resources/web-dist`), not just the docs:

- `panel.icon` accepts a Remixicon name **or** a package `.svg` path, and both parse cleanly
  (`isPanelIcon` in `dist/manifest.js` only checks the name's _shape_). But the host only resolves a
  **reduced Remixicon palette**, so a well-formed name outside it — `gitlab-fill`, `gitlab-line` —
  renders **blank, with no error**. The host's own built-in GitLab panel uses `icon: 'window'`.
- For a custom logo, ship a **package SVG** (`panel.icon: "icon.svg"`, file at the package root).
  This is the only reliable route for a non-palette glyph.
- The host renders that SVG as `<img class="dark:invert object-contain">`. So ship **one black**
  glyph and let `dark:invert` turn it white on the dark theme. `fill="currentColor"` does **not**
  work here: it is an `<img>`, outside the document, so `currentColor` resolves to black regardless
  of theme. The app themes by a `.dark` class (not `prefers-color-scheme`), so an embedded media
  query will not match either.

### 2.4 Host API used by a panel

From the [shipped API.md](https://github.com/openchamber/openchamber/blob/main/packages/sdk/API.md) and
the [Host API docs](https://docs.openchamber.dev/sdk/host/). Highlights for a pipelines panel:

- `connectHost()` and `host.onReady((ctx) => ...)`: first snapshot + theme tokens, locale, directory,
  session, `surface` (`panel` / `dialog` / `page` / `status` / `background`), and connection/settings.
- `host.request({ method, path, query?, body? })` → `{ status, body }`: **the only way to reach an
  external API**; method is `GET|POST|PUT|PATCH|DELETE`, `path` must start with `/`, no scheme, stays on
  the declared `apiOrigin`; **20 s timeout, 256 000-char response cap** (field limits table).
- `host.onConnection(({ connected, account }) => ...)` and `host.oauthStart()` / `oauthDisconnect()`.
- `host.storage.get/set/delete/keys` for extension-owned JSON (64 KiB per value, 2 MiB namespace).
- `host.compose`, `attach`, `startSession`, `prompt`, `sessionLink` (gated by capabilities),
  `listProjects/listSessions/onSessions`, `toast`, `openUrl`, `setBadge`, `openCommit`, `setHeight`.
- Errors come back as `HostRequestError.code` (`HOST_UNAVAILABLE`, `HOST_TIMEOUT`, `DISCONNECTED`,
  `DISABLED`, `NOT_GRANTED`, `NO_DIRECTORY`, `NOT_FOUND`, `FILE_TOO_LARGE`, ...).

Additional surfaces (from [API.md](https://github.com/openchamber/openchamber/blob/main/packages/sdk/API.md)
and the live [docs](https://docs.openchamber.dev/sdk/), which are ahead of the shipped 2.0.3 SDK):
`contributes.page` (full-screen page), `contributes.statusSection` (a section in the chat's Work Status
panel), `contributes.actions` (message/session menu entries, `mode: "open" | "background"`),
`contributes.commands` (slash commands resolved by `onResolve`), `contributes.tools` (styling how an
OpenCode/MCP tool call renders in chat), `contributes.filesystem` (globs outside the project), and — in
the newer docs only — `contributes.fileEditors` and `origins`.

### 2.5 Local services (for anything the sandbox cannot do)

`contributes.service` declares a child process the host spawns and proxies to over loopback
([GUEST_SERVICES.md](https://github.com/openchamber/openchamber/blob/main/packages/sdk/GUEST_SERVICES.md)).
Panel → `serviceRequest` → host → `127.0.0.1:port` → service. The service gets
`OPENCHAMBER_SERVICE_PORT` and `OPENCHAMBER_SERVICE_TOKEN`, must bind `127.0.0.1`, and answer
`GET /health`. **A service runs with the user's full rights and no sandbox** — the approval dialog says
so. This is the escape hatch for self-managed GitLab base URLs or GitLab webhooks, not the default path.

### 2.6 Install / update

- Install from **Settings → Extensions**: an absolute folder path, a `.zip`, an https git/zip URL, or an
  SSH git address. A folder install runs from that folder (edit + rebuild + reload); zip/URL installs are
  copied into OpenChamber's data dir (`{dataDir}/extensions/{id}`).
- Git installs can self-update when the package `version` is bumped; a `#tag`/`#branch` pins it.
- Source: [Build an extension § Install it while you work](https://docs.openchamber.dev/sdk/),
  [Extensions](https://docs.openchamber.dev/extensions/), API.md.

### 2.7 The other extension surfaces: OpenCode plugins and MCP (agent-side, not UI)

These are **not** the extension mechanism, but they exist and carry over because OpenChamber runs
OpenCode. Use them only if you want the **agent** to have GitLab tools, not a user-facing panel.

- **OpenCode v1 plugins** (the "hooks object" API): `~/.config/opencode/plugins/` or a `plugin` array in
  `opencode.json`; a plugin is an `async (ctx) => ({ ...hooks })` function that can add `tool`s
  ([opencode Plugins](https://opencode.ai/docs/plugins/)). Local evidence: `~/.config/opencode/package.json`
  pins `"@opencode-ai/plugin": "1.3.9"`.
- **OpenCode v2 plugins** (the line the installed app uses): `Plugin.define({ id, setup(ctx) })` with
  `ctx.tool.transform`, `ctx.provider.transform`, `ctx.integration.*`, hooks, storage, etc.
  ([opencode v2 Build a plugin](https://opencode.ai/v2/docs/build/plugins/)). Local evidence:
  `~/.config/openchamber/agent-tool/openchamber-agent-tool/index.js` is exactly this shape
  (`export default { id: "openchamber-agent-tool", setup: async (ctx) => { await ctx.tool.transform(...) } }`),
  and `~/.config/openchamber/agent-tool/openchamber-plugin.js` is the older v1 shape
  (`export const OpenChamberPlugin = async () => ({ tool: {...} })`).
- **MCP servers**: OpenChrome/OpenCode config supports local and remote MCP servers
  ([opencode MCP servers](https://opencode.ai/docs/mcp-servers/)). OpenChamber documents its own MCP page
  ([docs.openchamber.dev/mcp/](https://docs.openchamber.dev/mcp/)) and already runs the `glab` MCP server
  locally: `~/.config/opencode/opencode.json` has
  `"mcp": { "glab": { "type": "local", "command": ["/usr/bin/glab","mcp","serve"], "enabled": true } }`
  (glab 1.114.0 is installed). GitLab also publishes an official MCP server
  ([GitLab MCP server](https://docs.gitlab.com/user/model_context_protocol/mcp_server/)).
- **Skills**: `~/.config/opencode/agents/` and project skills; OpenChamber documents Skills
  ([docs.openchamber.dev/skills/](https://docs.openchamber.dev/skills/)).

How OpenChamber injects its own plugin: `~/.config/openchamber/opencode.managed.json` contains
`"plugins": ["-opencode.browser", "/home/gorosz/.config/openchamber/agent-tool/openchamber-agent-tool"]`
— i.e. OpenChamber merges plugins into the managed OpenCode config (and disables the built-in
`opencode.browser` plugin in favour of its own tool). This confirms the docs' claim that extensions
"are not the same thing as OpenCode plugins" while OpenChamber itself uses OpenCode plugins internally.

---

## 3. What a "GitLab pipelines" panel concretely needs

### 3.1 GitLab REST API (CI/CD pipelines)

All REST endpoints live under `https://gitlab.com/api/v4` (or a self-managed host). Source:
[Pipelines API](https://docs.gitlab.com/api/pipelines/) and [Jobs API](https://docs.gitlab.com/api/jobs/).

**List project pipelines** — the main panel view:

```
GET /projects/:id/pipelines
```

- `:id` is the project ID **or URL-encoded path** (`group%2Fproject`).
- Filters: `name`, `ref`, `sha`, `scope` (`running`/`pending`/`finished`/`branches`/`tags`), `status`
  (`created`, `waiting_for_resource`, `preparing`, `waiting_for_callback`, `pending`, `running`,
  `success`, `failed`, `canceling`, `canceled`, `skipped`, `manual`, `scheduled`), `source`,
  `username`, `order_by` (`id`/`status`/`ref`/`updated_at`/`user_id`), `sort`, `updated_after/before`,
  `created_after/before`, `yaml_errors`.
- Pagination: `page` + `per_page` (offset-based). Response rows carry `id`, `iid`, `project_id`,
  `status`, `source`, `ref`, `sha`, `name`, `web_url`, `created_at`, `updated_at`, `started_at`,
  `finished_at`, `duration`, `queued_duration`, `detailed_status`, and (for MR pipelines) `merge_request`.
- `scope=branches`/`tags` returns only the latest pipeline per ref — convenient for a compact view.

**Latest pipeline for a ref** (default branch when `ref` omitted; **403 if none exists**):

```
GET /projects/:id/pipelines/latest?ref=main
```

**Single pipeline** (also returns `user`, `before_sha`, `tag`, `yaml_errors`, `coverage`, `archived`):

```
GET /projects/:id/pipelines/:pipeline_id
```

**Jobs in a pipeline** — the second level of the panel:

```
GET /projects/:id/pipelines/:pipeline_id/jobs?include_retried=false&scope[]=running
```

- Returns all jobs for the pipeline (including child pipelines); does **not** return retried jobs by
  default (`include_retried=true` to include); sorted by ID descending.
- Job rows carry `id`, `name`, `stage`, `status`, `allow_failure`, `failure_reason`, `ref`, `tag`,
  `duration`, `queued_duration`, `created_at`, `started_at`, `finished_at`, `web_url`, `runner`,
  `artifacts`, and a nested `pipeline`.
- **Job status values** (same set used by `scope`): `canceled`, `canceling`, `created`, `failed`,
  `manual`, `pending`, `preparing`, `running`, `scheduled`, `skipped`, `success`,
  `waiting_for_callback`, `waiting_for_resource` ([Jobs API § Job status values](https://docs.gitlab.com/api/jobs/#job-status-values)).

**Single job** and **job log** (for "why did it fail"):

```
GET /projects/:id/jobs/:job_id
GET /projects/:id/jobs/:job_id/trace     # text log; 404 if none
```

**Pipelines triggered by the authenticated user** (a cross-project view):

```
GET /pipelines?created_after=...    # up to 100/page, keyset pagination via Link header
```

**Write endpoints** if the first version wants actions (retry/cancel/create):
`POST /projects/:id/pipelines/:pipeline_id/retry`, `.../cancel`, `POST /projects/:id/pipeline?ref=`,
`POST /projects/:id/jobs/:job_id/retry`, `.../play` ([Pipelines API](https://docs.gitlab.com/api/pipelines/),
[Jobs API](https://docs.gitlab.com/api/jobs/)).

### 3.2 Auth model

- **Personal access token (recommended for a first version).** Create one at
  _Edit profile → Access → Personal access tokens → Generate token → Legacy token_; pick scopes.
  Pass it as `PRIVATE-TOKEN: <token>` (recommended) **or** as an OAuth-compliant header
  `Authorization: Bearer <token>` ([GitLab REST auth](https://docs.gitlab.com/api/rest/authentication/#personal-project-and-group-access-tokens);
  [Personal access tokens](https://docs.gitlab.com/user/profile/personal_access_tokens/)).
  - **Scopes**: `read_api` is enough for read-only pipelines; `api` grants full read/write. (The
    [OAuth scope table](https://docs.gitlab.com/integration/oauth_provider/#view-all-authorized-applications)
    defines `api` and `read_api`; PATs use the same scope vocabulary via the
    [access token scopes](https://docs.gitlab.com/security/tokens/access_token_scopes/) page.)
  - **Why this matters for OpenChamber**: its `bearer` token scheme sends `Authorization: Bearer <token>`
    ([`manifest.ts`](https://github.com/openchamber/openchamber/blob/main/packages/sdk/src/manifest.ts),
    `resolveTokenAuthorization`), and GitLab explicitly accepts that form for PATs. So
    `integration.token.scheme: "bearer"` works **without** a custom `PRIVATE-TOKEN` header. (With
    `scheme: "raw"` OpenChamber would send `Authorization: <token>` with no prefix, which GitLab does
    not document — avoid it.)
- **OAuth 2.0**: GitLab is an OAuth provider; create an application under _Edit profile → Access →
  Applications_, get a **Client ID** (and secret), pick scopes, and register a **Redirect URI**
  ([GitLab OAuth provider](https://docs.gitlab.com/integration/oauth_provider/)). OAuth access tokens
  last **2 hours** and need the `refresh_token`
  ([OAuth provider § Access token expiration](https://docs.gitlab.com/integration/oauth_provider/#access-token-expiration)).
  OpenChamber's manifest supports `integration.oauth` with `authorizeUrl`, `tokenUrl`, `apiOrigin`,
  optional `scopes`, and the user pastes a client id ([manifest.ts](https://github.com/openchamber/openchamber/blob/main/packages/sdk/src/manifest.ts);
  [docs](https://docs.openchamber.dev/sdk/#accounts-and-network)). I could **not** confirm from a
  primary source how OpenChamber handles the redirect URI, the client secret, or refresh tokens for a
  non-Linear provider — see open questions.
- **CI job tokens** (`JOB-TOKEN`) are for code running inside a GitLab job, not for this panel.

### 3.3 Mapping to an OpenChamber extension

Concrete shape:

1. **Manifest** (see 2.3): `panel` + `integration.token` with `apiOrigin: "https://gitlab.com"` and
   `scheme: "bearer"`. Optionally `settings: [{ id: "project", label: "GitLab project path (group/project)" }]`
   so the user types the project; `ctx.settings.project` arrives in `onReady`.
2. **Panel** (`panel/main.js`): on `onReady`, apply `applyHostReady(ctx, document.documentElement)` and
   mount once; then `host.request({ method: "GET", path: "/api/v4/projects/" + encodeURIComponent(project) + "/pipelines", query: { per_page: "20", order_by: "updated_at" } })`.
   Render with `mountList`/`mountBadge`/`mountSpinner`/`mountBanner`. Selecting a pipeline calls
   `/jobs` and shows per-job statuses; a status badge can use `mountBadge` tones
   (`success`/`warning`/`error`/`info`).
3. **Refresh**: the SDK has **no push subscription for an external service**; the panel must **poll**
   `host.request` on a timer (clear it on `dispose`, and guard stale responses — the docs' example uses a
   generation counter). A local `service` could poll and cache, but "streaming from a service to the
   panel... is deferred" ([GUEST_SERVICES.md](https://github.com/openchamber/openchamber/blob/main/packages/sdk/GUEST_SERVICES.md)),
   so polling from the page is the straightforward path.
4. **Optional agent integration**: declare `contributes.tools` with `match: "mcp.glab.*"` (or the
   relevant `glab` tool names) to render the existing `glab` MCP tool calls nicely in chat. To give the
   agent GitLab tools, the `glab mcp serve` server is already configured locally.
5. **Optional actions**: with `capabilities: ["sessions"]`, a "Start session" button can call
   `host.startSession({ providerId, id: pipeline.id, title, url: pipeline.web_url, text: "..." })` to
   hand a failed pipeline to the agent.

**Budget/limit notes** (from [API.md field limits](https://github.com/openchamber/openchamber/blob/main/packages/sdk/API.md)):
`host.request` times out at **20 s** and caps the response at **256 000 chars**; compose/prompt/attach
text caps at 16 000; `listDir` at 2 000 entries. Keep `per_page` modest and page explicitly.

**Self-managed GitLab** is the main architectural constraint: `apiOrigin` is a **static string in the
manifest**, so one published package cannot point at an arbitrary host. Options: (a) ship a package per
instance; (b) use the newer `origins` capability plus page-side `fetch` (subject to GitLab's CORS), but
the token would not be injected by the host; (c) declare a `service` that takes the base URL from a
setting and proxies the API. I list this under open questions.

---

## 4. Existing examples / prior art

- **OpenChamber SDK examples** (the best place to start):
  [github.com/openchamber/openchamber/tree/main/packages/sdk/examples](https://github.com/openchamber/openchamber/tree/main/packages/sdk/examples).
  The directory contains: `hello-kit`, `tasks-demo`, `github-token`, `service-echo`, `config-editor`,
  `git-graph-status`, `checklist-editor`, `tools-only`, `browser-provider-stub` (verified via the GitHub
  contents API). The `github-token` example is the closest analogue to a GitLab panel: a `token`
  integration against `https://api.github.com` with `scheme: "bearer"`
  ([its package.json](https://github.com/openchamber/openchamber/blob/main/packages/sdk/examples/github-token/package.json)).
- **The canonical three-file example**: [docs.openchamber.dev/sdk/example](https://docs.openchamber.dev/sdk/example/)
  ("Repository Explorer" — connects a GitHub token, lists repos, attaches one).
- **Built-in extensions** ship inside the app; the shipped registry is currently empty
  (`app.asar.unpacked/.../built-in-extensions/registry.json` = `{"version":1,"extensions":[]}`), and
  OpenChamber's own docs mention Excalidraw as an OpenChamber extension
  ([Integrations § Excalidraw](https://docs.openchamber.dev/integrations/#excalidraw)).
- **No existing GitLab extension found** in the OpenChamber repo: `packages/web/server/lib/` has
  `github/`, `linear/`, `guests/`, etc., but **no `gitlab/`** module (verified via the GitHub contents
  API). The `glab` MCP server is the only GitLab integration configured locally.
- **OpenCode GitLab integration** is a different thing: OpenCode documents running in GitLab CI (a CI
  component) and GitLab Duo ([opencode GitLab](https://opencode.ai/docs/gitlab/)). Not a panel.

---

## 5. Local environment findings

- **OpenChamber** installed as an AppImage:
  `/home/gorosz/Applications/openchamber_ae8965d6bb106d58bec26979739c47a9.appimage`.
  Running instance mounted at `/tmp/.mount_openchUPJI5m` (read-only). `openchamber --version` / `--help`
  returned no text (the binary is the Electron launcher); version comes from the bundle instead
  (`@openchamber/electron` 2.0.3).
- **Config / data**: `~/.config/openchamber/` (settings, sessions, projects, `preferences.json`,
  `opencode.managed.json`, `managed-opencode/`, `agent-tool/`) and `~/.config/OpenChamber/`
  (Electron/Chromium profile). No `~/.local/share/openchamber` exists on this machine.
- **Shipped extension SDK**: `@openchamber/sdk` 2.0.3, with `API.md`, `DOCUMENTATION.md`,
  `GUEST_SERVICES.md`, `src/manifest.ts`, `src/host.ts`, `src/service-*.ts`, and `scripts/bundle-guest.ts`
  (extracted locally to `/tmp/opencode/sdk/`).
- **OpenChamber's own OpenCode plugin**: `~/.config/openchamber/agent-tool/openchamber-agent-tool/index.js`
  (v2 `Plugin.define` shape, adds the `openchamber` and `openchamber_web` tools) and
  `~/.config/openchamber/agent-tool/openchamber-plugin.js` (v1 shape). Wired in via
  `~/.config/openchamber/opencode.managed.json`:
  `{"plugins":["-opencode.browser","/home/gorosz/.config/openchamber/agent-tool/openchamber-agent-tool"]}`.
- **OpenCode**: CLI `~/.opencode/bin/opencode` → `opencode v2.0.16`; config `~/.config/opencode/opencode.json`
  with a `glab` **local MCP server** (`["/usr/bin/glab","mcp","serve"]`, enabled). `glab 1.114.0` is
  installed. `~/.config/opencode/package.json` pins `@opencode-ai/plugin` 1.3.9. There is **no**
  `~/.config/opencode/plugins/` directory and no `.opencode/plugins/` in this repo.
- **This repo** (`/home/gorosz/workspace/ec/gitlab-extension-for-openchamber`): currently only
  `.agents/skills/` (38 skills vendored from `mattpocock/skills`, per `skills-lock.json`) and
  `skills-lock.json`. There is **no** `opencode` skill file in `.agents/skills` on disk — the harness
  supplies the `opencode` and other skills; the repo only has the Matt Pocock set. No `docs/` existed
  before this file.

---

## 6. Unknowns / open questions

1. **Self-managed GitLab base URL.** `integration.token.apiOrigin` is a static manifest string
   ([manifest.ts](https://github.com/openchamber/openchamber/blob/main/packages/sdk/src/manifest.ts)),
   so a single published extension cannot target an arbitrary GitLab host. Not addressed by the docs I
   read. Candidate designs: per-instance packages; a `service` that reads the base URL from a setting;
   or the newer `origins` capability + page `fetch` (needs GitLab CORS and loses host token injection).
2. **OAuth specifics.** The manifest supports `oauth`, but I could not confirm from a primary source how
   OpenChamber handles GitLab's **redirect URI**, **client secret**, and **refresh tokens** (GitLab
   tokens expire in 2 h). The docs only describe "the user pastes a client id, and OpenChamber runs the
   authorize flow". Treat `token` (PAT) as the supported path until verified.
3. **`apiOrigin` vs API path.** The manifest's `apiOrigin` must be an origin; requests use paths like
   `/api/v4/...`. I inferred this from the field name and `resolveIntegrationApi`
   ([manifest.ts](https://github.com/openchamber/openchamber/blob/main/packages/sdk/src/manifest.ts))
   plus the `github-token` example (`apiOrigin: "https://api.github.com"`, requests to `/user/repos`);
   I did not find a sentence stating it verbatim.
4. **SDK version skew.** The **installed** SDK is 2.0.3 and its `manifest.ts` has no `fileEditors` or
   `origins`; the live [docs](https://docs.openchamber.dev/sdk/) and the GitHub `main` SDK README do.
   So the docs describe a newer SDK than the one shipped in this AppImage build. Confirm the target
   build before using `origins`/`fileEditors`.
5. **Push updates for pipelines.** No SDK push channel for an external service; streaming from a
   `service` to the panel is explicitly "deferred". Polling is the only documented option today.
6. **`request` header override.** I did not find a way to set a custom header per call (e.g.
   `PRIVATE-TOKEN`) — auth is host-injected per the declared scheme. This is why `scheme: "bearer"` is
   the right choice for GitLab, but it means a provider that only accepts `PRIVATE-TOKEN` would not work
   without a `service`.
7. **Built-in vs third-party.** Built-in extensions bypass the approval dialog and cannot be removed
   ([Extensions](https://docs.openchamber.dev/extensions/)); it is not documented how a third party gets
   an extension bundled as built-in. Assume a normal Settings → Extensions install.

---

## 7. Sources

Primary docs

- OpenChamber README / architecture: https://github.com/openchamber/openchamber
- Build an extension: https://docs.openchamber.dev/sdk/
- Host API: https://docs.openchamber.dev/sdk/host/
- UI kit: https://docs.openchamber.dev/sdk/ui/
- Extension example (three files): https://docs.openchamber.dev/sdk/example/
- Using extensions: https://docs.openchamber.dev/extensions/
- Integrations: https://docs.openchamber.dev/integrations/
- SDK README: https://github.com/openchamber/openchamber/blob/main/packages/sdk/README.md
- SDK API.md: https://github.com/openchamber/openchamber/blob/main/packages/sdk/API.md
- SDK GUEST_SERVICES.md: https://github.com/openchamber/openchamber/blob/main/packages/sdk/GUEST_SERVICES.md
- SDK manifest source: https://github.com/openchamber/openchamber/blob/main/packages/sdk/src/manifest.ts
- SDK examples index: https://github.com/openchamber/openchamber/tree/main/packages/sdk/examples
- `github-token` example manifest: https://github.com/openchamber/openchamber/blob/main/packages/sdk/examples/github-token/package.json

OpenCode (the agent runtime OpenChamber builds on)

- v1 plugins: https://opencode.ai/docs/plugins/
- v2 plugin configuration: https://opencode.ai/v2/docs/plugins/
- v2 "Build a plugin": https://opencode.ai/v2/docs/build/plugins/
- MCP servers: https://opencode.ai/docs/mcp-servers/
- Agent skills: https://opencode.ai/docs/skills/
- GitLab (CI/Duo) integration: https://opencode.ai/docs/gitlab/

GitLab

- Pipelines API: https://docs.gitlab.com/api/pipelines/
- Jobs API: https://docs.gitlab.com/api/jobs/
- REST API authentication: https://docs.gitlab.com/api/rest/authentication/
- Personal access tokens: https://docs.gitlab.com/user/profile/personal_access_tokens/
- Access token scopes: https://docs.gitlab.com/security/tokens/access_token_scopes/
- GitLab as an OAuth 2.0 provider: https://docs.gitlab.com/integration/oauth_provider/
- OAuth 2.0 API (refresh tokens): https://docs.gitlab.com/api/oauth2/
- GitLab MCP server: https://docs.gitlab.com/user/model_context_protocol/mcp_server/

Local primary artifacts (this machine)

- AppImage: `/home/gorosz/Applications/openchamber_ae8965d6bb106d58bec26979739c47a9.appimage`
- Mounted app: `/tmp/.mount_openchUPJI5m/` (`resources/app.asar`, `resources/web-dist/`,
  `resources/opencode-cli/opencode`)
- `app.asar` → `package.json` (`@openchamber/electron` 2.0.3, `opencodeCli.version` 2.0.18)
- Shipped SDK: `resources/app.asar` → `node_modules/@openchamber/sdk/` (v2.0.3)
- Built-in extensions registry: `resources/app.asar.unpacked/node_modules/@openchamber/web/server/built-in-extensions/registry.json`
- OpenChamber agent plugin (v2): `~/.config/openchamber/agent-tool/openchamber-agent-tool/index.js`
- OpenChamber agent plugin (v1): `~/.config/openchamber/agent-tool/openchamber-plugin.js`
- Managed OpenCode config: `~/.config/openchamber/opencode.managed.json`
- OpenCode config (glab MCP): `~/.config/opencode/opencode.json`
- OpenCode CLI version: `~/.opencode/bin/opencode --version` → `opencode v2.0.16`
- Repo skills: `.agents/skills/` and `skills-lock.json`

---

## 8. Follow-up: self-managed GitLab mechanism (verified against shipped SDK 2.0.3)

Status: follow-up notes, written 2026-09-30. This section only adds findings; it does not revise
sections 1–7. Everything below was re-read from the shipped `@openchamber/sdk` 2.0.3 extracted to
`/tmp/opencode/sdk/`, and from the host-side implementation inside the installed AppImage's
`resources/app.asar` (`@openchamber/web` 2.0.3, `server/lib/guests/*.js`). Where the public repo is the
equivalent, the `packages/...` path is given. The live docs at docs.openchamber.dev describe a newer
SDK and are used only to mark _future_ capability, never as evidence for 2.0.3.

Local source-root used below:

- SDK: `/tmp/opencode/sdk/` = `resources/app.asar → node_modules/@openchamber/sdk/` (v2.0.3).
- Host: `/tmp/opencode/asar-out/node_modules__@openchamber__web__server__lib__guests__*.js` =
  `resources/app.asar → node_modules/@openchamber/web/server/lib/guests/*.js` (v2.0.3). Public
  equivalent: `github.com/openchamber/openchamber/tree/main/packages/web/server/lib/guests/`.

### 8.1 (1a) Can `contributes.service` read declared `settings`? No.

- `settings` is declared **only** on the integration contribution: `IntegrationContribution` has
  `settings?: IntegrationSettingField[]` (`/tmp/opencode/sdk/manifest.ts:215-222`, field at `:221`;
  zod shape at `/tmp/opencode/sdk/parse.ts:132-139`). `ServiceContribution` has `entry`, `runtime`,
  `permissions`, `provides`, `surface` — and **no `settings`** (`/tmp/opencode/sdk/manifest.ts:322-334`;
  zod at `/tmp/opencode/sdk/parse.ts:205-213`). There is no service-side settings channel to declare.
- Settings are stored per guest and delivered to the **page**, not the service: the host persists them
  under the guest's entry (`auth-store.js:16` `settings: z.record(...)`) via
  `PUT /api/guests/:id/settings`, which accepts only ids declared in `guest.integration.settings`
  (`routes.js:193-196` `declaredSettings`; `routes.js:411-434`). They are returned to the page inside
  the auth snapshot: `toPublicGuestAuth` returns `settings` (`oauth.js:183-188`); the SDK exposes them
  as `HostReadyContext.settings` (`/tmp/opencode/sdk/contract.ts:189-204`, specifically `:196`) and via
  `host.onSettings` (`/tmp/opencode/sdk/host.ts:101`, `:542-546`). Docs agree: `onSettings(listener)`
  — "Declared integration fields only" (`/tmp/opencode/sdk/API.md:73`), `settings` field "Declared keys
  only" (`:91`).
- The service environment is built in `startGuestService` (`service.js:370-480`). The env is
  `inheritedServiceEnv(process.env)` plus only `OPENCHAMBER_SERVICE_PORT`, `OPENCHAMBER_SERVICE_TOKEN`,
  `ELECTRON_RUN_AS_NODE` (=1) and, if sockets are declared, `OPENCHAMBER_SERVICE_SOCKETS`
  (`service.js:420-428`). `inheritedServiceEnv` copies only a fixed allow-list of locale/toolchain
  variables (PATH, HOME, TMPDIR, LANG, XDG_*, Windows vars) and explicitly excludes "the UI password,
  tool tokens, and whatever API keys the user exported" (`service.js:493-516`). No settings, no
  integration token, no `apiOrigin` is passed. `GUEST_SERVICES.md` states the same:
  "API keys, the UI password, and other host secrets never reach it" (`/tmp/opencode/sdk/GUEST_SERVICES.md:28`).

**Conclusion 1a:** a service cannot read settings itself. The only supported way a service learns a
setting is that the **panel** includes it in the `serviceRequest` payload (`query`/`body`). The
`serviceRequest` wire shape is the same as `request` — `{ method, path, query?, body? }`
(`/tmp/opencode/sdk/contract.ts:76-81`; `/tmp/opencode/sdk/host.ts:691-702`; protocol schema
`/tmp/opencode/sdk/protocol.ts` `type: 'service-request'`), so arbitrary strings can be forwarded.

### 8.2 (1b) Auth with a service: `integration` still applies; `serviceRequest` never carries the PAT.

- `contributes.integration` remains valid next to `contributes.service`: "Cloud `request` and
  `serviceRequest` may both exist on one guest" (`/tmp/opencode/sdk/GUEST_SERVICES.md:95`). Declaring an
  integration adds the `network` capability; declaring a service adds `service`
  (`/tmp/opencode/sdk/manifest.ts:424-433`, lines `:429` and `:430`).
- The two calls are separate host routes with different auth:
  - `POST /api/guests/:id/request` requires the `network` grant and calls `proxyGuestRequest`
    (`routes.js:522-540`). `proxyGuestRequest` resolves the origin and scheme from
    `resolveIntegrationApi(guest.integration)` (`request.js:64`), resolves the **host-held** access
    token (`resolveHostAccessToken` for `host`/Linear, else `takeUsableGuestAuth` from the token store)
    and attaches it itself: `Authorization: guestAuthorizationHeader(accessToken, authorization)`
    (`request.js:46-61`, `:75-82`, `:108-111`). The token is a `bearer`/`basic`/raw header chosen from
    the manifest scheme.
  - `POST /api/guests/:id/service/request` requires only the guest's service grant and calls
    `proxyGuestServiceRequest` with **no integration token at all** (`routes.js:551-583`).
- `OPENCHAMBER_SERVICE_TOKEN` is purely the host↔service bearer: it is a fresh
  `crypto.randomBytes(24).toString('hex')` per service start (`service.js:413`), handed to the child in
  `OPENCHAMBER_SERVICE_TOKEN` (`service.js:423`), and the host sends it on every loopback call
  (`Authorization: Bearer ${runtime.token}`, `service.js:649-655`). The contract tells the service to
  require exactly that bearer on every request and on `/health` (`/tmp/opencode/sdk/GUEST_SERVICES.md:131-141`).
  The panel "never receives `OPENCHAMBER_SERVICE_TOKEN`" and never dials the port
  (`/tmp/opencode/sdk/GUEST_SERVICES.md:123`).
- The third-party PAT is stored host-side in `guest-auth.json` as `accessToken` (`auth-store.js:8-25`,
  written mode `0o600` at `:104-106`) and is deliberately **not** exposed to the page:
  `toPublicGuestAuth` returns only `{ connected, account, hasClient, settings }` (`oauth.js:183-188`).
  It is additionally bound to the origin it was minted for (`target.apiOrigin`, `auth-store.js:21-25`);
  a package that moves its `apiOrigin` gets its token dropped rather than sent to the new host
  (`oauth.js:256-258`, `takeUsableGuestAuth` at `:280-290`).

**Conclusion 1b:** with a service, host-side `network` requests still use the integration token and the
host injects it on the declared `apiOrigin`; `serviceRequest` carries no PAT — the only bearer on that
path is the loopback `OPENCHAMBER_SERVICE_TOKEN`, which is not the user's GitLab credential.

### 8.3 (1c) `integration: { host: … }` means "reuse the first-party Linear account" — the origin is static.

- `IntegrationHostProvider` is the closed union `'linear'` (`/tmp/opencode/sdk/manifest.ts:197`), and
  the host schema accepts only `provider: z.enum(['linear'])` (`/tmp/opencode/sdk/parse.ts:128-130`).
- `resolveIntegrationApi` maps `host` to the **constant** `HOST_LINEAR_API_ORIGIN =
'https://api.linear.app'` (`/tmp/opencode/sdk/manifest.ts:213`, `:277-282`). The host-side token
  resolver is likewise Linear-only (`host-session.js:6-9`, `:63-73`; falls back to `getValidLinearAccessToken`).
- Even under `host`, `request` still enforces the declared origin: `joinGuestRequestUrl` rejects any
  URL whose `url.origin !== apiOrigin` (`request.js:14-36`, check at `:24`), and `proxyGuestRequest`
  builds the URL from that `apiOrigin` (`request.js:71-74`). The path may not contain a scheme
  (`isGuestRequestPath`, used by the SDK at `/tmp/opencode/sdk/host.ts:679` and the host at
  `request.js:15`).

**Conclusion 1c:** `host` is not "the host machine" and it is not a dynamic-origin mechanism. It is a
first-party integration that reuses the app's Linear connection at a fixed `https://api.linear.app`
origin. There is no way to make `host.request` target a custom/self-managed origin under it.

### 8.4 (1d) Shipped 2.0.3 has no `origins` and no `fileEditors`. Confirmed.

- `OpenChamberContributes` enumerates `panel, background, attach, page, statusSection, capabilities,
integration, service, filesystem, actions, commands, tools` — no `origins`, no `fileEditors`
  (`/tmp/opencode/sdk/manifest.ts:393-411`). The zod `contributesSchema` is the same list
  (`/tmp/opencode/sdk/parse.ts:260-284`).
- A recursive search over every file under `/tmp/opencode/sdk/` for `origins|fileEditors` returns
  **zero matches** (SDK 2.0.3). Unknown top-level keys are silently dropped, not forwarded — zod
  objects here are non-strict and `GUEST_SERVICES.md:97` states "Extra keys still drop, not forward."
- The live docs _do_ describe both keys, which is the version skew the prior report flagged:
  `origins` and `fileEditors` appear at https://docs.openchamber.dev/sdk/ ("Accounts and network" and
  "An editor for your file type"), and the capability table lists a fifth auto-granted capability
  `origins`. Neither exists in the shipped 2.0.3.

**Conclusion 1d:** confirmed — 2.0.3 supports neither `origins` nor `fileEditors`. A manifest that
declares them is parsed with those keys dropped.

### 8.5 (2) Real, supported options for self-managed GitLab, and trade-offs

The page is served by the host with `Content-Security-Policy: sandbox allow-scripts` (`routes.js:844-848`),
and the rail embeds it in an iframe with `sandbox="allow-scripts"` (asar asset; the header is emitted
even when the document is opened directly). The page therefore has an opaque (`null`) origin, and the
shipped docs define external network access as going through `host.request` on the declared
`apiOrigin` (`/tmp/opencode/sdk/GUEST_SERVICES.md:9`; `/tmp/opencode/sdk/API.md:146`).

**Option A — one static `apiOrigin` per host (integration token + `host.request`).** Set
`integration.token.apiOrigin` to the instance's HTTPS origin (an origin is accepted, including a
non-default port: `isHttpsOrigin` requires `https:`, empty credentials, `pathname === '/'`, and
`value === parsed.origin`, `/tmp/opencode/sdk/parse.ts:57-70`) and `scheme: "bearer"` (GitLab accepts
`Authorization: Bearer <PAT>`, https://docs.gitlab.com/api/rest/authentication/#personal-project-and-group-access-tokens).

- Token handling: best possible — the PAT is stored host-side (`guest-auth.json`, mode `0600`), injected
  by the host, and never reaches the page or any service (`request.js:46-61`, `oauth.js:183-188`).
- CORS: irrelevant; the host fetches server-side with Node `fetch` (`request.js:54-60`).
- Sandbox escape: none; no service.
- One-host vs many: **one host per packaged manifest**, because `apiOrigin` is validated static
  (`parse.ts:119`) and enforced at request time (`request.js:24`). For a folder install, the operator
  can edit `package.json` for their host; for a git install you would need a branch/build per host.

**Option B — a local service performs the GitLab HTTP itself (arbitrary hosts, one package).**
Declare `contributes.service` (`entry` built JS, `runtime: "host"`, `/tmp/opencode/sdk/GUEST_SERVICES.md:41-95`);
the panel sends the base URL and, if needed, the PAT to the service in the `serviceRequest` `query`/`body`
(shape in §8.1), and the service does `fetch`/`https` to the chosen GitLab host.

- Token handling: **worse than A.** The host-held token cannot reach the service (§8.1, §8.2), so the
  PAT must be supplied by the user to the panel — either as a plain `integration.settings` field
  (delivered to the page, §8.1) or via `host.storage`/the panel's own form — and then forwarded to the
  service. The PAT therefore lives in page memory and/or OpenChamber-owned JSON and in the service
  process; the "token never reaches your page" guarantee no longer holds.
- CORS: irrelevant; the service fetches server-side.
- Sandbox escape: this is the trade-off. "A declared `service` is outside these limits: it is a process
  with the user's rights and no sandbox" (`/tmp/opencode/sdk/API.md:527`; `/tmp/opencode/sdk/GUEST_SERVICES.md:165`).
  Permissions lists are "advisory … Phase 1 does not enforce an OS sandbox" (`GUEST_SERVICES.md:165`).
- One-host vs many: **one package, any number of hosts**; the base URL is a runtime value.
- Other limits: a service is spawned lazily after a grant, must bind `127.0.0.1` and answer
  `GET /health`, and **cannot push** to the panel — streaming is explicitly deferred, so the panel must
  poll (`GUEST_SERVICES.md:123-169`, and the note at `:169`). Declaring a service also asks the user for
  the `service` capability at install (`manifest.ts:429`).

**Option C — page `fetch` + `origins` capability.** Not available in 2.0.3 (§8.4). Even in the newer
SDK it would (i) require the origin to be declared and approved, (ii) require the GitLab host to allow
CORS for the page's `null` origin ("The page's origin is `null`, so to read a `fetch` response the
server must allow CORS for that origin", https://docs.openchamber.dev/sdk/), and (iii) still **not**
receive the host-injected token. GitLab's own issue #18494 quotes its API CORS block as allowing
`origins '*'` with `credentials: false` and `headers: :any` for `/api/*`
(https://gitlab.com/gitlab-org/gitlab/-/issues/18494), which suggests a `null`-origin token-header
request can pass preflight on a default instance — but I could not re-fetch the current
`config/initializers/cors.rb` (404 on the paths I tried), so treat the exact live CORS config as
unverified.

**Recommendation.** If the requirement is genuinely _one package, arbitrary self-managed hosts_, use
**Option B**: a `contributes.service` that owns the GitLab HTTP calls (no CORS, any host at runtime),
with the base URL and PAT entered by the user (integration `settings` and/or the panel's own form).
Do not rely on `integration.token` for the self-managed path, because its token is unreachable from the
service and its `apiOrigin` cannot be changed at runtime. Accept the two documented costs: the PAT is
no longer host-held, and the service is an unsandboxed process running with the user's rights. If the
deployment is a **single known self-managed host**, prefer **Option A**: bake that host into
`apiOrigin`, keep `integration.token` + `host.request`, and keep the PAT entirely host-side. Option A
is strictly safer and needs no `service` grant; Option B is the only way to satisfy the "any host, one
package" reading of the requirement.

### 8.6 (3) Plain `fetch` from the panel to a self-managed GitLab origin

- There is **no supported** way in 2.0.3. The manifest cannot declare `origins` (§8.4), and the shipped
  contract says the sandboxed page reaches the network "only through `connectHost.request` onto a
  declared HTTPS `apiOrigin`" (`/tmp/opencode/sdk/GUEST_SERVICES.md:9`; `/tmp/opencode/sdk/API.md:146`).
- The runtime also withholds the credential: the token is host-side only (`oauth.js:183-188`;
  `request.js:75-82`), so even a successful raw `fetch` would be unauthenticated.
- What a raw fetch would require (not provided by 2.0.3):
  1. a newer SDK with the `origins` capability, so the host's CSP/approval model permits the origin
     (live docs: approve up to 8 https origins; "Approved origins are open to `fetch`, images, fonts,
     styles and media" — https://docs.openchamber.dev/sdk/); and
  2. CORS on the GitLab side for the page's `null` origin and the auth header. GitLab's quoted default
     API CORS block is `origins '*'`, `credentials: false`, `headers: :any` for `/api/*`
     (https://gitlab.com/gitlab-org/gitlab/-/issues/18494), but I could not re-verify the current
     `cors.rb`, so this remains a check-the-instance item; and
  3. the token injected into the page by other means (a plain setting or `host.storage`), since the
     host will not attach the integration token to a page `fetch` (`request.js` is the only place the
     host attaches it).
- The shipped CSP is `sandbox allow-scripts` with no `connect-src` directive (`routes.js:848`), so the
  browser itself would not hard-block a cross-origin `fetch`; "not supported" here is a contract and
  token-availability statement, not a CSP block. That distinction is why Option C is unsafe to build on
  without the `origins` review: nothing in 2.0.3's approval flow tells the user what the page is allowed
  to call.

### Bottom line

For a folder-installed, one-package-fits-any-self-managed-host extension, the real supported mechanism
is a **`contributes.service` local proxy that performs GitLab REST calls itself**, with the GitLab base
URL (and the PAT, if the service is to authenticate) supplied by the user to the **panel** and passed to
the service in the `serviceRequest` body. The shipped 2.0.3 SDK cannot deliver settings or the
integration token to a service (`service.js:420-428`, `:493-516`), cannot target a dynamic origin from
`host.request` (`manifest.ts:277-282`, `request.js:24`), and has neither `origins` nor `fileEditors`
(`manifest.ts:393-411`, `parse.ts:260-284`). If a single known self-managed host is acceptable, the
safer alternative is a **static `integration.token.apiOrigin` + `host.request`**, which keeps the PAT
host-side but pins the package to one host.

Residual unknowns:

1. Whether/when `origins` ships in an OpenChamber build (live docs describe it; 2.0.3 does not have it).
2. GitLab's current CORS configuration — the quoted `origins '*'` block is from GitLab issue #18494,
   and I could not re-fetch the current `config/initializers/cors.rb`, so any page-`fetch` plan should
   verify CORS against the actual instance.
3. The exact host-side assembly of the `ready` `settings` payload lives in the web client bundle; the
   SDK/API contract and the `PUT /api/guests/:id/settings` storage path were traced, but the final
   `ready` message construction was not read line-by-line.
4. No service→panel push channel exists (streaming "deferred", `GUEST_SERVICES.md:169`); a service-based
   panel must poll.
