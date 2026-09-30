# Bake the GitLab host into the manifest; support one instance

> **Superseded by [ADR-0002](0002-service-transport-for-custom-hosts.md) for custom hosts.** The
> built-in host still works as described here; a host set in the `host` setting is reached through the
> service transport instead.

OpenChamber's `integration.token.apiOrigin` is a static string in the manifest, so an extension can
reach exactly one origin. We need a self-managed GitLab. Rather than add a local `service` to reach an
arbitrary base URL, we bake the target host into `apiOrigin` and rely on the host-injected personal
access token. This keeps the PAT inside OpenChamber's token store (it never reaches the page or a child
process) and needs no CORS handling. It means the extension works against exactly one GitLab instance —
`gitlab.com` or a single self-managed host — and a project whose derived remote host doesn't match is
reported as unsupported rather than silently failing.

**Considered options.** A `contributes.service` could do the GitLab HTTPS itself and take the base URL
and PAT from the panel, supporting any host — but that moves the PAT into a forwarded setting, runs an
unsandboxed process with the user's full rights, and needs a service lifecycle. The newer `origins`
capability plus page-side `fetch` is not in the shipped SDK 2.0.3, needs GitLab to send CORS headers,
and loses host token injection.

**Consequences.** Supporting arbitrary or multiple hosts later is a rewrite of the transport, not a
setting. This trade-off is only acceptable because the extension is currently a personal, single-host
tool; revisit if that changes.
