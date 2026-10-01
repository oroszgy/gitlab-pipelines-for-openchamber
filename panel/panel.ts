import type { GuestConnection, HostReadyContext, StartSessionSent } from '@openchamber/sdk';
import { applyHostReady, mountButton, mountEmpty, mountTabs } from '@openchamber/sdk/ui';

import { API_ORIGIN, HOST_BODY_CAP, LOG_MAX_LINES, LIVE_TICK_MS, PANEL_ID, SERVICE_GIT_CONFIG_PATH, SERVICE_PATH } from './config';
import {
  MAX_DOWNSTREAM_GENERATIONS,
  canExpand,
  downstreamCount,
  downstreamLabel,
  downstreamProject,
  triggerRows,
  triggerStateInfo,
  type TriggerRow,
} from './downstream';
import { ago, duration, elapsed, logLines, shortSha, tailLines, toEpoch } from './format';
import {
  fetchBridges,
  fetchJobs,
  fetchPipelines,
  fetchTrace,
  fromHostPort,
  type ClientFailure,
  type Requester,
} from './gitlab-client';
import { buildHandoff, isHandoffJob } from './handoff';
import type { HostPort } from './host-port';
import { nextPollDelay, shouldPoll } from './poll';
import {
  hostOfOrigin,
  isLinkedWorktree,
  resolveProject,
  samePath,
  worktreePrimaryDirectory,
  type ProjectFailureKind,
  type ProjectResolution,
  type ResolveInput,
} from './project-resolver';
import { groupJobsByStage, type StageGroup } from './stage-groups';
import { isActiveStatus, jobStatusInfo, statusInfo, type StatusInfo } from './status';
import type { Bridge, Job, Pipeline, Scope } from './types';

/** Everything the panel needs from a clock. Injected so tests are deterministic. */
export type Timers = {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  setInterval(fn: () => void, ms: number): number;
  clearInterval(id: number): void;
  now(): number;
};

export const defaultTimers: Timers = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clearTimeout: (id) => globalThis.clearTimeout(id),
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms) as unknown as number,
  clearInterval: (id) => globalThis.clearInterval(id),
  now: () => Date.now(),
};

export type PanelOptions = {
  apiOrigin: string;
  timers?: Timers;
};

export type PanelHandle = {
  refresh(): void;
  setScope(scope: Scope): void;
  isPolling(): boolean;
  dispose(): void;
};

type Problem = {
  kind:
    | ProjectFailureKind
    | 'disconnected'
    | 'unauthorized'
    | 'not-found'
    | 'custom-host'
    | 'custom-token'
    | 'service'
    | 'moved'
    | 'redirected';
  title: string;
  body: string;
  hint?: string;
  detail?: string;
  /** An optional outbound action, e.g. opening the project in GitLab. */
  action?: { label: string; url: string };
};

/** Redirects followed in one refresh before a move chain is treated as runaway. */
const MAX_REDIRECT_HOPS = 5;

/** Why a log is shorter than the trace: our own line cap, or the host's body cap. */
type TraceTruncation = 'cap' | 'host' | null;

type TraceState = {
  state: 'ready' | 'missing' | 'error';
  text: string;
  truncated: TraceTruncation;
};

/** A Pipeline's identity: its id alone is not unique across projects in the view. */
type PipelineKey = { project: string; pipelineId: number };

/** A Job's identity: its id alone is not unique across projects in the view. */
type JobKey = { project: string; jobId: number };

/** The open Jobs drawer, pinned to the project and pipeline the Job belongs to. */
type OpenJob = JobKey & { pipelineId: number };

/** An expanded Downstream pipeline: what to fetch, how deep it sits, and its path. */
type DownstreamNode = PipelineKey & {
  generation: number;
  /** Every ancestor (root last), so a cycle on one path is refused. */
  ancestors: PipelineKey[];
};

/** A Pipeline's Trigger rows, or a failure. Keyed by project + pipeline id. */
type BridgeEntry = TriggerRow[] | 'error';

function pipelineKey(project: string, pipelineId: number): string {
  return `${project}\u0000${pipelineId}`;
}

function jobKey(project: string, jobId: number): string {
  return `${project}\u0000${jobId}`;
}

// ---------------------------------------------------------------------------
// SVG shapes (glyph names come from the pure status map)
// ---------------------------------------------------------------------------

const GLYPHS: Record<string, string> = {
  check: '<path d="M9.6 16.3 5.3 12l-1.5 1.5 5.8 5.8L21.4 7.5 19.9 6z"/>',
  cross: '<path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/>',
  clock:
    '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.1l3.1 2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  calendar:
    '<rect x="4.5" y="5.5" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 9.5h15M8.5 3.5v4M15.5 3.5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  circle: '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  loader:
    '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="13 40"/>',
  hourglass:
    '<path d="M7 4h10v2l-3.7 4.6L17 15v2H7v-2l3.7-4.4L7 6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  pause:
    '<rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/>',
  slash:
    '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.9 6.9 17.1 17.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  skip: '<path d="M6 5.4l9.2 6.6L6 18.6z"/><rect x="16.4" y="5.4" width="2.6" height="13.2" rx="0.6"/>',
  play: '<path d="M7 4.6l12.4 7.4L7 19.4z"/>',
  dot: '<circle cx="12" cy="12" r="4.6"/>',
};

/** Remixicon `gitlab-line`, drawn in `currentColor` so the mark is black on the light theme and white on the dark. */
const GITLAB_LINE =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M5.54429 2.67305C5.81644 2.49995 6.13587 2.41612 6.45799 2.43329C6.78102 2.4505 7.09056 2.56841 7.34318 2.77049L7.34405 2.77119C7.59044 2.96879 7.76998 3.2372 7.85866 3.5399L9.30537 7.96754H14.6944L16.1411 3.5399C16.2298 3.23722 16.4093 2.96879 16.6557 2.77116L16.6604 2.76745C16.9128 2.56777 17.2209 2.45133 17.5424 2.43423C17.8638 2.41712 18.1826 2.50023 18.4547 2.67197L18.4571 2.67347C18.7307 2.84735 18.9427 3.10328 19.0624 3.40486L19.0664 3.41491L21.5393 9.86622C21.9619 10.9712 22.0136 12.1836 21.6865 13.3205C21.3594 14.4574 20.6715 15.457 19.7263 16.1685L12.9955 21.2331L12.9945 21.2338C12.7066 21.4513 12.3554 21.5692 11.9943 21.5692C11.6332 21.5692 11.2819 21.4513 10.9939 21.2337L4.26254 16.1683C3.32063 15.4562 2.63541 14.4574 2.30989 13.3224C1.98437 12.1873 2.03616 10.9772 2.45747 9.8741L4.93724 3.40497C5.0571 3.10297 5.26966 2.84673 5.54429 2.67305ZM6.35534 4.73567L4.16029 10.4639C3.87993 11.2013 3.82298 12.0676 4.04049 12.8261C4.25704 13.5811 4.71123 14.2461 5.33544 14.7225L11.9943 19.7329L18.6484 14.7265C19.2789 14.2502 19.7379 13.5822 19.9563 12.8227C20.1751 12.0624 20.1148 11.1847 19.8328 10.4455L17.6444 4.73558L16.0001 9.76791H7.9996L6.35534 4.73567Z"/></svg>';
const REFRESH_ICON =
  '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>';
const CHEVRON =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 13.17l4.95-4.95 1.41 1.41L12 16 5.64 9.63 7.05 8.22z"/></svg>';
const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/></svg>';

// ---------------------------------------------------------------------------
// Tiny DOM helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function clearNode(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

class PipelinesPanel implements PanelHandle {
  private readonly root: HTMLElement;
  private readonly port: HostPort;
  private readonly options: PanelOptions;
  private readonly timers: Timers;

  private directory: string | null = null;
  private settingsProject = '';
  private settingsHost = '';
  private settingsToken = '';
  private started = false;
  private disposed = false;

  private scope: Scope = 'branch';
  private phase: 'init' | 'loading' | 'ready' | 'problem' = 'init';
  private resolved: Extract<ProjectResolution, { ok: true }> | null = null;
  private problem: Problem | null = null;
  private error: string | null = null;
  private pipelines: Pipeline[] = [];
  private expandedId: number | null = null;
  /** Trigger rows per Pipeline, from `/bridges`; missing means not fetched yet. */
  private readonly bridges = new Map<string, BridgeEntry>();
  /** Build Jobs per (project, pipeline id), fetched lazily on expansion. */
  private readonly jobs = new Map<string, Job[] | 'loading' | 'error'>();
  /** The open Downstream chain, root-most first; each entry is an expanded card. */
  private downstreamPath: DownstreamNode[] = [];
  private openJob: OpenJob | null = null;
  /** Traces per (project, job id). */
  private readonly traces = new Map<string, TraceState>();
  private traceLoadingKey: string | null = null;
  /** The Job whose handoff is in flight, and the last handoff failure to show. */
  private handoffJobId: number | null = null;
  private handoffError: string | null = null;
  private updatedAt: number | null = null;
  /** The Configured host the current data belongs to, for switch detection. */
  private lastHost: string | null = null;
  /** Healed targets, keyed by the derived project path they were reached from. */
  private readonly healed = new Map<string, string>();
  /** The derived project for the current refresh, before any heal. */
  private derivedProject: string | null = null;
  /** Redirects followed in the current refresh. */
  private redirectHops = 0;
  /** A heal notice, promoted to `healNotice` only once the heal succeeds. */
  private pendingHealNotice: { from: string; to: string } | null = null;
  /** The one-time heal notice, until dismissed. */
  private healNotice: { from: string; to: string } | null = null;

