# GitLab Pipelines extension

An OpenChamber extension that shows GitLab CI/CD pipelines for a single project over the GitLab REST
API, and follows that project's Trigger jobs into their Downstream pipelines. Its access to GitLab is
read-only; it may also act on the host by starting an agent session from a failed Job. Built on
`@openchamber/sdk`.

## Language

**Extension**:
An installable OpenChamber UI unit, shipped as a folder with a `package.json` manifest and a built
IIFE panel script, running in a sandboxed iframe.
_Avoid_: plugin, add-on, connector, guest (that is OpenChamber's internal name)

**Panel**:
The sandboxed iframe on OpenChamber's right-hand rail where an extension's UI runs.
_Avoid_: widget, view, tab

**Integration**:
The manifest block declaring an extension's relationship to one external service: its authentication
scheme, the single origin it may call, and its user settings.
_Avoid_: connector, account, provider

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
A GitLab instance hosted on its own domain rather than on `gitlab.com`. Because an extension's
`apiOrigin` is a static manifest field, supporting one is a deliberate design decision, not a config
detail.
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
The extension's host-runtime process, used to reach what the sandboxed Panel cannot: a custom GitLab
host, and the primary repository of a **Linked worktree**. The Panel sends it a request over a loopback
socket; it runs with the user's rights, so the install shows a service grant.
_Avoid_: backend, daemon

**Built-in host**:
The single GitLab origin baked into the Extension's manifest (`apiOrigin`). Requests to it go over the
host's request bridge with the host-injected token, which never reaches the Panel.
_Avoid_: default instance, primary host

**Configured host**:
The GitLab host the Panel resolves a project against: the built-in host by default, or the `host`
setting when one is set. A project whose remote is on any other host is `host-mismatch`.
_Avoid_: target host, base URL

**Moved project**:
A GitLab project whose location has changed — renamed, or transferred to another namespace — so the path the Panel holds for it no longer resolves. GitLab does not serve the old path; it names the project's new location, and the project keeps its identity across the move.
_Avoid_: renamed project, redirected project (a move may change only the namespace, not the name)

**Project id**:
GitLab's numeric identifier for a project. It is stable: a rename or transfer does not change it, so it is the identity that survives a move.
_Avoid_: numeric id, internal id

**Session handoff**:
Starting a new OpenChamber session from a failed Job, seeded with that Job's identity, links and Trace
tail so an agent can investigate the failure in the open project. The Extension's only outbound
action; it never writes to GitLab. Only a Job of the open project can seed one — a Job of a Downstream
pipeline in another project is not in the checkout the session runs in.
_Avoid_: hand-off, escalation, fix-it button
