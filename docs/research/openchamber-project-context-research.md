# OpenChamber project context: what a panel can see about the open project

Status: research notes, written 2026-09-30. Primary sources only. The SDK is the **shipped
`@openchamber/sdk` v2.0.3** extracted to `/tmp/opencode/sdk/`; where the SDK contract is silent I
descend into the actual host code shipped in the AppImage's `resources/app.asar`
(`node_modules/@openchamber/web/...`), extracted on this machine. Line references are to the local
files listed in §Sources. This file does **not** duplicate
`docs/research/openchamber-extension-research.md`; it verifies and deepens its §2.4 against source.

Companion (do not edit here): `docs/research/openchamber-extension-research.md`.

---

## TL;DR

- The panel's ready context (`host.onReady(ctx)`) contains exactly: `theme`, `locale`, `directory`
  (the open project directory, or `null`), `session` (id/title/busy/model/agent), `surface`,
  `connection` (`{connected, account}`), `settings`, `item`. **No project object, no git remote, no
  branch, no SHA.**
- `host.listProjects()` / `onProjects()` yields project records of exactly `{ id, name, directory }`
  — a filesystem path, no remote/URL.
- The panel **can** read `.<project>/.git/config` and `.git/HEAD` with the `files` capability using a
  **relative** path (`readFile('.git/config')`). No `contributes.filesystem` glob is needed for
  project-local reads. The shipped host code (`guests/files.js`) has **no** dotfile/`.git`
  exclusion. This is the dependable route to both the remote URL and the current branch.
- The only git-derived field anywhere in the guest API is **`GuestWorktree.branch`** via
  `listWorktrees(projectId)` (and the same nested in `listSessions().sessions[].worktree.branch`).
  There is **no** host API that exposes a git remote. The SDK's own API.md lists "raw git remotes"
  under *What this package does not provide*.
- Deriving GitLab `host` + `group/project` from `origin` is entirely a panel-side parse (no host
  help). Full rules and edge cases in §5.
- The manifest `apiOrigin` is static, and the shipped host pins `request` to it
  (`joinGuestRequestUrl` requires `url.origin === apiOrigin`). There is **no dynamic-origin path in
  the panel API**; `serviceRequest` → local service is the only escape hatch (deferred to the
  self-managed agent).

---

## 1. The ready context: `connectHost()` / `host.onReady((ctx) => …)`

**Exact type** — `HostReadyContext` in `/tmp/opencode/sdk/contract.ts:189-204`:

```ts
export type HostReadyContext = {
  theme: HostTheme;          // { mode: 'light'|'dark', tokens: {...} }
  locale: string;
  directory: string | null;  // the open project directory
  session: SessionSnapshot | null;
  surface: GuestHostSurface; // 'panel' | 'dialog' | 'page' | 'background' | 'status'
  connection: GuestConnection;
  settings: GuestSettings;
  item: GuestItem | null;
};
```

Nested types:

- `SessionSnapshot` = `{ id: string; title: string; busy: boolean; model?: string; agent?: string }`
  (`contract.ts:53-59`). No directory, no branch, no SHA.
- `GuestConnection` = `{ connected: boolean; account: string }` (`contract.ts:67-70`).
- `GuestSettings` = `Record<string, string>` (`contract.ts:72`) — only the integration setting fields
  declared in the manifest.