  private generation = 0;
  private pollTimer: number | null = null;
  private tickTimer: number | null = null;
  private pollStartedAt: number | null = null;
  private scrollTop = 0;
  private scrollEl: HTMLElement | null = null;
  private drawerEl: HTMLElement | null = null;
  private drawerScrollTop = 0;
  /** Whether the log view should stick to the bottom as it updates. */
  private followTail = true;

  private readonly handles: Array<{ dispose(): void }> = [];
  private unsubReady: (() => void) | null = null;
  private unsubConnection: (() => void) | null = null;

  constructor(root: HTMLElement, port: HostPort, options: PanelOptions) {
    this.root = root;
    this.port = port;
    this.options = options;
    this.timers = options.timers ?? defaultTimers;
  }

  start(): PanelHandle {
    this.unsubReady = this.port.onReady((ctx) => this.handleReady(ctx));
    this.unsubConnection = this.port.onConnection((connection) => this.handleConnection(connection));
    this.render();
    return this;
  }

  // -- host events ----------------------------------------------------------

  private handleReady(ctx: HostReadyContext): void {
    applyHostReady(ctx, document.documentElement);
    const project = ctx.settings?.project ?? '';
    const host = ctx.settings?.host ?? '';
    const token = ctx.settings?.token ?? '';
    const changed =
      ctx.directory !== this.directory ||
      project !== this.settingsProject ||
      host !== this.settingsHost ||
      token !== this.settingsToken ||
      !this.started;
    this.directory = ctx.directory;
    this.settingsProject = project;
    this.settingsHost = host;
    this.settingsToken = token;
    if (changed) {
      this.started = true;
      this.refresh();
    } else {
      this.render();
    }
  }

  private handleConnection(connection: GuestConnection): void {
    // Only the built-in path uses the host-injected token; a custom host
    // authenticates with the `token` setting through the service.
    if (this.isCustomHost()) return;
    if (!connection.connected) {
      this.problem = disconnectedProblem(this.configuredHost());
      this.phase = 'problem';
      this.resolved = null;
      this.stopAllTimers();
      this.render();
      return;
    }
    if (this.problem?.kind === 'disconnected') this.refresh();
  }

  // -- public controls ------------------------------------------------------

  refresh(): void {
    if (this.disposed) return;
    const gen = ++this.generation;
    void this.runRefresh(gen);
  }

  setScope(scope: Scope): void {
    if (scope === this.scope) return;
    this.scope = scope;
    this.expandedId = null;
    this.downstreamPath = [];
    this.openJob = null;
    this.pipelines = [];
    this.refresh();
  }

  isPolling(): boolean {
    return this.pollTimer != null;
  }

  dispose(): void {
    this.disposed = true;
    this.stopAllTimers();
    this.unsubReady?.();
    this.unsubConnection?.();
    this.disposeHandles();
    clearNode(this.root);
    this.port.dispose();
  }

  // -- data flow ------------------------------------------------------------

  private async runRefresh(gen: number): Promise<void> {
    this.error = null;
    // A malformed setting, or a custom host with no token, never falls through to
    // a fetch (and never silently falls back to the built-in host).
    const badHost = this.hostSettingProblem();
    if (badHost) {
      this.problem = badHost;
      this.phase = 'problem';
      this.resolved = null;
      this.forgetHostData();
      this.stopAllTimers();
      this.render();
      return;
    }
    // Drop the previous host's data only when the Configured host actually
    // changed, so an ordinary refresh keeps the list, expansion and open log.
    const target = this.effectiveHost();
    if (target !== this.lastHost) {
      this.forgetHostData();
      this.lastHost = target;
    }
    const override = this.settingsProject.trim();
    if (!this.directory && !override) {
      this.problem = problemFor({ ok: false, failure: 'no-project' }, this.effectiveHost());
      this.phase = 'problem';
      this.resolved = null;
      this.stopAllTimers();
      this.render();
      return;
    }
    if (this.pipelines.length === 0) this.phase = 'loading';
    this.render();

    const resolution = await this.deriveProject();
    if (this.disposed || gen !== this.generation) return;
    if (!resolution.ok) {
      this.problem = problemFor(resolution, this.effectiveHost());
      this.phase = 'problem';
      this.resolved = null;
      this.stopAllTimers();
      this.render();
      return;
    }
    this.problem = null;
    this.derivedProject = resolution.project;
    this.redirectHops = 0;
    this.resolved = this.applyHealedProject(resolution);
    await this.loadPipelines(gen, this.resolved, true);
  }

  /**
   * The typed failure for the `host`/`token` settings, or null when they are
   * usable. A setting that cannot be a base URL is a hard failure, never a
   * silent fallback to the built-in host (US29).
   */
  private hostSettingProblem(): Problem | null {
    const raw = this.settingsHost.trim();
    if (raw === '') return null;
    const base = resolveCustomBase(raw);
    if (base == null) return customHostProblem(raw);
    if (hostOfBase(base) === this.configuredHost()) return null; // same-host shortcut: built-in path
    if (this.settingsToken.trim() === '') return customTokenProblem(hostOfBase(base));
    return null;
  }

  /**
   * Drop everything resolved from the previous Configured host before resolving
   * again, so a host switch never shows another host's Pipelines, Jobs or Traces
   * as current. Cached Jobs are keyed by pipeline id, which is not unique across
   * hosts.
   */
  private forgetHostData(): void {
    this.pipelines = [];
    this.bridges.clear();
    this.jobs.clear();
    this.traces.clear();
    this.openJob = null;
    this.expandedId = null;
    this.downstreamPath = [];
    this.updatedAt = null;
    this.healed.clear();
    this.derivedProject = null;
    this.redirectHops = 0;
    this.pendingHealNotice = null;
    this.healNotice = null;
  }

  private async deriveProject(): Promise<ProjectResolution> {
    const override = this.settingsProject.trim();
    const directory = this.directory;

    let gitConfig: string | null = null;
    let gitFile: string | null = null;
    let head: string | null = null;
    let worktrees: ResolveInput['worktrees'] = null;
    /** The primary checkout a Linked worktree's `.git` pointer names. */
    let worktreeRoot: string | null = null;

    if (directory) {
      try {
        gitConfig = (await this.port.readFile('.git/config')).content;
      } catch {
        gitConfig = null;
      }
      // In a linked worktree `.git` is a file, which is why the config read above fails.
      if (gitConfig == null) {
        try {
          gitFile = (await this.port.readFile('.git')).content;
        } catch {
          gitFile = null;
        }
      }
      // A Linked worktree's remote lives in the primary repository, outside the
      // open project, which the panel's own file capability cannot reach. Its
      // `.git` pointer still names that primary checkout, so the Ref's worktree
      // list can be found locally; the service is only needed for the remote
      // (ADR-0005). Without it the `linked-worktree` failure still stands.
      if (gitConfig == null && isLinkedWorktree(gitFile)) {
        worktreeRoot = worktreePrimaryDirectory(gitFile);
        gitConfig = await this.readWorktreeConfig(directory);
      }
      try {
        head = (await this.port.readFile('.git/HEAD')).content;
      } catch {
        head = null;
      }
      try {
        // Worktrees are listed per project, and a Linked worktree's directory is
        // not the registered project's — match the primary checkout the `.git`
        // pointer names, so the Ref still comes from this worktree's own entry.
        const projectDirectory = worktreeRoot ?? directory;
        const projects = await this.port.listProjects();
        const match = projects.projects.find((project) => samePath(project.directory, projectDirectory));
        if (match) worktrees = (await this.port.listWorktrees(match.id)).worktrees;
      } catch {
        worktrees = null;
      }
    }

    return resolveProject({
      directory,
      // Resolve against the Configured host, not the baked one, or a custom
      // host's own remote reads as a mismatch (ADR-0002).
      apiOrigin: this.isCustomHost() ? (this.customBase() ?? this.options.apiOrigin) : this.options.apiOrigin,
      projectOverride: override,
      gitConfig,
      gitFile,
      head,
      worktrees,
    });
  }

  /**
   * The primary repository's config for a Linked worktree, from the host-runtime
   * service, which may read outside the open project. Null when the service is
   * not granted, fails, or answers without a config — the `linked-worktree`
   * failure then stands. See ADR-0005.
   */
  private async readWorktreeConfig(directory: string): Promise<string | null> {
    try {
      const response = await this.port.serviceRequest({
        method: 'POST',
        path: SERVICE_GIT_CONFIG_PATH,
        body: JSON.stringify({ directory }),
      });
      if (response.status < 200 || response.status >= 300) return null;
      const parsed = JSON.parse(response.body) as { config?: unknown };
      return typeof parsed.config === 'string' ? parsed.config : null;
    } catch {
      return null;
    }
  }

