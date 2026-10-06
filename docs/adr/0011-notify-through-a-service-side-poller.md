# Notify through a service-side poller

OpenChamber cannot push to an extension, and neither can the Proxy service. A rail panel is
hidden-but-running only while its tab is open; a status section runs only while the Work Status panel
is shown and its section expanded. Watching therefore has to survive long stretches with **no surface
mounted**, which no in-panel timer can do. The service — already running with the user's rights and the
Access token — polls each Watched Ref on a slower, always-on cadence, records Terminal events in a
bounded persisted log, and surfaces consume them through a watermark they advance as they read. A
mounted surface also records transitions it observes itself; the service dedupes by identity, so a
failure toasts exactly once.

**Considered options.** Surface-only polling misses every event that happens while nothing is mounted.
Holding watches in `host.storage` is invisible to the service, which cannot read host state. A
`contributes.actions` background frame is on-demand and capped at 20 seconds, not a daemon.

**Consequences.** The service now makes unattended GitLab calls using the user's token, so watches are
opt-in and limited to one per project, and the service's polling must respect the same caps and
redirect rules as a proxied call. The duplicated load is bounded by the service's slower floor. The rail
badge is in-memory and is rebuilt from the persisted events on mount. The spec is
[`docs/specs/notifications.md`](../specs/notifications.md).
