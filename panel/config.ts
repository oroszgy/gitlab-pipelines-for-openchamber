/**
 * Static configuration for the panel.
 *
 * `API_ORIGIN` must match `openchamber.contributes.integration.token.apiOrigin`
 * in `package.json`: OpenChamber pins every `host.request` to that single
 * origin, so a project whose remote is on a different host is reported as
 * `host-mismatch` rather than silently called. See ADR-0001.
 */
export const PANEL_ID = 'gitlab-pipelines';
export const API_ORIGIN = 'https://sdlc.webcloud.ec.europa.eu';

/** Pipelines requested per page. Kept modest: `host.request` caps the body at 256 000 chars. */
export const PER_PAGE = 20;

/** Lines kept in the Job log drawer. */
export const LOG_TAIL_LINES = 40;

/** How often the panel re-reads statuses while something is active. */
export const POLL_INTERVAL_MS = 5_000;

/** How often live "elapsed" / "updated" text is repainted. */
export const LIVE_TICK_MS = 1_000;