- `GuestItem` = `AttachIssueRequest | GuestMessageItem | GuestSessionItem` (`contract.ts:245`); a
  message/session item carries a `directory: string | null` (the session's project directory), but
  that is only set when the surface was opened from a chip/action.

So `ctx.directory` is the only handle on the open project, and it is a **filesystem path string**.
There is no `projectId`, no project name, no remote, no branch, no SHA, no repo detection in the
ready context. `SessionSnapshot` does not carry a directory either — `ctx.directory` is separate.

**Host side confirms the shape.** The browser client builds the `ready` payload in
`node_modules/@openchamber/web/dist/assets/PluginPane-D3Vvv30d.js`:

```js
// extracted asset (minified); the ready payload construction
{ theme, locale: C, directory: i || null, session: Gt, surface: …,
  connection: R?.connection ?? sn, settings: R?.settings ?? {}, item: re }
```

where `i = o ? (o.item.directory ?? "") : P` — the item's directory if the surface was opened for an
item, otherwise the currently open project directory (`PluginPane-…js`, search `locale:C}=bn()`).

Docs agree: API.md `HostReadyContext` table (`API.md:79-92`) lists `directory` with no further
description; the [Hosts API docs] describe `directory` as the directory. The SDK is **silent** on
whether `directory` is a git repo root or carries any git metadata — it does not.

---

## 2. `host.listProjects()` / `host.onProjects()` — the project record

**Signature** — `host.ts:83` (`listProjects: () => Promise<GuestProjectsSnapshot>`) and
`host.ts:472-476`; subscription `onProjects` at `host.ts:86,487`.

**Exact record type** — `workspace.ts:4`:

```ts
export type GuestProject = { id: string; name: string; directory: string };
```

and the snapshot wrapper `workspace.ts:29`:

```ts
export type GuestProjectsSnapshot = { kind: 'projects'; state: 'loading'|'ready'|'error'; projects: GuestProject[] };
```

So a project record carries **`id`, `name`, `directory`** — a name (display label) and an absolute
filesystem path. It does **not** carry a repository remote/URL, a default branch, a provider, or any
git field. API.md states the same: "Projects contain `id`, `name`, `directory`"
(`API.md:202`).

The host derives `name` from the project label or the basename of the path
(`PluginPane-…js`: `name: i.label || i.path.split("/").pop() || i.path, directory: i.path`), i.e. it
is a human label, not an authoritative identifier you should rely on.

**Capability note (important):** the workspace list/subscription methods extend the existing
**`sessions`** capability — "They expose registered projects on the connected server, session
metadata and live state, and known worktrees. They do not grant conversation content or file access."
(`API.md:184-186`). `listProjects` does **not** need a `projects` capability, but it does ride on
`sessions`; reading project files needs `files` instead (§3).

If no project is open, the panel still gets the full list of *registered* projects (the server keeps
them independently). The workspace snapshot's `state` can be `loading`/`ready`/`error`; only `ready`
establishes a complete empty success (`API.md:200`).

---

## 3. Can the panel read `.git/config` and `.git/HEAD`?

**Yes — with a relative path and the `files` capability; no `contributes.filesystem` needed.**

The SDK contract (`contract.ts:130-136,530-544`):

- `guestFileScope(path)`: a path starting with `/` or `~/` is scope `'filesystem'`; **anything else**
  is scope `'project'` (`contract.ts:530-532`).
- `readFile` doc (`host.ts:143-150`): "A relative path is inside the open project (capability
  `files`); `/…` or `~/…` must match a declared `contributes.filesystem` pattern (capability
  `filesystem`)."
- `isGuestFilePath` only rejects empty/over-length (`GUEST_FILE_PATH_MAX = 1024`), NUL, and backslash
  (`contract.ts:539-544`).

The **host implementation** is the decisive primary source for `.git`. In
`node_modules/@openchamber/web/server/lib/guests/files.js`:

- `resolveGuestFilePath` rejects only `..`, NUL, backslash, empty/over-length
  (`files.js:138-146`), then for `scope: 'project'` joins the relative path to the project's
  `realpath` and requires the result to be inside it (`files.js:147-161`). **There is no list of
  forbidden names, no dotfile rule, no `.git` check.**
- `runGuestFileOperation` grants first: project scope needs the `files` grant, outside scope needs
  `filesystem`, else `NOT_GRANTED` (`files.js:270-278`).
- No open project → `NO_DIRECTORY` (`files.js:148-149`).
- The server documentation says the same and adds that the path is checked on canonical
  (realpath) paths so a symlink cannot escape (`guests/DOCUMENTATION.md:23,69`).

Therefore:

```
host.readFile('.git/config')  // -> { content: '[core]…[remote "origin"]\n\turl = git@…' }
host.readFile('.git/HEAD')    // -> { content: 'ref: refs/heads/main\n' }
```

Exact globs needed: **none**. `contributes.filesystem` is only for paths **outside** the project
(`/…`, `~/…`). For project-local `.git` reads you declare `capabilities: ["files"]`
(`API.md:222,439`). Note `files` is read **and** write inside the project — the approval dialog will
say the extension can write project files, so state this in the manifest description.

Edge cases the SDK/host are silent on but that matter:

- A **linked worktree** (and submodules) has `.git` as a *file* containing `gitdir: <path>`, so
  `.git/config`/`.git/HEAD` are not at that path; `readFile('.git/HEAD')` would fail
  (`ENOTDIR` → `BAD_PATH`). The gitdir usually points outside the open project, so reading it needs
  `contributes.filesystem` (and you do not know the glob ahead of time). The `listWorktrees` branch
  (§4) is the fallback for that case.
- `.git/config` may have no `origin` remote or several remotes; enumerate `[remote "…"]` sections.
- `.git/HEAD` gives either `ref: refs/heads/<name>` or a raw SHA (detached HEAD).

`listDir('.git')` and `stat('.git')` use the same path rules (`API.md:149-152`), so you can detect
whether `.git` is a file or a directory before reading.

The SDK is **silent** on whether `.git` is special-cased; the host code answers it: it is not.

---

## 4. Any existing host API exposing the git remote or current branch?

I searched the shipped SDK for `remote`, `branch`, `git`, `head`, `repository`. Findings:

- **No remote anywhere in the guest API.** Conceptual confirmation: API.md §5 "What this package
  does not provide" explicitly lists **"Keyboard shortcuts, raw git remotes, magic prompts"**
  (`API.md:525`).
- **Branch is exposed only on worktrees.** `GuestWorktree` (`workspace.ts:5-10`):
  ```ts
  export type GuestWorktree = { directory: string; name: string; branch: string; status: 'ready'|'pending'|'invalid'|'missing' };
  ```
  available through `host.listWorktrees(projectId)` / `onWorktrees` (`host.ts:84,87,477-481,488`) and
  nested as `GuestSessionRecord.worktree` in `listSessions` (`workspace.ts:13-27`). `listWorktrees`
  therefore requires the **`sessions`** capability (`API.md:184-186`).
- The host route behind worktrees always includes the primary checkout: "A repository always lists at
  least its primary worktree; an empty list means 'not a repository'"
  (`git/routes.js:1136-1137`, `GET /api/git/worktrees`). The browser client maps these to the guest
  snapshot (`PluginPane-…js`: `availableWorktreesByProject … .map(qn)` with
  `qn = e => ({ directory: e.path, name: e.name ?? e.label, branch: e.branch, status: … })`).
  So for the open project the panel can generally find the entry whose `directory` equals
  `ctx.directory` and read its `branch`. The UI itself uses exactly this lookup
  (`main-…js`: `(i.get(r) ?? i.get(e) ?? []).find(a => …a.path… ).branch`). Caveat: the SDK type
  does not *promise* the primary checkout is present, and `state: 'loading'` must be handled.
- `openCommit(sha)` (`host.ts:122-129,585-591`) lets the host **show** a commit of the open project in
  its Diff view. It takes a SHA and returns `void`; it does **not** return or accept a branch or
  remote. Errors: `NO_DIRECTORY` (no project), `NOT_FOUND`, `UNSUPPORTED`.
- `AttachIssueRequest.branches?: { head, base }` (`contract.ts:316-332`) is **guest→host** data for a
  pull-request chip (`kind: 'pull'`); it is not read from the repo and is clamped/dropped for issues
  (`contract.ts:478-484`).
- `StartSessionRequest.worktree` `{ kind: 'new', name?, baseBranch? }` is likewise guest-supplied
  input, not repository state (`workspace.ts:56`).
- `ctx.session` carries `model`/`agent` only; no branch. `ctx.item.directory` is a path.

**Conclusion:** the only pre-computed git signal is the worktree `branch`. There is no remote, no
SHA, and no default-branch API.

---

## 5. Mapping a git remote URL to `host` + `group/project`

This is a panel-side parse; the SDK gives no help. The remote URL is whatever `.git/config` contains.
GitLab's documented clone forms are the two canonical spellings: SSH
`git@gitlab.com:gitlab-org/gitlab.git` (scp-like) and HTTPS
`https://gitlab.example.com/tanuki/awesome_project.git`; token clones embed userinfo
`https://<username>:<token>@gitlab.example.com/tanuki/awesome_project.git`
([GitLab: Clone a repository]). The API accepts the namespaced path URL-encoded, e.g.
`group%2Fproject` and subgroups `group%2Fsubgroup%2Fproject`, or the numeric project id
([GitLab: REST namespaced paths]).

Recommended parse:

1. **Identify the form.**
   - Contains `://` → URL form (`https://`, `http://`, `ssh://`, `git://`).
   - Otherwise, scp-like `[user@]host:path` (split at the **first** `:`).
