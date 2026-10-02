# 03: Panel owns configuration through the service

**What to build:** The tracer bullet. The Panel gains a small configuration form (Configured host,
Project override, Access token) whose token field is masked and posted once to the service, never read
back. The Panel loads its configuration from the service and reaches every GitLab host — `gitlab.com`
included — through `serviceRequest`, with the service attaching the token. The manifest drops
`contributes.integration` and its settings entirely, so there is no Integrations card and no Connect flow,
and `gitlab.com` is the default Configured host. The built-in resolution branch, the host request bridge,
the connection listener and the baked origin constant are removed. The version bump and changelog entry
land in the same commit.

**Blocked by:** 02 — Service serves configuration and resolves tokens

**Status:** done

- [x] With no configuration at all the Configured host is `gitlab.com`; once an Access token is entered,
      the Panel reads that project's Pipelines.
- [x] The configuration form's token field is masked and the token is never rendered back.
- [x] Saving the form persists host, Project override and token through the service; a reload shows them,
      with the token only as present or absent.
- [x] The Panel makes no `host.request` call for GitLab; all GitLab traffic goes through the service.
- [x] The manifest declares no integration, no `apiOrigin` and no settings; it declares the service and
      the `files` and `sessions` capabilities.
- [x] A project on another host reports `host-mismatch` against the Configured host.
- [x] The header names the Configured host and the resolved project.
- [x] The authenticated user is shown, resolved through the service.
- [x] The manifest test asserts the service, the capabilities, and the absence of an integration.
- [x] `package.json` version is bumped and `CHANGELOG.md` carries the matching entry in the same commit.
- [x] `bun run check` stays green.