  private async loadPipelines(
    gen: number,
    resolution: Extract<ProjectResolution, { ok: true }>,
    seedBridges = false,
  ): Promise<void> {
    const scope: Scope = resolution.ref ? this.scope : 'all';
    const result = await fetchPipelines(this.requester(), resolution.project, {
      scope,
      ref: resolution.ref,
    });
    if (this.disposed || gen !== this.generation) return;
    if (!result.ok) {
      if (
        result.failure.kind === 'redirect' &&
        this.healRedirect(gen, resolution, result.failure.target)
      ) {
        return;
      }
      this.handleFailure(result.failure);
      return;
    }
    this.pipelines = result.data;
    this.updatedAt = this.timers.now();
    this.phase = 'ready';
    this.error = null;
    this.promoteHealNotice();
    this.pruneDownstreamNode();
    if (seedBridges) {
      this.seedBridges(gen, resolution.project);
      // A manual refresh re-reads the expanded Pipeline's own Jobs. On a poll,
      // `refetchVisible` owns every refetch, so this must not double up.
      if (this.expandedId != null) {
        void this.loadJobs(gen, resolution.project, this.expandedId, true);
      }
    }
    this.render();
    this.schedulePoll();
  }

  /**
   * Fetch bridges once for each listed Pipeline as the list loads, so every
   * collapsed row can show its Downstream count. A poll does not re-seed; it
   * refetches only active or already-fanning-out Pipelines (`refetchVisible`).
   */
  private seedBridges(gen: number, project: string): void {
    for (const pipeline of this.pipelines) {
      const key = pipelineKey(project, pipeline.id);
      if (!this.bridges.has(key)) void this.loadBridges(gen, project, pipeline.id, false);
    }
  }

  /** Drop an expanded Downstream chain whose root Pipeline is no longer listed. */
  private pruneDownstreamNode(): void {
    const first = this.downstreamPath[0];
    if (!first) return;
    if (this.pipelines.some((pipeline) => pipeline.id === first.ancestors[0]?.pipelineId)) return;
    this.downstreamPath = [];
    this.openJob = null;
  }

  private handleFailure(failure: ClientFailure): void {
    if (
      failure.kind === 'disconnected' ||
      failure.kind === 'unauthorized' ||
      failure.kind === 'not-found' ||
      failure.kind === 'service'
    ) {
      this.problem = failureProblem(failure, this.effectiveHost());
      this.phase = 'problem';
      this.resolved = null;
      this.stopAllTimers();
      this.render();
      return;
    }
    if (failure.kind === 'redirect') {
      // A redirect that was not healed: an unrecognised move, a chain that ran
      // away, or a target on another host. Explain it rather than show a status.
      this.pendingHealNotice = null;
      if (this.derivedProject) this.healed.delete(this.derivedProject);
      this.problem = this.redirectProblem(failure.target);
      this.phase = 'problem';
      this.stopAllTimers();
      this.render();
      return;
    }
    this.error =
      failure.kind === 'network'
        ? 'Could not reach GitLab. Check the connection and try again.'
        : `GitLab returned an unexpected response (${failure.status}).`;
    this.render();
    if (this.hasActive()) this.schedulePoll();
    else this.stopAllTimers();
  }

  /** The resolved project with a cached healed target applied, when there is one for this path. */
  private applyHealedProject(
    resolution: Extract<ProjectResolution, { ok: true }>,
  ): Extract<ProjectResolution, { ok: true }> {
    const healed = this.healed.get(resolution.project);
    return healed ? { ...resolution, project: healed } : resolution;
  }

  /**
   * Follow a redirect to the project it names, when the target is on the
   * effective host and the chain is still short. Returns whether the caller
   * should stop because a retry was issued; false hands the failure on.
   */
  private healRedirect(
    gen: number,
    resolution: Extract<ProjectResolution, { ok: true }>,
    target: string | null,
  ): boolean {
    if (target == null || this.redirectHops >= MAX_REDIRECT_HOPS) return false;
    const project = projectFromRedirectTarget(target, this.effectiveHost());
    if (project == null) return false;
    this.redirectHops += 1;
    const from = this.derivedProject ?? resolution.project;
    this.healed.set(from, project);
    // The notice is only shown once the heal lands; see `promoteHealNotice`.
    this.pendingHealNotice = { from, to: project };
    this.resolved = { ...resolution, project };
    void this.loadPipelines(gen, this.resolved, true);
    return true;
  }

  /** A heal is only announced once its retry returned pipelines. */
  private promoteHealNotice(): void {
    if (!this.pendingHealNotice) return;
    this.healNotice = this.pendingHealNotice;
    this.pendingHealNotice = null;
  }

  /**
   * The state for a redirect the Panel could not heal. A parsed target means a
   * move it could not follow (a runaway chain, or another host); a null target
   * means the redirect was not a recognisable move at all.
   */
  private redirectProblem(target: string | null): Problem {
    const from = this.derivedProject ?? this.resolved?.project ?? '';
    const url = from ? `${this.webOrigin()}/${from}` : null;
    return target ? movedProblem(target, url) : redirectedProblem(url);
  }

  /** The origin a project's web page lives on, for opening a link in GitLab. */
  private webOrigin(): string {
    return this.customBase() ?? this.options.apiOrigin.replace(/\/+$/, '');
  }

  private togglePipeline(id: number): void {
    if (this.expandedId === id) {
      this.expandedId = null;
      this.downstreamPath = [];
      this.openJob = null;
      this.render();
      return;
    }
    this.expandedId = id;
    this.downstreamPath = [];
    const project = this.resolved?.project;
    if (project) {
      const key = pipelineKey(project, id);
      // Re-expanding retries a previous failure; a filled cache is reused.
      if (!Array.isArray(this.jobs.get(key))) void this.loadJobs(this.generation, project, id, false);
      if (!Array.isArray(this.bridges.get(key))) void this.loadBridges(this.generation, project, id, false);
    }
    this.render();
  }

  private async loadJobs(gen: number, project: string, pipelineId: number, silent: boolean): Promise<void> {
    const key = pipelineKey(project, pipelineId);
    if (!silent || !Array.isArray(this.jobs.get(key))) {
      this.jobs.set(key, 'loading');
      this.render();
    }
    const result = await fetchJobs(this.requester(), project, pipelineId);
    if (this.disposed || gen !== this.generation) return;
    if (result.ok) {
      this.jobs.set(key, result.data);
    } else if (silent) {
      // A background refresh must not discard jobs already on screen.
    } else {
      // A failed fetch is not an absence of jobs; say so rather than showing none.
      this.jobs.set(key, 'error');
    }
    this.render();
  }

  private async loadBridges(gen: number, project: string, pipelineId: number, silent: boolean): Promise<void> {
    const key = pipelineKey(project, pipelineId);
    const result = await fetchBridges(this.requester(), project, pipelineId);
    if (this.disposed || gen !== this.generation) return;
    if (result.ok) {
      this.bridges.set(key, triggerRows(result.data, project));
    } else if (silent) {
      // Keep the last known count rather than let a poll failure clear it.
    } else {
      // A failed bridge fetch is contained: the row shows no count, the list stands.
      this.bridges.set(key, 'error');
    }
    this.render();
    // A newly cached Downstream status can start the poll, e.g. a settled
    // mirror'd upstream whose downstream is still running. Poll-driven (silent)
    // refetches must not re-arm it, or a settled view would never stop.
    if (!silent && this.resolved) this.schedulePoll();
  }

  private openJobDrawer(project: string, pipelineId: number, jobId: number): void {
    this.openJob = { project, pipelineId, jobId };
    this.followTail = true;
    this.drawerScrollTop = 0;
    const key = jobKey(project, jobId);
    if (this.traces.has(key)) {
      this.render();
      return;
    }
    this.traceLoadingKey = key;
    this.render();
    void this.loadTrace(this.generation, project, jobId);
  }

  private async loadTrace(gen: number, project: string, jobId: number): Promise<void> {
    const key = jobKey(project, jobId);
    const result = await fetchTrace(this.requester(), project, jobId);
    if (this.disposed || gen !== this.generation) return;
    if (this.traceLoadingKey === key) this.traceLoadingKey = null;
    if (!result.ok) {
      // A failed fetch is not a missing log; keep the two apart.
      this.traces.set(key, { state: 'error', text: '', truncated: null });
    } else {
      this.traces.set(key, traceStateOf(result.data ?? ''));
    }
    this.render();
  }

  /**
   * While the open Job is still active, refresh just its trace on the poll — the log is otherwise
   * fetched once and cached, so a running Job would freeze at the moment it was opened. The Job's
   * own project is what it is fetched against, nested or not.
   */
  private refreshOpenTrace(gen: number): void {
    const reference = this.openJob;
    if (!reference) return;
    if (this.traceLoadingKey === jobKey(reference.project, reference.jobId)) return;
    const job = this.jobById(reference.project, reference.pipelineId, reference.jobId);
    if (!job || !isActiveStatus(job.status)) return;
    void this.loadTrace(gen, reference.project, reference.jobId);
  }

  /**
   * The live Job behind a drawer/`Start session` reference: looked up in its own
   * (project, pipeline id) Jobs entry, so a same job id in another project cannot
   * answer in its place.
   */
  private jobById(project: string, pipelineId: number, jobId: number): Job | undefined {
    const jobs = this.jobs.get(pipelineKey(project, pipelineId));
    if (!Array.isArray(jobs)) return undefined;
    return jobs.find((job) => job.id === jobId);
  }

  private closeDrawer(): void {
    this.openJob = null;
    this.followTail = true;
    this.drawerScrollTop = 0;
    this.render();
  }

