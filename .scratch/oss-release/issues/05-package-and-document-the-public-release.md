# 05: Package and document the public release

**What to build:** The repo becomes publishable. The package is renamed `gitlab-pipelines` and made
public, an MIT `LICENSE` is added, and a README covers installation, configuring the host and Access
token, and the security posture — including that the Proxy service must now be granted and that the token
lives in the service's `0600` file. No version bump here; the user-observable change carries one in ticket
03.

**Blocked by:** 03 — Panel owns configuration through the service

**Status:** done

- [x] The package name is `gitlab-pipelines` and it is no longer private.
- [x] An MIT `LICENSE` is present and consistent with the README.
- [x] The README covers install, configuration (masked Access token, default host `gitlab.com`, Project
      override) and security (mandatory service grant; the token is held by the service; GitLab access is
      read-only).
- [x] The README states the Extension no longer appears in Settings → Integrations.
- [x] `bun run check` stays green.
