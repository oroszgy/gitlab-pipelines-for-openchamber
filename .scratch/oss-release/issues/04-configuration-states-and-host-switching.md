# 04: Configuration states and host switching

**What to build:** Every way configuration can be wrong or change gets a clear, typed state rather than a
silent empty panel: a missing token, an invalid or expired token, the service not granted or failed, and a
malformed host. `host-mismatch` names both the detected host and the Configured host. Switching the
Configured host, or clearing it back to the default, re-resolves, clears Pipelines and Jobs from the
previous host, and refetches without a reload. The authenticated username confirms a token is valid.

**Blocked by:** 03 — Panel owns configuration through the service

**Status:** ready-for-agent

- [ ] A host with no token shows its own state, distinct from a failed request.
- [ ] An invalid or expired token shows a distinct state and offers the way to replace it in the form.
- [ ] A malformed host is a typed failure naming what is wrong; no request is made.
- [ ] The service-not-granted and service-failed states point at Settings → Extensions.
- [ ] `host-mismatch` names both the detected host and the Configured host.
- [ ] Changing the Configured host re-resolves and refetches without a reload, clearing Pipelines, Jobs and
      cached Traces from the previous host first.
- [ ] Clearing the host returns to `gitlab.com`.
- [ ] The authenticated username updates when the host changes.
- [ ] Each interactive control has a test proving it activates the way a user would, including the
      keyboard where relevant.
- [ ] `bun run check` stays green.