  // -- session handoff ------------------------------------------------------

  /**
   * A session needs an open project it can act in. Without a directory there is
   * no checkout; without a resolved project there is no GitLab project to name.
   */
  private canHandoff(): boolean {
    return this.directory != null && this.resolved != null;
  }

  /**
   * Whether this Job offers **Start session**. Handoff seeds a session in the open checkout, so a
   * Job of a Downstream pipeline in *another* project is deliberately excluded: the checkout cannot
   * fix that project. Only the root Pipeline and its same-project child pipelines qualify. See the
   * Handoff section of `.scratch/downstream-pipelines/spec.md`.
   */
  private canHandoffJob(project: string): boolean {
    return this.resolved != null && samePath(project, this.resolved.project);
  }

  /**
   * Start a new session from a failed Job, seeded with its identity, links and
   * Trace tail. The Panel's only outbound action; nothing is sent to GitLab.
   */
  private startHandoff(project: string, pipelineId: number, jobId: number): void {
    if (!this.canHandoff() || !this.canHandoffJob(project) || this.handoffJobId != null) return;
    const job = this.jobById(project, pipelineId, jobId);
    if (!job || !isHandoffJob(job)) return;
    const pipeline = this.pipelineFor(project, pipelineId);
    this.handoffJobId = jobId;
    this.handoffError = null;
    this.render();
    void this.runHandoff(project, pipeline, job);
  }

  /** The Pipeline behind a (project, pipeline id), from the list or an expanded card. */
  private pipelineFor(project: string, pipelineId: number): Pipeline | null {
    const local = this.pipelines.find((candidate) => candidate.id === pipelineId);
    if (local && samePath(project, this.resolved?.project ?? '')) return local;
    const downstream = this.triggerFor(project, pipelineId)?.downstream;
    if (downstream) {
      return { ...downstream, started_at: null, finished_at: null, duration: null };
    }
    return local ?? null;
  }

  /** The Trigger row in `project` whose card is the pipeline `pipelineId`. */
  private triggerFor(project: string, pipelineId: number): TriggerRow | undefined {
    for (const [key, value] of this.bridges) {
      if (!Array.isArray(value)) continue;
      if (key.split('\u0000')[0] !== project) continue;
      const match = value.find((row) => row.downstream?.id === pipelineId);
      if (match) return match;
    }
    return undefined;
  }

  private async runHandoff(project: string, pipeline: Pipeline | null, job: Job): Promise<void> {
    const trace = await this.traceFor(project, job);
    if (this.disposed) return;
    if (trace == null) {
      this.finishHandoff('Could not read the job log to hand off. The session was not started.');
      return;
    }
    let sent: StartSessionSent;
    try {
      const result = await this.port.startSession(
        buildHandoff({
          providerId: PANEL_ID,
          project,
          pipeline,
          job,
          trace,
        }),
      );
      sent = result.sent;
    } catch {
      this.finishHandoff('Could not start a session for this job.');
      return;
    }
    if (this.disposed) return;
    this.finishHandoff(sent === 'sent' ? null : handoffFailure(sent));
  }

  /** The Job's Trace: the cached one, or a fresh fetch. null when it cannot be read. */
  private async traceFor(project: string, job: Job): Promise<string | null> {
    const key = jobKey(project, job.id);
    const cached = this.traces.get(key);
    if (cached?.state === 'ready') return cached.text;
    const result = await fetchTrace(this.requester(), project, job.id);
    if (!result.ok) return null;
    const text = result.data ?? '';
    this.traces.set(key, traceStateOf(text));
    return text;
  }

  private finishHandoff(error: string | null): void {
    this.handoffJobId = null;
    this.handoffError = error;
    this.render();
  }

  // -- polling --------------------------------------------------------------

  /**
   * Every Status the Panel keeps polling for: the listed Pipelines, every cached build Job, and
   * every cached Trigger row's *contributing* status — its Downstream pipeline's where it has one,
   * its own otherwise. Without the Trigger rows a mirror'd upstream that has already settled would
   * stop the poll while its Downstream pipeline is still running.
   */
  private visibleStatuses(): string[] {
    const statuses: string[] = this.pipelines.map((pipeline) => pipeline.status);
    for (const value of this.jobs.values()) {
      if (Array.isArray(value)) for (const job of value) statuses.push(job.status);
    }
    for (const value of this.bridges.values()) {
      if (Array.isArray(value)) for (const row of value) statuses.push(row.status);
    }
    return statuses;
  }

  private hasActive(): boolean {
    return shouldPoll(this.visibleStatuses());
  }

  private schedulePoll(): void {
    this.stopPollTimer();
    const now = this.timers.now();
    if (this.pollStartedAt == null) this.pollStartedAt = now;
    const delay = nextPollDelay(this.visibleStatuses(), { elapsedMs: now - this.pollStartedAt });
    if (delay == null) {
      this.pollStartedAt = null;
      return;
    }
    this.pollTimer = this.timers.setTimeout(() => {
      this.pollTimer = null;
      void this.pollOnce();
    }, delay);
  }

  private async pollOnce(): Promise<void> {
    if (this.disposed || !this.resolved) return;
    const gen = ++this.generation;
    this.redirectHops = 0;
    await this.loadPipelines(gen, this.resolved);
    if (gen !== this.generation) return;
    this.refreshOpenTrace(gen);
    await this.refetchVisible(gen);
    // `loadPipelines` armed the next poll from the *pre-refetch* statuses. Now
    // that bridges and Jobs are fresh, re-evaluate: this is what lets a settled
    // mirror'd upstream stop once its downstream has settled too.
    if (gen === this.generation) this.schedulePoll();
  }

  /**
   * On the poll, refetch bridges and Jobs only for Pipelines that are visible and worth a call: the
   * expanded root, an expanded Downstream card, or a still-active Pipeline (whose count may move).
   * An untouched, settled row is not fetched; its badge reads from the cache. Bridges are refetched
   * for a Pipeline known to fan out even when it has settled, so a late Downstream is seen.
   */
  private async refetchVisible(gen: number): Promise<void> {
    if (!this.resolved) return;
    const project = this.resolved.project;
    const targets = new Map<string, { target: PipelineKey; status: string; expanded: boolean }>();

    const add = (target: PipelineKey, status: string, expanded: boolean): void => {
      const key = pipelineKey(target.project, target.pipelineId);
      const prior = targets.get(key);
      // An expanded target also being active stays expanded.
      if (!prior || expanded) targets.set(key, { target, status, expanded });
    };

    for (const pipeline of this.pipelines) {
      const expanded = pipeline.id === this.expandedId;
      const entry = this.bridges.get(pipelineKey(project, pipeline.id));
      const hasDownstream = Array.isArray(entry) ? downstreamCount(entry) > 0 : false;
      // Bridges move for active Pipelines and for any known to fan out; Jobs only
      // for the expanded Pipeline or a still-active one. Other rows read the cache.
      if (expanded || isActiveStatus(pipeline.status) || hasDownstream) {
        add({ project, pipelineId: pipeline.id }, pipeline.status, expanded);
      }
    }
    for (const node of this.downstreamPath) {
      const entry = this.bridges.get(pipelineKey(node.project, node.pipelineId));
      const row = Array.isArray(entry) ? entry[0] : undefined;
      add({ project: node.project, pipelineId: node.pipelineId }, row?.status ?? this.jobsStatus(node), true);
    }

    const pending: Array<Promise<void>> = [];
    for (const { target, status, expanded } of targets.values()) {
      const key = pipelineKey(target.project, target.pipelineId);
      if (expanded || isActiveStatus(status) || this.hasCachedDownstream(key)) {
        pending.push(this.loadBridges(gen, target.project, target.pipelineId, true));
      }
      if ((expanded || isActiveStatus(status)) && Array.isArray(this.jobs.get(key))) {
        pending.push(this.loadJobs(gen, target.project, target.pipelineId, true));
      }
    }
    await Promise.all(pending);
  }

  private hasCachedDownstream(key: string): boolean {
    const entry = this.bridges.get(key);
    return Array.isArray(entry) && downstreamCount(entry) > 0;
  }

  /** A Downstream node's own status, else 'success' so it is not seen as active. */
  private jobsStatus(node: DownstreamNode): string {
    const jobs = this.jobs.get(pipelineKey(node.project, node.pipelineId));
    if (Array.isArray(jobs)) {
      for (const job of jobs) if (isActiveStatus(job.status)) return 'running';
    }
    return 'success';
  }

