import { canExpand } from './downstream';
import type { PrefDownstreamNode, Prefs } from './prefs';
import { samePath } from './project-resolver';
import { isActiveStatus } from './status';
import type { Pipeline } from './types';

/** A Pipeline's identity: its id alone is not unique across projects in the view. */
export type PipelineKey = { project: string; pipelineId: number };

/** An expanded Downstream pipeline: what to fetch, how deep it sits, and its path. */
export type DownstreamNode = PipelineKey & {
  generation: number;
  /** Every ancestor (root last), so a cycle on one path is refused. */
  ancestors: PipelineKey[];
};

/**
 * Choose the Pipeline to expand on a fresh load, from the loaded list and the
 * remembered record. A remembered Pipeline that is still listed wins;
 * otherwise the newest active Pipeline (the first with an active Status, in the
 * list's own order) expands; otherwise nothing expands. Auto-expand never opens
 * the drawer.
 */
export function defaultExpansion(pipelines: readonly Pipeline[], prefs: Prefs): number | null {
  const remembered = prefs.pipelineId;
  if (remembered != null && pipelines.some((pipeline) => pipeline.id === remembered)) {
    return remembered;
  }
  return pipelines.find((pipeline) => isActiveStatus(pipeline.status))?.id ?? null;
}

/**
 * The structurally consistent prefix of a stored Downstream chain: each node's
 * generation and ancestor path must continue from the one before it, rooted at
 * the expanded Pipeline. An inconsistent node and everything below it drop.
 */
export function restoredChain(
  nodes: readonly PrefDownstreamNode[],
  root: PipelineKey,
): DownstreamNode[] {
  const kept: DownstreamNode[] = [];
  for (const node of nodes) {
    const parent = kept[kept.length - 1] ?? null;
    const generation = parent ? parent.generation + 1 : 1;
    const ancestors = parent
      ? [...parent.ancestors, { project: parent.project, pipelineId: parent.pipelineId }]
      : [root];
    if (node.generation !== generation) break;
    if (!canExpand(generation - 1)) break;
    if (!sameAncestors(node.ancestors, ancestors)) break;
    kept.push({ project: node.project, pipelineId: node.pipelineId, generation, ancestors });
  }
  return kept;
}

/** Whether two ancestor paths name the same Pipelines in the same order. */
function sameAncestors(a: readonly PipelineKey[], b: readonly PipelineKey[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (key, index) => key.pipelineId === b[index]!.pipelineId && samePath(key.project, b[index]!.project),
  );
}
