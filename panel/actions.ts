/**
 * Which GitLab write actions a Job or Pipeline offers, from its Status and the
 * project's capability — the user's role, the token's scope, and the project's
 * cancel restriction. Pure: no DOM, no port, no clock.
 *
 * See `docs/specs/pipeline-actions.md` for the table this encodes.
 */

/** GitLab access levels (the ladder's two that matter here). */
export const DEVELOPER_ACCESS = 30;
export const MAINTAINER_ACCESS = 40;

/** How the project restricts who may cancel (`ci_restrict_pipeline_cancellation_role`). */
export type CancelRole = 'developer' | 'maintainer' | 'no_one';

export type Capability = {
  /** `max(project_access, group_access)`; null when the user has neither. */
  accessLevel: number | null;
  /** Whether the token has the `api` scope; null when it could not be read. */
  canWrite: boolean | null;
  /** The project's cancel restriction; GitLab defaults to `developer`. */
  cancelRole: CancelRole;
};

export type ActionId =
  | 'retry-job'
  | 'play-job'
  | 'cancel-job'
  | 'force-cancel-job'
  | 'retry-pipeline'
  | 'cancel-pipeline'
  | 'run-pipeline';

export type ActionKind = 'job' | 'pipeline';

/** What a row's `⋯` menu should be: nothing, disabled, or a set of items. */
export type MenuState =
  | { state: 'hidden' }
  | { state: 'disabled'; reason: 'scope' }
  | { state: 'ready'; items: ActionId[] };

const RETRY_JOB = new Set(['failed', 'canceled', 'success']);
const PLAY_JOB = new Set(['manual']);
const CANCEL_JOB = new Set([
  'created',
  'pending',
  'preparing',
  'running',
  'waiting_for_resource',
  'waiting_for_callback',
]);
const RETRY_PIPELINE = new Set(['failed', 'canceled']);
const CANCEL_PIPELINE = new Set([
  'created',
  'pending',
  'preparing',
  'running',
  'canceling',
  'waiting_for_resource',
]);

/** Read the project's cancel restriction; an unknown value is GitLab's `developer` default. */
export function cancelRoleOf(value: string | null | undefined): CancelRole {
  if (value === 'maintainer') return 'maintainer';
  if (value === 'no_one') return 'no_one';
  return 'developer';
}

function roleAtLeast(capability: Capability, level: number): boolean {
  return capability.accessLevel != null && capability.accessLevel >= level;
}

/** Whether the capability's role clears the project's Cancel restriction. */
export function canCancel(capability: Capability): boolean {
  if (capability.cancelRole === 'no_one') return false;
  const level = capability.cancelRole === 'maintainer' ? MAINTAINER_ACCESS : DEVELOPER_ACCESS;
  return roleAtLeast(capability, level);
}

/** The actions a Job offers by Status and role, before the token scope is applied. */
export function jobActions(status: string, capability: Capability): ActionId[] {
  const items: ActionId[] = [];
  if (!roleAtLeast(capability, DEVELOPER_ACCESS)) return items;
  if (RETRY_JOB.has(status)) items.push('retry-job');
  if (PLAY_JOB.has(status)) items.push('play-job');
  if (CANCEL_JOB.has(status) && canCancel(capability)) items.push('cancel-job');
  // Force-finishing a job stuck in `canceling` is Maintainer-level, and pointless
  // where the project forbids cancellation altogether.
  if (status === 'canceling' && capability.cancelRole !== 'no_one' && roleAtLeast(capability, MAINTAINER_ACCESS)) {
    items.push('force-cancel-job');
  }
  return items;
}

/** The actions a Pipeline offers by Status and role, before the token scope is applied. */
export function pipelineActions(status: string, capability: Capability): ActionId[] {
  const items: ActionId[] = [];
  if (!roleAtLeast(capability, DEVELOPER_ACCESS)) return items;
  if (RETRY_PIPELINE.has(status)) items.push('retry-pipeline');
  if (CANCEL_PIPELINE.has(status) && canCancel(capability)) items.push('cancel-pipeline');
  return items;
}

export function allowedActions(kind: ActionKind, status: string, capability: Capability): ActionId[] {
  return kind === 'job' ? jobActions(status, capability) : pipelineActions(status, capability);
}

/** Whether the current Ref's "Run pipeline" is offered: Developer+, token not read-only. */
export function canRunPipeline(capability: Capability): boolean {
  return roleAtLeast(capability, DEVELOPER_ACCESS) && capability.canWrite !== false;
}

/**
 * The row menu's state. Nothing to do — or a role too low to do anything — hides
 * it; a token known to lack `api` disables it, so the user is not offered a
 * button that can only fail; an unreadable scope allows the attempt, whose own
 * 403 is then surfaced.
 */
export function menuState(kind: ActionKind, status: string, capability: Capability): MenuState {
  const items = allowedActions(kind, status, capability);
  if (items.length === 0) return { state: 'hidden' };
  if (capability.canWrite === false) return { state: 'disabled', reason: 'scope' };
  return { state: 'ready', items };
}