  private stopPollTimer(): void {
    if (this.pollTimer != null) {
      this.timers.clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private startTicker(): void {
    if (this.tickTimer != null) return;
    this.tickTimer = this.timers.setInterval(() => this.updateLive(), LIVE_TICK_MS);
  }

  private stopTicker(): void {
    if (this.tickTimer != null) {
      this.timers.clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private stopAllTimers(): void {
    this.stopPollTimer();
    this.stopTicker();
    this.pollStartedAt = null;
  }

  private updateLive(): void {
    const now = this.timers.now();
    for (const node of Array.from(this.root.querySelectorAll<HTMLElement>('[data-live]'))) {
      const start = Number(node.dataset.start);
      if (!Number.isFinite(start)) continue;
      if (node.dataset.live === 'ago') {
        node.textContent = ago(start, now);
      } else if (node.dataset.live === 'elapsed') {
        const end = node.dataset.end ? Number(node.dataset.end) : now;
        node.textContent = elapsed(start, Number.isFinite(end) ? end : now);
      }
    }
  }

  // -- rendering ------------------------------------------------------------

  // -- transport mode -------------------------------------------------------

  /**
   * A **Configured host** is either the **Built-in host** (empty setting, or one
   * naming the built-in host) or a custom GitLab from the `host` setting. See
   * ADR-0002.
   */
  private configuredHost(): string {
    return hostOfOrigin(this.options.apiOrigin);
  }

  /** The base URL for a custom host, or null when the setting is unusable. */
  private customBase(): string | null {
    return resolveCustomBase(this.settingsHost);
  }

  /** Whether a custom host is set and usable: a valid base that is not the built-in host. */
  private isCustomHost(): boolean {
    const base = this.customBase();
    if (base == null) return false;
    return hostOfBase(base) !== this.configuredHost();
  }

  /** The GitLab the Panel is actually talking to, built-in or custom. */
  private effectiveHost(): string {
    const base = this.customBase();
    return base != null && this.isCustomHost() ? hostOfBase(base) : this.configuredHost();
  }

  /**
   * The one call every GitLab fetch makes. Built-in mode uses the host request
   * bridge (host-injected token); custom-host mode goes through the proxy
   * service, carrying the base URL and the `token` setting in the service
   * request's body. (Only the base URL rides in the query, for the service's
   * logs; the token never leaves the body.)
   */
  private requester(): Requester {
    const base = this.isCustomHost() ? this.customBase() : null;
    if (base != null) {
      const token = this.settingsToken.trim();
      return async (request) => {
        const response = await this.port.serviceRequest({
          method: request.method ?? 'GET',
          path: SERVICE_PATH,
          query: { baseUrl: base },
          body: JSON.stringify({
            baseUrl: base,
            token,
            method: request.method ?? 'GET',
            path: request.path,
            query: request.query ?? {},
          }),
        });
        return proxyResponse(response);
      };
    }
    return fromHostPort(this.port);
  }

  private disposeHandles(): void {
    for (const handle of this.handles.splice(0)) handle.dispose();
  }

  private render(): void {
    if (this.disposed) return;
    this.disposeHandles();
    if (this.scrollEl) this.scrollTop = this.scrollEl.scrollTop;
    if (this.drawerEl) this.drawerScrollTop = this.drawerEl.scrollTop;
    clearNode(this.root);
    this.root.className = 'gp';

    const progress = el('div', 'gp-progress');
    if (!this.isFirstLoad()) progress.hidden = true;
    this.root.append(progress);

    this.root.append(this.renderHeader());
    const handoffNotice = this.renderHandoffNotice();
    if (handoffNotice) this.root.append(handoffNotice);
    const healNotice = this.renderHealNotice();
    if (healNotice) this.root.append(healNotice);

    this.scrollEl = el('div', 'gp-scroll');
    const pad = el('div', 'gp-pad');
    pad.append(...this.renderContent());
    this.scrollEl.append(pad);
    this.scrollEl.addEventListener('scroll', () => {
      this.scrollTop = this.scrollEl?.scrollTop ?? 0;
    });
    this.root.append(this.scrollEl);

    this.root.append(this.renderFooter());
    if (this.openJob) this.root.append(this.renderDrawer(this.openJob));

    if (this.scrollEl) this.scrollEl.scrollTop = this.scrollTop;
    if (this.drawerEl) {
      this.drawerEl.scrollTop = this.followTail ? this.drawerEl.scrollHeight : this.drawerScrollTop;
    }
    this.updateLive();
    this.syncTicker();
  }

  private isFirstLoad(): boolean {
    return (this.phase === 'init' || this.phase === 'loading') && this.pipelines.length === 0;
  }

  private syncTicker(): void {
    const live = this.resolved != null && this.updatedAt != null;
    if (live && this.tickTimer == null) this.startTicker();
    if (!live) this.stopTicker();
  }

  private renderHeader(): HTMLElement {
    const head = el('div', 'gp-head');
    const row = el('div', 'gp-head-row');

    const brand = el('span', 'gp-brand');
    const mark = el('span', 'gp-brand-mark');
    mark.innerHTML = GITLAB_LINE;
    brand.append(mark, el('span', 'gp-brand-title', 'Pipelines'));
    row.append(brand, el('span', 'gp-spacer'));

    const updated = el('span', 'gp-updated');
    if (this.resolved == null || this.updatedAt == null) {
      updated.hidden = true;
    } else {
      const dot = el('span', 'gp-dot');
      dot.dataset.idle = this.hasActive() ? 'false' : 'true';
      const text = el('span');
      text.dataset.live = 'ago';
      text.dataset.start = String(this.updatedAt);
      text.textContent = ago(this.updatedAt, this.timers.now());
      updated.append(dot, text);
    }
    row.append(updated);

    const refresh = el('button', 'gp-iconbtn');
    refresh.type = 'button';
    refresh.setAttribute('aria-label', 'Refresh');
    refresh.title = 'Refresh';
    refresh.innerHTML = REFRESH_ICON;
    if (this.isFirstLoad()) refresh.dataset.spinning = 'true';
    refresh.addEventListener('click', () => this.refresh());
    row.append(refresh);
    head.append(row);

    const projectPath = el('div', 'gp-project');
    if (this.isCustomHost()) {
      const tag = el('span', 'gp-host-tag', 'Custom host');
      tag.dataset.mode = 'custom';
      projectPath.append(tag);
    }
    const pathText = el('span', 'gp-project-path');
    if (this.resolved) {
      pathText.textContent = `${this.resolved.host}/${this.resolved.project}`;
    } else {
      pathText.hidden = true;
    }
    projectPath.append(pathText);
    if (!this.resolved && !this.isCustomHost()) projectPath.hidden = true;
    head.append(projectPath);

    head.append(this.renderScope());
    return head;
  }

  private renderScope(): HTMLElement {
    const scope = el('div', 'gp-scope');
    const show = this.resolved != null && this.resolved.ref != null && this.problem == null;
    if (!show) {
      scope.hidden = true;
      return scope;
    }
    const tabsRoot = el('div');
    scope.append(tabsRoot);
    this.handles.push(
      mountTabs(tabsRoot, {
        items: [
          { id: 'branch', label: 'Branch' },
          { id: 'all', label: 'All refs' },
        ],
        activeId: this.scope,
        trackBackground: true,
        onChange: (id) => this.setScope(id as Scope),
      }),
    );
    const ref = this.scope === 'branch' ? (this.resolved?.ref ?? '') : 'all refs';
    scope.append(el('span', 'gp-scope-ref', ref));
    return scope;
  }

  private renderContent(): Node[] {
    const nodes: Node[] = [];
    if (this.error) {
      const notice = el('div', 'gp-state');
      notice.append(el('p', 'gp-state-body', this.error));
      const actions = el('div', 'gp-state-actions');
      const retryRoot = el('div');
      this.handles.push(
        mountButton(retryRoot, { label: 'Retry', variant: 'outline', size: 'sm', onClick: () => this.refresh() }),
      );
      actions.append(retryRoot);
      notice.append(actions);
      nodes.push(notice);
    }

    if (this.problem) {
      nodes.push(this.renderProblem(this.problem));
      return nodes;
    }
    if (this.isFirstLoad()) {
      nodes.push(this.renderSkeleton());
      return nodes;
    }
    if (this.pipelines.length === 0) {
      nodes.push(this.renderEmpty());
      return nodes;
    }

    const list = el('div', 'gp-list');
    for (const pipeline of this.pipelines) list.append(this.renderPipeline(pipeline));
    nodes.push(list);
    return nodes;
  }

  private renderProblem(problem: Problem): HTMLElement {
    const state = el('div', 'gp-state');
    const title = el('h2', 'gp-state-title', problem.title);
    state.append(title, el('p', 'gp-state-body', problem.body));
    if (problem.detail) state.append(el('p', 'gp-state-detail', problem.detail));
    if (problem.hint) state.append(el('p', 'gp-state-hint', problem.hint));
    const actions = el('div', 'gp-state-actions');
    if (problem.action) {
      const openRoot = el('div');
      const { label, url } = problem.action;
      this.handles.push(
        mountButton(openRoot, {
          label,
          variant: 'default',
          size: 'sm',
          onClick: () => void this.port.openUrl(url),
        }),
      );
      actions.append(openRoot);
    }
    const retry = el('div');
    this.handles.push(
      mountButton(retry, { label: 'Refresh', variant: 'outline', size: 'sm', onClick: () => this.refresh() }),
    );
    actions.append(retry);
    state.append(actions);
    return state;
  }

  private renderEmpty(): HTMLElement {
    const host = el('div');
    const onBranch = this.scope === 'branch' && this.resolved?.ref != null;
    this.handles.push(
      mountEmpty(host, {
        title: onBranch ? 'No pipelines for this ref' : 'No pipelines yet',
        body: onBranch
          ? `Nothing has run on ${this.resolved?.ref}. It may be a fresh branch.`
          : 'This project has no pipelines to show.',
        action: onBranch
          ? { label: 'Show all refs', onClick: () => this.setScope('all') }
          : { label: 'Refresh', onClick: () => this.refresh() },
      }),
    );
    return host;
  }

  private renderSkeleton(): HTMLElement {
    const skeleton = el('div', 'gp-skel');
    for (let index = 0; index < 5; index += 1) {
      const row = el('div', 'gp-skel-row');
      const short = el('span', 'gp-skel-line');
      short.dataset.w = 'short';
      const grow = el('span', 'gp-skel-line');
      grow.dataset.w = 'grow';
      row.append(short, grow);
      skeleton.append(row);
    }
    return skeleton;
  }

  private renderPipeline(pipeline: Pipeline): HTMLElement {
    const project = this.resolved?.project ?? '';
    const open = this.expandedId === pipeline.id;
    const item = el('div', 'gp-item');
    item.dataset.open = open ? 'true' : 'false';

    const row = el('button', 'gp-row');
    row.type = 'button';
    row.setAttribute('aria-expanded', String(open));

    const caret = el('span', 'gp-caret');
    caret.innerHTML = CHEVRON;
    row.append(caret, statusIcon(statusInfo(pipeline.status), 15));

    const main = el('span', 'gp-row-main');
    const line = el('span', 'gp-row-line');
    line.append(el('span', 'gp-ref', pipeline.ref || '—'));
    line.append(el('span', 'gp-sha', shortSha(pipeline.sha)));
    main.append(line, el('div', 'gp-row-sub', pipelineSubtitle(pipeline)));
    row.append(main, this.timingSpan(pipeline));

    const count = this.collapsedDownstreamCount(project, pipeline.id);
    if (count > 0) row.append(el('span', 'gp-downstream-badge', `↳ ${count} downstream`));

    row.addEventListener('click', () => this.togglePipeline(pipeline.id));
    item.append(row);

    if (open) {
      const jobsWrap = el('div', 'gp-jobs');
      if (pipeline.web_url) jobsWrap.append(this.renderExternalLink('gp-jobs-link', 'View pipeline in GitLab', pipeline.web_url));
      const entry = this.bridges.get(pipelineKey(project, pipeline.id));
      jobsWrap.append(this.renderJobsBody(project, pipeline.id, entry));
      if (entry === 'error') jobsWrap.append(el('div', 'gp-row-sub', 'Could not load downstream pipelines.'));
      item.append(jobsWrap);
    }
    return item;
  }

  /** The collapsed row's badge; zero, unknown, or a failed fetch show nothing. */
  private collapsedDownstreamCount(project: string, pipelineId: number): number {
    const entry = this.bridges.get(pipelineKey(project, pipelineId));
    return Array.isArray(entry) ? downstreamCount(entry) : 0;
  }

  /** A Pipeline's Jobs by Stage, with the loading / error / empty distinctions kept apart. */
  private renderJobsBody(
    project: string,
    pipelineId: number,
    bridges: BridgeEntry | undefined,
    context: 'root' | 'downstream' = 'root',
  ): HTMLElement {
    const wrap = el('div', 'gp-jobs-body');
    const value = this.jobs.get(pipelineKey(project, pipelineId));
    if (value === undefined || value === 'loading') {
      wrap.append(el('div', 'gp-row-sub', 'Loading jobs…'));
      return wrap;
    }
    if (value === 'error') {
      // A failed fetch is not an absence of jobs. A downstream project that
      // cannot be read is its own state, distinct from the root's retry hint.
      wrap.append(
        el(
          'div',
          'gp-row-sub',
          context === 'downstream'
            ? 'Could not read this downstream project. It may be private, or the token may not reach it.'
            : 'Could not load jobs. Collapse and reopen to retry.',
        ),
      );
      return wrap;
    }
    if (bridges === 'error' && context === 'downstream') {
      wrap.append(el('div', 'gp-row-sub', 'Could not read this downstream project’s own triggers.'));
    }
    const triggers = Array.isArray(bridges) ? bridges : [];
    if (value.length === 0 && triggers.length === 0 && bridges !== 'error') {
      wrap.append(el('div', 'gp-row-sub', 'No jobs reported yet.'));
      return wrap;
    }
    for (const group of groupJobsByStage(value, triggers)) {
      wrap.append(this.renderStage(project, pipelineId, group));
    }
    return wrap;
  }

  private renderExternalLink(className: string, label: string, url: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.className = className;
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = label;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      void this.port.openUrl(url);
    });
    return link;
  }

  private timingSpan(pipeline: Pipeline): HTMLElement {
    const active = isActiveStatus(pipeline.status);
    const started = toEpoch(pipeline.started_at);
    if (active && started != null) {
      const finished = toEpoch(pipeline.finished_at);
      const span = el('span', 'gp-row-meta');
      span.dataset.live = 'elapsed';
      span.dataset.start = String(started);
      if (finished != null) span.dataset.end = String(finished);
      span.textContent = elapsed(started, finished ?? this.timers.now());
      return span;
    }
    const finished = toEpoch(pipeline.finished_at);
    if (finished != null && pipeline.duration != null) {
      return el('span', 'gp-row-meta', duration(pipeline.duration));
    }
    const created = toEpoch(pipeline.created_at);
    if (created != null) {
      const span = el('span', 'gp-row-meta');
      span.dataset.live = 'ago';
      span.dataset.start = String(created);
      span.textContent = ago(created, this.timers.now());
      return span;
    }
    return el('span', 'gp-row-meta', '—');
  }

  private jobMeta(job: Job): HTMLElement {
    const started = toEpoch(job.started_at);
    if (job.status === 'running' && started != null) {
      const meta = el('span', 'gp-job-meta');
      meta.dataset.live = 'elapsed';
      meta.dataset.start = String(started);
      meta.textContent = elapsed(started, this.timers.now());
      return meta;
    }
    const finished = toEpoch(job.finished_at);
    if (job.duration != null && finished != null) return el('span', 'gp-job-meta', duration(job.duration));
    if (job.status === 'running') return el('span', 'gp-job-meta', 'running');
    return el('span', 'gp-job-meta', jobStatusInfo(job).label.toLowerCase());
  }

  private renderStage(project: string, pipelineId: number, group: StageGroup): HTMLElement {
    const stage = el('div', 'gp-stage');
    const head = el('div', 'gp-stage-head');
    head.append(
      el('span', 'gp-stage-name', group.stage),
      el('span', 'gp-stage-count', `${group.done}/${group.total}`),
      el('span', 'gp-stage-line'),
    );
    stage.append(head);
    for (const job of group.jobs) {
      const row = el('div', 'gp-job');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      if (this.openJob?.project === project && this.openJob.jobId === job.id) row.dataset.selected = 'true';
      row.setAttribute('aria-label', `${job.name}, ${jobStatusInfo(job).label}`);
      row.append(statusIcon(jobStatusInfo(job), 13), el('span', 'gp-job-name', job.name));
      row.append(this.jobMeta(job));
      row.addEventListener('click', () => this.openJobDrawer(project, pipelineId, job.id));
      row.addEventListener('keydown', (event) => {
        // Only when the row itself is focused: the nested action button owns its
        // own Enter/Space, and this must not swallow it.
        if (event.target !== row) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.openJobDrawer(project, pipelineId, job.id);
        }
      });
      // Start session stays inside the open project: a multi-project Downstream
      // job renders without it, since the checkout cannot fix another project.
      if (isHandoffJob(job) && this.canHandoffJob(project)) row.append(this.renderHandoffAction(project, pipelineId, job));
      stage.append(row);
    }
    for (const trigger of group.triggers) stage.append(this.renderTriggerRow(project, pipelineId, trigger));
    return stage;
  }

  /** A Trigger job as a row carrying its Downstream pipeline's Status, then its card. */
  private renderTriggerRow(project: string, pipelineId: number, trigger: TriggerRow): HTMLElement {
    const info = triggerStateInfo(trigger.state, trigger.status);
    const row = el('div', 'gp-job gp-trigger');
    row.dataset.trigger = 'true';
    row.append(statusIcon(info, 13), el('span', 'gp-job-name', trigger.name));
    row.append(el('span', 'gp-job-meta', info.label.toLowerCase()));
    if (!trigger.downstream) return row;

    const card = this.renderDownstreamCard(project, pipelineId, trigger);
    const rowWrap = el('div', 'gp-trigger-wrap');
    rowWrap.append(row, card);
    return rowWrap;
  }

  /** The card beneath a Trigger row: its Downstream pipeline, and its Jobs when opened. */
  private renderDownstreamCard(
    project: string,
    pipelineId: number,
    trigger: TriggerRow,
    parentNode?: DownstreamNode,
  ): HTMLElement {
    const downstream = trigger.downstream;
    const card = el('div', 'gp-downstream-card');
    if (!downstream) return card;

    card.append(el('div', 'gp-downstream-label', downstreamLabel(downstream, project)));
    const meta = el('div', 'gp-downstream-meta');
    // The spec gives the card its own Status, so it reads correctly once expanded
    // by itself rather than only via the Trigger row's glyph.
    meta.append(statusIcon(statusInfo(downstream.status), 13));
    meta.append(el('span', 'gp-ref', downstream.ref || '—'));
    meta.append(el('span', 'gp-sha', shortSha(downstream.sha)));
    meta.append(el('span', 'gp-downstream-iid', `#${downstream.iid}`));
    card.append(meta);
    if (downstream.web_url) {
      card.append(this.renderExternalLink('gp-jobs-link', 'View pipeline in GitLab', downstream.web_url));
    }

    // The card's own project is where the Downstream pipeline lives, read from
    // its URL. When the URL cannot be parsed there is no project to read, so the
    // card is display-only: it never fetches jobs or offers Start session.
    const projectPath = downstreamProject(downstream);
    const parent = parentNode ?? this.nodeFor(project, pipelineId);
    const cardProject = projectPath ?? '';

    if (projectPath && this.nodeFor(cardProject, downstream.id)) {
      const entry = this.bridges.get(pipelineKey(cardProject, downstream.id));
      card.append(this.renderJobsBody(cardProject, downstream.id, entry, 'downstream'));
      this.renderNestedTriggerCards(card, cardProject, downstream.id, parent);
    } else {
      const expandable =
        projectPath != null && this.cardCanExpand(project, pipelineId, downstream.id, cardProject, parent);
      const button = el('button', 'gp-downstream-open');
      button.type = 'button';
      button.textContent = expandable ? 'Show jobs' : 'Continue in GitLab';
      button.setAttribute('aria-label', `${button.textContent} — ${downstreamLabel(downstream, project)}`);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (expandable) this.toggleDownstream(project, pipelineId, cardProject, downstream.id);
        else if (downstream.web_url) void this.port.openUrl(downstream.web_url);
      });
      card.append(button);
      if (!expandable && !downstream.web_url) button.disabled = true;
    }
    return card;
  }

  /** The open node for a pipeline, or undefined when it is not expanded. */
  private nodeFor(project: string, pipelineId: number): DownstreamNode | undefined {
    return this.downstreamPath.find(
      (node) => node.pipelineId === pipelineId && samePath(node.project, project),
    );
  }

  /** Render any nested Trigger rows' cards, for an open Downstream pipeline. */
  private renderNestedTriggerCards(
    parent: HTMLElement,
    project: string,
    pipelineId: number,
    node: DownstreamNode | undefined,
  ): void {
    const entry = this.bridges.get(pipelineKey(project, pipelineId));
    if (!Array.isArray(entry)) return;
    for (const trigger of entry) {
      if (trigger.downstream) parent.append(this.renderDownstreamCard(project, pipelineId, trigger, node));
    }
  }

  /**
   * Whether a card expands here. Its parent is the root Pipeline (generation 0)
   * or the open node it hangs under; expansion stops at the generation cap and
   * refuses a pipeline already on the path — the root pipeline, the parent
   * itself, or any of the parent's ancestors.
   */
  private cardCanExpand(
    project: string,
    pipelineId: number,
    downstreamId: number,
    downstreamProject: string,
    parentNode: DownstreamNode | undefined,
  ): boolean {
    const generation = parentNode?.generation ?? 0;
    if (!canExpand(generation)) return false;
    const next: PipelineKey = { project: downstreamProject, pipelineId: downstreamId };
    for (const ancestor of this.openPathFor(project, pipelineId, parentNode)) {
      if (ancestor.project === next.project && ancestor.pipelineId === next.pipelineId) return false;
    }
    return true;
  }

  /** Every pipeline already on the open path down to the card's parent, inclusive. */
  private openPathFor(
    project: string,
    pipelineId: number,
    parentNode: DownstreamNode | undefined,
  ): PipelineKey[] {
    const parent: PipelineKey = { project, pipelineId };
    if (parentNode) return [...parentNode.ancestors, parent];
    const root: PipelineKey = {
      project: this.resolved?.project ?? '',
      pipelineId: this.expandedId ?? -1,
    };
    return [root, parent];
  }

  private toggleDownstream(
    parentProject: string,
    parentPipelineId: number,
    downstreamProject: string,
    downstreamId: number,
  ): void {
    const parentNode = this.nodeFor(parentProject, parentPipelineId);
    const index = parentNode ? this.downstreamPath.indexOf(parentNode) : -1;
    // A deeper card opened from an ancestor replaces the tail below it, so one
    // open path is kept: root-most first, no branches.
    const prefix = parentNode ? this.downstreamPath.slice(0, index + 1) : [];
    const generation = (parentNode?.generation ?? 0) + 1;
    const ancestors = [...(parentNode?.ancestors ?? []), { project: parentProject, pipelineId: parentPipelineId }];
    const node: DownstreamNode = { project: downstreamProject, pipelineId: downstreamId, generation, ancestors };
    this.downstreamPath = [...prefix, node];
    this.openJob = null;
    const key = pipelineKey(downstreamProject, downstreamId);
    // Re-opening retries a previous failure; a filled cache is reused.
    if (!Array.isArray(this.jobs.get(key))) void this.loadJobs(this.generation, downstreamProject, downstreamId, false);
    if (!Array.isArray(this.bridges.get(key))) void this.loadBridges(this.generation, downstreamProject, downstreamId, false);
    this.render();
  }

  /** The "Start session" affordance for a failed Job, on its row or in the drawer. */
  private renderHandoffAction(project: string, pipelineId: number, job: Job): HTMLElement {
    const button = el('button', 'gp-handoff');
    button.type = 'button';
    const busy = this.handoffJobId === job.id;
    const canHandoff = this.canHandoff();
    button.disabled = !canHandoff || busy;
    button.textContent = busy ? 'Starting…' : 'Start session';
    button.title = canHandoff
      ? 'Start a session for this failed job'
      : this.directory == null
        ? 'Open a project to start a session — a session needs a checkout to fix.'
        : 'This project could not be resolved, so a session cannot be started.';
    button.setAttribute('aria-label', `${button.textContent} — ${job.name}`);
    if (canHandoff && !busy) {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.startHandoff(project, pipelineId, job.id);
      });
    }
    return button;
  }

  /** The one-time notice after a heal, naming the old path and the target. */
  private renderHealNotice(): HTMLElement | null {
    if (!this.healNotice) return null;
    const host = this.effectiveHost();
    const { from, to } = this.healNotice;
    const notice = el('div', 'gp-notice');
    notice.setAttribute('role', 'status');
    notice.append(el('span', 'gp-notice-text', `Showing ${host}/${from} as ${host}/${to}.`));
    const dismiss = el('button', 'gp-notice-close');
    dismiss.type = 'button';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => {
      this.healNotice = null;
      this.render();
    });
    notice.append(dismiss);
    return notice;
  }

  private renderHandoffNotice(): HTMLElement | null {
    if (!this.handoffError) return null;
    const notice = el('div', 'gp-notice');
    notice.setAttribute('role', 'alert');
    notice.append(el('span', 'gp-notice-text', this.handoffError));
    const dismiss = el('button', 'gp-notice-close');
    dismiss.type = 'button';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => this.finishHandoff(null));
    notice.append(dismiss);
    return notice;
  }

  private renderDrawer(reference: OpenJob): HTMLElement {
    const drawer = el('div', 'gp-drawer');
    const job = this.jobById(reference.project, reference.pipelineId, reference.jobId);

    const head = el('div', 'gp-drawer-head');
    const title = el('span', 'gp-drawer-title', job ? `${job.name} · ${jobStatusInfo(job).label}` : `Job #${reference.jobId}`);
    head.append(title);
    if (job?.web_url) head.append(this.renderExternalLink('gp-drawer-link', 'View full log in GitLab', job.web_url));
    // Start session only inside the open project, matching the row's own gating.
    if (job && isHandoffJob(job) && this.canHandoffJob(reference.project)) {
      head.append(this.renderHandoffAction(reference.project, reference.pipelineId, job));
    }
    const close = el('button', 'gp-drawer-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close log');
    close.title = 'Close';
    close.innerHTML = CLOSE_ICON;
    close.addEventListener('click', () => this.closeDrawer());
    head.append(close);
    drawer.append(head);

    const entry = this.traces.get(jobKey(reference.project, reference.jobId));
    if (!entry) {
      this.drawerEl = null;
      drawer.append(el('div', 'gp-drawer-empty', 'Loading log…'));
      return drawer;
    }
    if (entry.state === 'missing') {
      this.drawerEl = null;
      drawer.append(el('div', 'gp-drawer-empty', 'No log output yet — the job has not started.'));
      return drawer;
    }
    if (entry.state === 'error') {
      this.drawerEl = null;
      drawer.append(el('div', 'gp-drawer-empty', 'Could not load the log. Close and reopen to retry.'));
      return drawer;
    }
    if (entry.truncated) drawer.append(truncationNotice(entry.truncated));
    const pre = el('pre', 'gp-drawer-body');
    pre.textContent = tailLines(entry.text, LOG_MAX_LINES).join('\n');
    pre.addEventListener('scroll', () => {
      this.drawerScrollTop = pre.scrollTop;
      this.followTail = isAtBottom(pre);
    });
    this.drawerEl = pre;
    drawer.append(pre);
    return drawer;
  }

  private renderFooter(): HTMLElement {
    const foot = el('div', 'gp-foot');
    foot.append(el('span', '', 'Read-only'));
    if (this.isCustomHost()) {
      // Beside the built-in Connect flow, name the mode so it is clear which
      // credential the Panel is using.
      foot.append(el('span', 'gp-foot-host', `Custom host: ${this.effectiveHost()}`));
    }
    return foot;
  }
}