2. **Host.**
   - URL form: `new URL(remote).hostname`; include the port for self-managed instances (compare
     against an `apiOrigin` that includes the port). Drop `userinfo`.
   - scp-like: the segment before `:` (after stripping `user@`). scp-like has no port.
3. **Path.**
   - URL form: `new URL(remote).pathname` (leading `/` stripped).
   - scp-like: the segment after `:` (may itself start with `/`, e.g. `host:/group/proj.git`).
   - Strip one trailing `.git`; strip a trailing `/`.
   - Keep every remaining path segment: `group/project`, `group/subgroup/project`, or
     `username/project` (user namespace) are all valid GitLab project paths. Do **not** collapse
     subgroups.
4. **Use it.** For the REST API, `encodeURIComponent(path)` → `group%2Fsubgroup%2Fproject` (or use
   the numeric id); for the host, compare to the manifest `apiOrigin`.

Edge cases to handle:

- **Subgroups** are just extra `/` segments — keep them.
- **Ports** appear only in URL form (`ssh://git@host:2222/…`, `https://host:8443/…`). The manifest
  `apiOrigin` for self-managed must match scheme+host+port exactly, because the host pins origin
  equality (§6).
- **Trailing `.git`** is optional; strip at most one.
- **Self-managed behind a subpath** (`https://host/gitlab/group/proj.git`, relative-URL installs)
  breaks the assumption that the GitLab project path equals the URL path minus `.git`. GitLab
  documents relative installs; the panel cannot distinguish this from a project whose group is named
  `gitlab` without a probe (e.g. `GET /api/v4/projects/<encoded-path>`).
- **Non-default remote names / remotes**: pick `origin`, else `upstream`, else the first remote.
- **Path renames**: GitLab keeps redirects for renamed namespaces/projects and remote URLs redirect,
  but "API redirects might need to be followed explicitly" ([GitLab: Repository path changes]).
  A stale path may still resolve server-side.
- **Non-GitLab remotes** (GitHub, etc.) must be rejected: host unknown to your configured GitLab.

---

## 6. The self-managed tension: is there any dynamic-origin path?

High level only (deep dive deferred):

- The manifest's `integration.token.apiOrigin` (and `oauth.apiOrigin`) is a **static string**
  (`manifest.ts:184-195`). The shipped host resolves it once via `resolveIntegrationApi`
  (`manifest.ts:260-284`) and pins every `request` to it: `joinGuestRequestUrl` builds the URL and
  rejects anything where `url.origin !== apiOrigin` (`guests/request.js:14-36,63-74`). There is no
  per-call origin parameter, no host API to retarget an origin, and the shipped `manifest.ts`
  contains **no `origins` / `fileEditors`** fields (verified by grep) — those exist only in newer
  online docs, so they are not usable on this 2.0.3 build.
- So if the derived host can vary by open project, the panel has **no dynamic-origin path** within
  `host.request`. The only escape hatch is `contributes.service` (a host-spawned, unsandboxed local
  process that can fetch any origin) reachable through `serviceRequest`; a per-instance package
  (separate build per GitLab host) is the no-service workaround.

**Deferred to the self-managed agent** for the `contributes.service` / `origins` design.

---

## 7. Fallbacks: what the panel has to detect each failure case

| Case | What the host gives you | How to detect |
| --- | --- | --- |
| **No project open** | `ctx.directory === null`; relative `readFile`/`listDir`/`stat` → `NO_DIRECTORY`; `sessions`/project lists still work | Check `ctx.directory`; catch `NO_DIRECTORY` (`contract.ts:192,408`; `files.js:148-149`) |
| **Not a git repo** | `readFile('.git/config')` → `NOT_FOUND`; `stat('.git')` → `kind:'missing'`; `listWorktrees` returns empty (means "not a repository", `git/routes.js:1137`) | Catch `NOT_FOUND` / missing stat / empty worktrees |
| **Not a GitLab remote** | Nothing in the API tells provider. You get the raw URL from `.git/config` and must classify it yourself | Parse remote; reject hosts that are not your GitLab |
| **Remote host ≠ configured `apiOrigin`** | `ctx.connection.connected` only says a token exists, not which origin. The panel knows its own manifest `apiOrigin` statically (it authored it) | Compare derived host(+port) to the hardcoded `apiOrigin`; if different, do not call `host.request` (it would be pinned to the wrong origin / fail) |
| **Connected/auth missing** | `connection = { connected, account }`; `host.request` → `DISCONNECTED` | `onConnection` / catch `DISCONNECTED` (`contract.ts:67-70`, `API.md:258`) |
| **No `.git/HEAD` / detached / worktree** | HEAD read may fail or return a SHA | Fall back to `listWorktrees` branch, or show a short SHA |
| **Panel cannot reach the API origin** | `host.request` is the only network path and is origin-pinned | Surface an error; a manual `integration.settings` override (e.g. project path) is possible (`manifest.ts:164-167,221`) |

