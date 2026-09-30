# Add a local service transport for a runtime GitLab host

ADR-0001 baked a single GitLab host into `integration.token.apiOrigin` and accepted that the extension
works against exactly one instance. The requirement has changed: the extension should reach any
self-managed GitLab, one host at a time, without a rebuild. Nothing in the shipped OpenChamber SDK
(2.0.3) can retarget `host.request`: `apiOrigin` is a static manifest string, there is no `origins`
capability, and the host-injected token is bound to the baked origin.

We keep the baked host and the host-injected token for the **built-in** instance, and add a
`contributes.service` local proxy for a **custom** host. When the `host` integration setting is empty —
or names the built-in instance — the panel uses `host.request` and the token store exactly as before.
When it names anything else, the panel sends the base URL and a personal access token (from the `token`
setting) to the service, which performs the GitLab HTTPS call itself. Settings are delivered only to the
panel, so the panel is the one that forwards them.

**Considered options.** A **per-host build** (a manifest per instance) satisfies the one-host limit
without a service, but not "without a rebuild", and was kept as the fallback. **Page `fetch` plus an
`origins` capability** is not in the shipped SDK, and even where it exists it would not carry the
host-injected token, so the PAT would still have to come from a setting. A **service-only** design with
the PAT always in settings was rejected because it gives up the safer host-injected path for the common,
built-in case for no gain.

**Consequences.** For a custom host the PAT leaves OpenChamber's token store: it lives in a plain
integration setting, in page memory, and in the service process — the "token never reaches your page"
guarantee no longer holds on that path. A `contributes.service` is an unsandboxed process running with
the user's rights, so the install shows a service grant (the extension declares no `exec` or `socket`
permissions). The panel must forward the PAT on every proxied request. Because a service cannot push,
polling stays the model. Runtime host configuration is one host at a time, never several at once; that
remains out of scope. This supersedes ADR-0001 for custom hosts while its reasoning still governs the
built-in path.