// ---------------------------------------------------------------------------
// Presentation helpers (pure)
// ---------------------------------------------------------------------------

function statusIcon(info: StatusInfo, size: number): HTMLElement {
  const wrap = el('span', 'gp-icon');
  if (info.tone !== 'neutral') wrap.dataset.tone = info.tone;
  if (info.animate) wrap.dataset.animate = 'true';
  if (info.muted) wrap.dataset.muted = 'true';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', info.label);
  const glyph = el('span', 'gp-icon-svg');
  glyph.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="currentColor">${GLYPHS[info.glyph] ?? GLYPHS.dot}</svg>`;
  wrap.append(glyph);
  return wrap;
}

/** Whether a scroll container is at (or near) its bottom edge. */
export function isAtBottom(
  metrics: { scrollTop: number; scrollHeight: number; clientHeight: number },
  threshold = 24,
): boolean {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= threshold;
}

/**
 * Resolve the `host` setting to a base URL, or null when it is not usable.
 * `https://` is accepted; a bare host is taken as https; any other scheme, an
 * embedded credential or a path is a hard no — never a silent coercion, so a
 * typo cannot send the token anywhere unintended (US11/US29).
 *
 * Returns the base URL (scheme + host + optional port), e.g. `https://gitlab.example.com`.
 */
export function resolveCustomBase(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.includes('://')) {
    const scheme = raw.slice(0, raw.indexOf('://')).toLowerCase();
    if (scheme !== 'https') return null;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    if (url.username || url.password) return null;
    if (url.pathname !== '/' && url.pathname !== '') return null;
    if (url.search || url.hash) return null;
    return url.origin;
  }
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(raw)) return null;
  return `https://${raw}`;
}