`host.listProjects()` remains useful in every case: it enumerates registered projects even when none
is open, and matching `ctx.directory` to a project's `directory` is how the panel obtains a
`projectId` for `listWorktrees`/`listSessions` (the ready context does not carry one).

---

## Bottom line: can we derive the project and branch?

**Yes, but only panel-side, and only via two different capabilities.**

1. **Project:** the panel gets the open project directory from `ctx.directory` (ready context) and the
   registered project list from `listProjects()` (`{id,name,directory}`). There is **no** project id
   in the ready context — match `ctx.directory` against `projects[].directory` to get one.
2. **GitLab project + host:** read the remote from `.git/config` with `readFile('.git/config')`
   (relative path, `files` capability, no globs), parse the URL per §5 to get `host` and
   `group/project`, then URL-encode the path for `/api/v4/projects/:id/…`. There is no host API that
   does this for you.
3. **Current branch:** read `.git/HEAD` with `readFile('.git/HEAD')` (same `files` capability).
   This is the dependable path for a normal checkout. For linked worktrees (`.git` is a file pointing
   outside the project) fall back to `listWorktrees(projectId)` and match `directory === ctx.directory`
   to read `branch` (requires the `sessions` capability; the host includes the primary worktree).
4. **What is impossible:** there is **no** API for the git remote, the default branch, the current
   SHA, or the project id from the ready context. Everything git-specific beyond `GuestWorktree.branch`
   comes from reading files inside the project. And the derived host cannot change the static
   `apiOrigin` — that is the self-managed agent's problem.

**Recommended capability set for the zero-config panel:** `files` (read `.git/config` + `.git/HEAD`),
`sessions` (to map `directory` → project id and to use `listWorktrees` as a worktree fallback), and
`network` (implied by `integration`). No `filesystem` globs are needed for project-local `.git`.
If you want to avoid `sessions`, you can still do everything from `ctx.directory` + `files`;
you just lose the worktree-branch fallback and the project-id lookup.

---

## Sources

### Shipped SDK (local, `/tmp/opencode/sdk/`, `@openchamber/sdk` v2.0.3)

- `/tmp/opencode/sdk/contract.ts`
  - `HostReadyContext` 189-204; `SessionSnapshot` 53-59; `GuestConnection` 67-70; `GuestSettings` 72;
    `GuestItem` 245; file result types 143-147; `guestFileScope` 530-532; `isGuestFilePath` 539-544;
    `GUEST_FILE_PATH_MAX` 369; `HOST_REQUEST_ERROR_CODES` 395-415; `AttachBranches` 316-332.
- `/tmp/opencode/sdk/host.ts`
  - `HostClient` surface: `listProjects` 83, `listWorktrees` 84, `onProjects` 86, `onReady` 96,
    `readFile` 143-150, `writeFile` 151-156, `listDir` 157-158, `stat` 159-160, `openCommit` 122-129;
    implementations: `listProjects` 472-476, `listWorktrees` 477-481, `onReady` 507-513,
    `openCommit` 585-591, `readFile` 714-725, `listDir` 746-757, `stat` 758-769.
- `/tmp/opencode/sdk/manifest.ts`
  - `IntegrationToken`/`IntegrationOAuth` `apiOrigin` 169-195; `IntegrationContribution` 215-222;
    `resolveIntegrationApi` 260-284; `OpenChamberContributes.filesystem` 393-411;
    `requestedGuestCapabilities` 424-433. Confirms **no** `origins` / `fileEditors` on this build.
- `/tmp/opencode/sdk/workspace.ts`
  - `GuestProject` 4; `GuestWorktree` 5-10; `GuestSessionRecord` 13-27; snapshots 29-39;
    `GuestSessionWorktree` 56.
