# GitLab Pipelines extension

An OpenChamber extension that shows GitLab CI/CD pipelines for a single project, read-only, over the
GitLab REST API. Built on `@openchamber/sdk`.

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
One unit of work within a pipeline, belonging to a stage, with its own status, runner, and log.
_Avoid_: task, step, build

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
