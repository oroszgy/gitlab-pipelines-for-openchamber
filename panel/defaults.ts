import type { Prefs } from './prefs';
import { isActiveStatus } from './status';
import type { Pipeline } from './types';

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