/**
 * The project reference named by a redirect target URL, when that URL is on the
 * effective host — a project id, or an encoded path. A target on another host is
 * refused: following it would name a different instance's project.
 */
function projectFromRedirectTarget(target: string, host: string): string | null {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if (url.host !== host) return null;
  const match = /^\/api\/v4\/projects\/(.+?)\/?$/.exec(url.pathname);
  const reference = match?.[1];
  if (!reference) return null;
  try {
    return decodeURIComponent(reference);
  } catch {
    return null;
  }
}

/** The host (with port) of a base URL, for display and comparison. */
export function hostOfBase(base: string): string {
  return base.replace(/^https:\/\//, '').replace(/\/+$/, '');
}

/** The proxy answers with its own envelope; turn it back into a host response. */
function proxyResponse(response: { status: number; body: string }): { status: number; body: string } {
  try {
    const parsed = JSON.parse(response.body) as { status?: number; body?: string; error?: string };
    if (typeof parsed.status === 'number') return { status: parsed.status, body: parsed.body ?? '' };
    // The shell answers a proxy failure with a 502 envelope carrying `error`.
    // Raise it so the client maps it to a network failure, not an HTTP one.
    if (parsed.error) throw new Error(parsed.error);
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Not our envelope; fall through to the raw response shape.
    } else {
      throw error;
    }
  }
  return { status: response.status, body: response.body };
}

