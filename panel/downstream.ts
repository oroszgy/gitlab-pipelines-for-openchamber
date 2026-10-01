import { statusInfo, type StatusInfo } from './status';
import type { Bridge, DownstreamPipeline } from './types';

/**
 * Everything the Panel derives from a Pipeline's bridges, with no DOM, port or
 * clock: how a Trigger job reads, what its Downstream pipeline is called, and
 * how far the walk may go. See ADR-0004.
 */

/** How deep the walk follows Trigger edges below the root Pipeline, inclusive. */
export const MAX_DOWNSTREAM_GENERATIONS = 3;

/**
 * Whether a card at this generation expands. Generation 1 is the root's own
 * Trigger job's Downstream pipeline; the cap stops below the third.
 */
export function canExpand(generation: number): boolean {
  return generation < MAX_DOWNSTREAM_GENERATIONS;
}

/**
 * How a Trigger job reads before it is `ready`:
 * - `starting`: the bridge has not settled and has no Downstream pipeline yet.
 * - `could-not-start`: the bridge failed without ever creating one.
 */
export type TriggerState = 'starting' | 'could-not-start' | 'ready';

/**
 * A Trigger job as a Stage row: the identity a row needs, the state it is in,
 * and the Status it contributes to `done/total` — the Downstream pipeline's when
 * there is one, otherwise its own.
 */
export type TriggerRow = {
  id: number;
  name: string;
  stage: string;
  state: TriggerState;
  status: string;
  downstream: DownstreamPipeline | null;
};

const SETTLED = new Set(['success', 'failed', 'canceled', 'skipped']);

export function triggerRows(
  bridges: readonly Bridge[] | null | undefined,
  project: string,
): TriggerRow[] {
  // `project` is part of the spec's signature; the row itself is project-agnostic
  // (the child-vs-path decision belongs to `downstreamLabel`), so it is unused here.
  void project;
  return (bridges ?? []).map((bridge) => {
    const downstream = bridge.downstream_pipeline ?? null;
    if (downstream) {
      return {
        id: bridge.id,
        name: bridge.name,
        stage: bridge.stage,
        state: 'ready',
        status: downstream.status,
        downstream,
      };
    }
    const state: TriggerState =
      bridge.status === 'failed' ? 'could-not-start' : SETTLED.has(bridge.status) ? 'ready' : 'starting';
    return { id: bridge.id, name: bridge.name, stage: bridge.stage, state, status: bridge.status, downstream: null };
  });
}

/**
 * The project path parsed from a Downstream pipeline's `web_url`, when it can be
 * read. The payload carries only a numeric `project_id`, so the URL is what
 * identifies the project.
 */
export function projectPathFromUrl(webUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(webUrl);
  } catch {
    return null;
  }
  const match = /^\/?(.+?)\/-\//.exec(url.pathname);
  const path = match?.[1];
  if (!path) return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * The project a Downstream pipeline lives in, or null when its `web_url` cannot
 * be parsed. The payload carries only a numeric `project_id`, so the URL's path
 * is the only readable source of a project reference.
 */
export function downstreamProject(downstream: DownstreamPipeline): string | null {
  return projectPathFromUrl(downstream.web_url);
}

/**
 * What a card calls its Downstream pipeline: "child pipeline" when it is the
 * owning project's own, otherwise the project path parsed from `web_url`, and
 * `project #<id>` when the URL cannot be parsed.
 */
export function downstreamLabel(downstream: DownstreamPipeline, project: string): string {
  const path = downstreamProject(downstream);
  if (path == null) return `project #${downstream.project_id}`;
  return path === project ? 'child pipeline' : path;
}

/** The collapsed row's badge number: how many Trigger rows have a Downstream pipeline. */
export function downstreamCount(
  rows: readonly { downstream: DownstreamPipeline | null }[] | null | undefined,
): number {
  return (rows ?? []).filter((row) => row.downstream != null).length;
}

/** How a Trigger row reads: a `starting`/`could-not-start` label, else its Status. */
export function triggerStateInfo(state: TriggerState, status: string): StatusInfo {
  if (state === 'starting') return { label: 'Starting', tone: 'warning', glyph: 'clock' };
  if (state === 'could-not-start') return { label: 'Could not start', tone: 'error', glyph: 'cross' };
  return statusInfo(status);
}