- `/tmp/opencode/sdk/API.md`
  - `HostReadyContext` table 79-92; workspace lists 184-202; `files`/path rules 222; error codes
    250-273; "raw git remotes" under *What this package does not provide* 519-527.
- `/tmp/opencode/sdk/DOCUMENTATION.md` (UI kit — not project context; noted for completeness).

### Shipped host implementation (local, extracted from `/tmp/.mount_openchUPJI5m/resources/app.asar`)

- `node_modules/@openchamber/web/server/lib/guests/files.js` (extracted to
  `/tmp/opencode/asar-out/node_modules__@openchamber__web__server__lib__guests__files.js`)
  - malformed-path rejection 138-146; project scope 147-161; canonicalization 87-126; grant check
    270-278; operations 180-236, 257-308.
- `node_modules/@openchamber/web/server/lib/guests/routes.js`
  - `POST /api/guests/:id/files` 600-635; project directory from request 614-616.
- `node_modules/@openchamber/web/server/lib/guests/DOCUMENTATION.md`
  - file rules and `resolveOptionalProjectDirectory` 23; canonical-path invariant 69.
- `node_modules/@openchamber/web/server/lib/guests/request.js`
  - origin pin `joinGuestRequestUrl` 14-36; proxy / static origin 63-74.
- `node_modules/@openchamber/web/server/lib/opencode/project-directory-runtime.js`
  - `resolveProjectDirectory` / `resolveOptionalProjectDirectory` from `x-opencode-directory` header
    or `directory` query 73-154; a refused/unknown directory never falls back.
- `node_modules/@openchamber/web/server/lib/git/routes.js`
  - `GET /api/git/worktrees` 1127-1149; "A repository always lists at least its primary worktree"
    1136-1137.
- `node_modules/@openchamber/web/server/lib/git/service.js`
  - `listWorktreeEntries` 1701; primary worktree handling 1689, 1798.
- `node_modules/@openchamber/web/dist/assets/PluginPane-D3Vvv30d.js` (browser client)
  - ready payload build (`theme:…, locale:C, directory:i||null, session:Gt, …`);
    project mapping `{id, name: label||basename, directory: path}`; worktree mapping
    `qn = e => ({directory:e.path, name:e.name??e.label, branch:e.branch, status:…})`.
- `node_modules/@openchamber/web/dist/assets/main-C-01Ieit.js`
  - current-branch lookup from `availableWorktreesByProject` by matching path.
- AppImage mount: `/tmp/.mount_openchUPJI5m/resources/app.asar` (`@openchamber/electron` 2.0.3;
  `@openchamber/sdk` 2.0.3; `opencodeCli.version` 2.0.18).

### Upstream SDK (same source as the shipped build; `main` may be newer)

- `packages/sdk/src/contract.ts`, `host.ts`, `manifest.ts`, `workspace.ts`, `API.md`:
  <https://github.com/openchamber/openchamber/tree/main/packages/sdk>

### GitLab (remote-URL forms, namespaced paths, redirects)

- Clone a repository (SSH `git@gitlab.com:…`, HTTPS `https://host/group/proj.git`, token URLs):
  <https://docs.gitlab.com/topics/git/clone/>
- Repository / path changes and remote-URL redirects:
  <https://docs.gitlab.com/user/project/repository/#repository-path-changes>
- REST namespaced / URL-encoded paths (`group%2Fproject`, subgroups, numeric id):
  <https://docs.gitlab.com/api/rest/#namespaced-paths>
- Pipelines API (`GET /projects/:id/pipelines`, `:id` = numeric or encoded path):
  <https://docs.gitlab.com/api/pipelines/>

### Where primary sources are silent (explicit)

- The SDK contract does **not** say whether `.git` is readable; the host implementation
  (`guests/files.js`) shows it is not excluded. Verified in source, not documented.
- The SDK contract does **not** guarantee the primary checkout appears in `listWorktrees`; the host
  route comment says it always does. Verified in host source, not in the SDK type.
- The SDK/docs are **silent** on how to map a remote URL to a GitLab project; §5 is a panel-side
  parse based on GitLab's documented URL forms, not an SDK feature.
- Relative-URL GitLab installs (instance under a subpath) are not addressed by the SDK or by a
  single GitLab page found here; treat that mapping as an inference needing a probe.
