/**
 * Static configuration for the panel.
 *
 * The GitLab host is no longer baked into the manifest: the Proxy service owns
 * the configuration, and `gitlab.com` is its default. Every GitLab call goes
 * through the service's `/proxy` route. See ADR-0006.
 *
 * The rail/settings icon ships as `icon.svg` (a package SVG), not a Remixicon
 * name: a name outside the host's reduced palette renders blank. See
 * `docs/research/openchamber-extension-research.md` §2.3.1.
 */
export const PANEL_ID = "gitlab-pipelines";

/** The Configured host the service defaults to when nothing is stored. */
export const DEFAULT_HOST = "gitlab.com";

/** Pipelines requested per page. Kept modest: the service caps the body at 256 000 chars. */
export const PER_PAGE = 20;

/** The proxy service's route for a GitLab call. */
export const SERVICE_PATH = "/proxy";

/** The proxy service's route that reads and writes the configuration. */
export const SERVICE_CONFIG_PATH = "/config";

/** The proxy service's route that sets or clears an Access token. */
export const SERVICE_TOKEN_PATH = "/token";

/** The proxy service's route that returns a repository's git config. */
export const SERVICE_GIT_CONFIG_PATH = "/git-config";

/** The proxy service's route that reads, sets and clears the Watched Ref. */
export const SERVICE_WATCH_PATH = "/watch";

/** The proxy service's route that reads Terminal events and records observed ones. */
export const SERVICE_EVENTS_PATH = "/events";

/** The proxy service's route that advances the seen watermark. */
export const SERVICE_EVENTS_SEEN_PATH = "/events/seen";

/** Safety cap on lines rendered in the log drawer; the service also caps a response at 256 000 chars. */
export const LOG_MAX_LINES = 20_000;

/**
 * The service's response-body cap (`docs/research/openchamber-extension-research.md:185`). A trace body
 * at or above this came back truncated. The service now reports truncation on the response; this is the
 * fallback for a response that does not.
 */
export const HOST_BODY_CAP = 256_000;

/** How often the panel re-reads statuses while something is active. */
export const POLL_INTERVAL_MS = 5_000;

/**
 * How often the mounted Panel re-reads Terminal events for its badge, independent
 * of Pipeline activity. A settled visible list stops the Poll; this timer keeps
 * reading, so an outcome that finished while the user was away still badges.
 */
export const NOTIFICATIONS_INTERVAL_MS = 30_000;

/** How often live "elapsed" / "updated" text is repainted. */
export const LIVE_TICK_MS = 1_000;
