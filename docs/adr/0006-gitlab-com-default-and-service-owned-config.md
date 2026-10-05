# Make gitlab.com the default host and move configuration into the service

Preparing the Extension for public release, the built-in host must become `gitlab.com`, and reaching a
self-managed GitLab must remain possible. The shipped design (ADR-0001, ADR-0002) baked one origin into
`integration.token.apiOrigin`, used the host-injected token for that built-in host, and reached any other
host through a `contributes.service` proxy with the PAT in a `token` integration setting. That split
cannot meet the release's constraints. `apiOrigin` is a single static manifest string; the host-injected
token is bound to it and is never handed to the Panel or the service; settings live only on an
integration, and an integration must declare one of `oauth`/`token`/`host`; an integration setting field
is `{ id, label }` with no secret type and no default. So "gitlab.com built-in, self-managed
configurable" leaves the self-managed PAT in a plain, unmaskable setting with no declared default, and
leaves a Connect flow whose token the Extension never uses.

We drop `contributes.integration` and move configuration into the service. The service owns a `0600`
file in the user's config dir holding the **Configured host** (default `gitlab.com`), the Project
override, and a personal access token per host. The Panel renders a masked configuration form and posts
it to the service; it never receives a token back. On each proxied request the service looks up the token
for the request's host and attaches it itself, so the PAT never enters the sandboxed Panel or its page
memory. `gitlab.com` is simply the default Configured host; a self-managed instance and any other GitLab are
values of the same setting.

**Considered options.** Keeping the **built-in host for gitlab.com** and the setting for self-managed
hosts (ADR-0002's split) was rejected: two token models, an unmaskable setting, no declared default, a
dead Connect, and re-pasting the PAT on every host switch. A **per-host build** was rejected by ADR-0001
already — it needs a rebuild. **Routing through the service but keeping the manifest settings and
forwarding the token from the Panel** was rejected: the PAT would sit in the Panel and its page memory,
and the setting and Connect constraints would remain. **OS keyring storage** for the tokens was deferred:
the service can reach it only by shelling out or shipping native code, which adds an `exec` grant,
per-platform backends, and a headless fallback; the `0600` file is the same security class as
OpenChamber's own token store.

**Consequences.** The Extension now needs its **Proxy service** granted for any GitLab access, gitlab.com
included; before, the built-in host needed no service, so the install shows a service grant every user
must approve, and the Panel must handle the service grant and failure states. The PAT's home changes from
OpenChamber's host token store to the Extension's own service process and file, and the Extension no
longer appears in Settings → Integrations. The Panel's host request bridge, `onConnection`, the built-in
resolution branch, and `API_ORIGIN` are removed: one transport, one config source. The authenticated user
is still shown, by proxying `/api/v4/user` through the service. ADR-0001 and ADR-0002 are superseded;
ADR-0005 still holds, its `/git-config` route unchanged. Existing `host`/`token` settings are ignored
rather than migrated — the Extension is pre-release.
