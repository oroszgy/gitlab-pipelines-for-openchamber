# GitLab Pipelines extension

An OpenChamber extension that shows GitLab CI/CD pipelines for a single project over the GitLab REST
API, and follows that project's Trigger jobs into their Downstream pipelines. Its GitLab access is
read-only unless the Access token allows writes, in which case it can run a small set of Pipeline
actions; it may also act on the host by starting an agent session from a failed Job. Built on
`@openchamber/sdk`.

## Language

**Extension**:
An installable OpenChamber UI unit, shipped as a folder with a `package.json` manifest and a built
IIFE panel script, running in a sandboxed iframe.
_Avoid_: plugin, add-on, connector, guest (that is OpenChamber's internal name)

**Panel**:
The sandboxed iframe on OpenChamber's right-hand rail where an extension's UI runs.
_Avoid_: widget, view, tab

**Pipeline**:
A single GitLab CI/CD run against one ref at one commit, identified by a global `id` and a
per-project `iid`.
_Avoid_: build, run, workflow

**Job**:
One unit of work within a pipeline, belonging to a stage. A build job runs commands on a runner and
has a Trace; a Trigger job starts another pipeline and has neither.
_Avoid_: task, step, build

**Trigger job**:
A Job whose work is starting a Downstream pipeline rather than running commands. It has a Stage and a
Status but no runner and no Trace; once its Downstream pipeline exists, that pipeline's Status stands
in for it.
_Avoid_: bridge (GitLab's internal name), trigger, pipeline trigger

**Trace**:
A build Job's complete log as GitLab returns it, fetched in a single request and bounded by the
host's response cap. The Panel renders it in the log drawer, where its own line cap may shorten it
further.
_Avoid_: output, console, log tail (the tail is just the end of a Trace)

**Downstream pipeline**:
A Pipeline started by a Trigger job in another Pipeline. One Trigger job starts exactly one Downstream
pipeline; a Pipeline may have several Trigger jobs. The Pipeline that holds the Trigger job is its
_upstream_ pipeline, which the Panel does not follow.
_Avoid_: subsequent pipeline, nested pipeline, sub-pipeline

**Child pipeline**:
A Downstream pipeline triggered in the same project as its upstream pipeline. The Panel labels it
"child pipeline", where a Downstream pipeline in another project is labelled with that project's path.
_Avoid_: nested pipeline, sub-pipeline

**Stage**:
A named grouping of jobs within a pipeline.
_Avoid_: phase, group

**Ref**:
The branch or tag a pipeline runs against.
_Avoid_: branch (a ref may be a tag)

**Status**:
GitLab's lifecycle state for a pipeline or job (`created`, `pending`, `running`, `success`, `failed`,
`canceled`, `skipped`, `manual`, and others). Pipelines and jobs use overlapping but distinct sets.
_Avoid_: state, result

**Self-managed**:
A GitLab instance hosted on its own domain rather than on `gitlab.com`. It is a value of the same
Configured-host setting that holds `gitlab.com`.
_Avoid_: on-prem, private

**Linked worktree**:
A git checkout whose `.git` is a _file_ pointing at the primary repository instead of a directory, so
`.git/config` and `.git/HEAD` cannot be read from the open project. The Panel's own file capability
cannot reach the remote there, so it asks its **Proxy service** to follow the `.git` pointer to the
primary repository's config, and reads its Ref from the primary's worktree list. When the service is
not granted or cannot read it, the Panel reports `linked-worktree` and the `project` override is the
way to read its pipelines.
_Avoid_: secondary checkout, submodule (a different thing)

**Proxy service**:
The Extension's host-runtime process: it owns the Extension's configuration and performs every GitLab
HTTPS call and the **Linked worktree**'s git-config read. The sandboxed Panel cannot hold a token or
reach outside the open project, so it asks the service over a loopback socket; the service runs with the
user's rights, so the install shows a service grant.
_Avoid_: backend, daemon

**Configured host**:
The GitLab host the Panel talks to for the open project, held in the Extension's configuration and
defaulting to `gitlab.com`. A project whose remote is on any other host is `host-mismatch`.
_Avoid_: target host, base URL

**Access token**:
A GitLab personal access token the Extension reads a host with. The **Proxy service** holds one per
host and attaches it to its own requests; the Panel never sees it.
_Avoid_: PAT, credential

**Project override**:
The GitLab project the Panel reads, set by hand in the Extension's configuration, for an open project
whose git remote does not resolve to one.
_Avoid_: pinned project, project setting

**Moved project**:
A GitLab project whose location has changed — renamed, or transferred to another namespace — so the path the Panel holds for it no longer resolves. GitLab does not serve the old path; it names the project's new location, and the project keeps its identity across the move.
_Avoid_: renamed project, redirected project (a move may change only the namespace, not the name)

**Project id**:
GitLab's numeric identifier for a project. It is stable: a rename or transfer does not change it, so it is the identity that survives a move.
_Avoid_: numeric id, internal id

**Session handoff**:
Starting a new OpenChamber session from a failed Job, seeded with that Job's identity, links and Trace
tail so an agent can investigate the failure in the open project. The Extension's only action that
creates a session; it never writes to GitLab. Only a Job of the open project can seed one — a Job of a
Downstream pipeline in another project is not in the checkout the session runs in.
_Avoid_: hand-off, escalation, fix-it button

**Pipeline action**:
A GitLab write the Panel may perform on a Pipeline or Job — retry, play a manual Job, cancel (or
force-cancel), or trigger a new Pipeline on the current Ref. Offered only when the Access token's
`api` scope and the user's project role allow it, gated per row by Status, and sent as `POST` under
`/api/v4/`. Never confirmed, and parameterless.
_Avoid_: command, mutation, operation

**Watched Ref**:
The one Ref of a project the user has asked the Extension to watch, so that its Terminal events are
noticed. A watch is opt-in and one per project.
_Avoid_: subscribed branch, favourite, pinned ref

**Terminal event**:
A Pipeline on a Watched Ref reaching a settled Status — success, failed or canceled.
_Avoid_: completion, finish, result

**Unseen event**:
A Terminal event that has happened since the user last looked at the Panel.
_Avoid_: unread, pending notification, new event

**Status section**:
The Extension's compact area in OpenChamber's Work Status panel, showing its Watched Ref, the latest
Status and any Unseen events, and toggling the watch.
_Avoid_: status bar, widget, mini panel
