# Allow pipeline actions when the token allows

The extension was read-only: the Proxy service refused every method but `GET`, `README.md` and
`CODING_STANDARDS.md` promised it, and the only outbound action was a host session from a failed Job.
Developers repeatedly have to leave the workspace to retry a Job, play a manual one, cancel a runaway
Pipeline, or start a fresh run — exactly the loop the Panel exists to close.

Doing any of that is a GitLab `POST`, which needs the token's `api` scope (not the `read_api` the
Panel documents) and the user's role on the project. We permit `POST` under `/api/v4/` at the service,
and gate every action in the Panel on three things read ahead of time: the token's scopes, the user's
project access level (Developer 30 / Maintainer 40), and the project's
`ci_restrict_pipeline_cancellation_role`. A role too low hides the actions; a token known to lack
`api` disables them with a notice; an unreadable scope allows the attempt and surfaces GitLab's `403`.
The read-only claim becomes "read-only unless the token allows actions".

**Considered options.** A narrow allowlist of the six exact write routes at the service would bound
the Panel to pipeline actions, but the proxy is deliberately a GitLab-agnostic HTTPS forwarder and the
Panel builds paths from arbitrary project references (including redirected numeric ids), so a route
allowlist would have to encode GitLab's path grammar and drift from it. An explicit opt-in setting,
off by default, would keep a default install provably read-only — but the token's scope already is
the consent boundary: a `read_api` token can never write, and a user who minted an `api` token chose
that reach. Keeping the Panel read-only was rejected as the requested feature.

**Consequences.** The Panel can now write to any GitLab endpoint the token permits, not only pipeline
actions; the service still refuses every method but `GET` and `POST`-under-`/api/v4/`, and still pins
the path to the configured `https` origin, so the widening is bounded to one host's API. A bug or a
compromised panel therefore carries more authority than before. Users with `read_api` tokens are
protected automatically: their actions are hidden or disabled, and a one-time notice explains why.
`README.md`, `CODING_STANDARDS.md`, `GLOSSARY.md` and the manifest description state the new posture;
the spec is [`docs/specs/pipeline-actions.md`](../specs/pipeline-actions.md).