/** Why the shown log is shorter than the job's trace, if it is. */
function traceTruncation(text: string): TraceTruncation {
  if (text.length >= HOST_BODY_CAP) return 'host';
  if (logLines(text).length > LOG_MAX_LINES) return 'cap';
  return null;
}

/** A successful trace fetch's cache entry: `ready` with the text, or `missing` when empty. */
function traceStateOf(text: string): TraceState {
  return text.trim()
    ? { state: 'ready', text, truncated: traceTruncation(text) }
    : { state: 'missing', text: '', truncated: null };
}

function truncationNotice(kind: Exclude<TraceTruncation, null>): HTMLElement {
  const notice = el('div', 'gp-drawer-notice');
  notice.textContent =
    kind === 'host'
      ? 'GitLab returned a capped log. View the full log in GitLab.'
      : `Older lines not shown (last ${LOG_MAX_LINES} lines). View the full log in GitLab.`;
  return notice;
}

/** Why a started session did not receive its seed message, in the user's words. */
function handoffFailure(sent: StartSessionSent): string {
  if (sent === 'no-model') return 'No model is selected in OpenChamber, so the session got no message.';
  if (sent === 'skipped') return 'OpenChamber skipped the message. Open a project and try again.';
  return 'OpenChamber could not start the session.';
}

function pipelineSubtitle(pipeline: Pipeline): string {
  const bits = [`#${pipeline.iid}`, statusInfo(pipeline.status).label];
  if (pipeline.merge_request?.iid != null) bits.push(`!${pipeline.merge_request.iid}`);
  else if (pipeline.tag) bits.push('tag');
  else if (pipeline.name) bits.push(pipeline.name);
  // The source is always worth a slot (merge-request events, schedules, web, …);
  // a plain `push` is the unremarkable default.
  if (pipeline.source && pipeline.source !== 'push') bits.push(pipeline.source.replace(/_/g, ' '));
  return bits.join(' · ');
}

function problemFor(resolution: Extract<ProjectResolution, { ok: false }>, configuredHost: string): Problem {
  switch (resolution.failure) {
    case 'no-project':
      return {
        kind: 'no-project',
        title: 'No project open',
        body: 'The panel reads the open project’s git remote to find its GitLab project. Open one, then refresh.',
        hint: 'Or set the “Project” setting to a GitLab project path.',
      };
    case 'not-a-repo':
      return {
        kind: 'not-a-repo',
        title: 'Not a Git repository',
        body: 'This project has no readable .git remote, so there is no GitLab project to derive.',
        hint: 'Or set the “Project” setting to a GitLab project path.',
      };
    case 'linked-worktree': {
      const problem: Problem = {
        kind: 'linked-worktree',
        title: 'Linked worktree',
        body: 'This project is a linked git worktree, so its .git points outside it and the remote cannot be read. There is no host API for the remote in this case.',
        hint: 'Set the “Project” setting to this worktree’s GitLab project path to read its pipelines.',
      };
      if (resolution.detectedRef) problem.detail = `Current ref: ${resolution.detectedRef}`;
      return problem;
    }
    case 'host-mismatch':
      return {
        kind: 'host-mismatch',
        title: 'Different GitLab host',
        body: `This remote points at ${resolution.detectedHost}, but this extension only talks to ${configuredHost}.`,
        detail: resolution.detectedPath
          ? `${resolution.detectedHost}/${resolution.detectedPath}`
          : resolution.detectedHost,
        hint: 'Set the “Project” setting to a project path on this extension’s GitLab host.',
      };
  }
}

function disconnectedProblem(configuredHost: string): Problem {
  return {
    kind: 'disconnected',
    title: 'GitLab not connected',
    body: `No personal access token is stored for ${configuredHost}. Connect one to read pipelines.`,
  };
}

/** A Moved project the Panel could not follow, with a link to its old path. */
function movedProblem(target: string, url: string | null): Problem {
  return {
    kind: 'moved',
    title: 'Project moved',
    body: `This project's path no longer resolves; GitLab has moved it to ${target}.`,
    hint: 'Update the git remote or the Project setting, then refresh.',
    ...(url ? { action: { label: 'Open in GitLab', url } } : {}),
  };
}

/** A redirect that is not a recognisable move. */
function redirectedProblem(url: string | null): Problem {
  return {
    kind: 'redirected',
    title: 'GitLab redirected this request',
    body: 'GitLab answered with a redirect this extension could not follow. The project may have moved, or the session may have expired.',
    hint: 'Check the GitLab host and the Project setting, then refresh.',
    ...(url ? { action: { label: 'Open in GitLab', url } } : {}),
  };
}

function failureProblem(failure: ClientFailure, effectiveHost: string): Problem {
  if (failure.kind === 'disconnected') return disconnectedProblem(effectiveHost);
  if (failure.kind === 'unauthorized') {
    return {
      kind: 'unauthorized',
      title: 'GitLab token rejected',
      body: 'The stored token cannot read this project. A personal access token with the read_api scope is required.',
    };
  }
  if (failure.kind === 'service') {
    return {
      kind: 'service',
      title: 'Proxy service unavailable',
      body: 'The local proxy that reaches a custom GitLab host is not running. It may not be granted yet, or it failed to start.',
      hint: 'Open Settings → Extensions and allow this extension’s service, then refresh.',
    };
  }
  return {
    kind: 'not-found',
    title: 'Project not found',
    body: 'GitLab could not find this project, or the token cannot see it.',
  };
}

/** A custom host is set but its `token` setting is empty. */
function customTokenProblem(host: string): Problem {
  return {
    kind: 'custom-token',
    title: 'No token for this host',
    body: `The Panel reaches ${host} through the proxy service and needs a personal access token for it.`,
    hint: 'Set the “Access token” setting to a personal access token with the read_api scope.',
  };
}

/** The `host` setting is set but is not a usable host. */
function customHostProblem(value: string): Problem {
  return {
    kind: 'custom-host',
    title: 'Invalid GitLab host',
    body: `“${value}” is not a usable host. Enter a bare host like gitlab.example.com, or a full https:// origin.`,
    hint: 'Fix the “GitLab host” setting, or clear it to use the built-in instance.',
  };
}

/**
 * Mount the Pipelines panel. `port` is the only host dependency; tests pass a
 * fake.
 */
export function mountPanel(root: HTMLElement, port: HostPort, options: PanelOptions): PanelHandle {
  return new PipelinesPanel(root, port, {
    ...options,
    apiOrigin: options.apiOrigin || API_ORIGIN,
  }).start();
}
