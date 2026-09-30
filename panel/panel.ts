import type { GuestConnection, HostReadyContext, StartSessionSent } from '@openchamber/sdk';
import { applyHostReady, mountButton, mountEmpty, mountTabs } from '@openchamber/sdk/ui';

import { API_ORIGIN, HOST_BODY_CAP, LOG_MAX_LINES, LIVE_TICK_MS, PANEL_ID, SERVICE_PATH } from './config';
import { ago, duration, elapsed, logLines, shortSha, tailLines, toEpoch } from './format';
import {
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
  resolveProject,
  samePath,
  type ProjectFailureKind,
  type ProjectResolution,
  type ResolveInput,
} from './project-resolver';
import { groupJobsByStage, type StageGroup } from './stage-groups';
import { isActiveStatus, jobStatusInfo, statusInfo, type StatusInfo } from './status';
import type { Job, Pipeline, Scope } from './types';

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
    | 'service';
  title: string;
  body: string;
  hint?: string;
  detail?: string;
};

/** Why a log is shorter than the trace: our own line cap, or the host's body cap. */
type TraceTruncation = 'cap' | 'host' | null;

type TraceState = {
  state: 'ready' | 'missing' | 'error';
  text: string;
  truncated: TraceTruncation;
};

type OpenJob = { pipelineId: number; jobId: number };

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

const GIT_MERGE_LINE =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M7 4a3 3 0 0 0-1 5.83v4.34A3.001 3.001 0 1 0 8 17v-4h1a4 4 0 0 0 4-4V8.83a3.001 3.001 0 1 0-2 0V9a2 2 0 0 1-2 2H8V9.83A3 3 0 0 0 7 4zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm8-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM7 16a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>';
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
  private readonly jobs = new Map<number, Job[] | 'loading' | 'error'>();
  private openJob: OpenJob | null = null;
  private readonly traces = new Map<number, TraceState>();
  private traceLoadingId: number | null = null;
  /** The Job whose handoff is in flight, and the last handoff failure to show. */
  private handoffJobId: number | null = null;
  private handoffError: string | null = null;
  private updatedAt: number | null = null;
  /** The Configured host the current data belongs to, for switch detection. */
  private lastHost: string | null = null;

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
    this.resolved = resolution;
    await this.loadPipelines(gen, resolution);
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
    this.jobs.clear();
    this.traces.clear();
    this.openJob = null;
    this.expandedId = null;
    this.updatedAt = null;
  }

  private async deriveProject(): Promise<ProjectResolution> {
    const override = this.settingsProject.trim();
    const directory = this.directory;

    let gitConfig: string | null = null;
    let gitFile: string | null = null;
    let head: string | null = null;
    let worktrees: ResolveInput['worktrees'] = null;

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
      try {
        head = (await this.port.readFile('.git/HEAD')).content;
      } catch {
        head = null;
      }
      try {
        const projects = await this.port.listProjects();
        const match = projects.projects.find((project) => samePath(project.directory, directory));
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

  private async loadPipelines(
    gen: number,
    resolution: Extract<ProjectResolution, { ok: true }>,
  ): Promise<void> {
    const scope: Scope = resolution.ref ? this.scope : 'all';
    const result = await fetchPipelines(this.requester(), resolution.project, {
      scope,
      ref: resolution.ref,
    });
    if (this.disposed || gen !== this.generation) return;
    if (!result.ok) {
      this.handleFailure(result.failure);
      return;
    }
    this.pipelines = result.data;
    this.updatedAt = this.timers.now();
    this.phase = 'ready';
    this.error = null;
    if (this.expandedId != null) {
      void this.loadJobs(gen, this.expandedId, this.jobs.has(this.expandedId));
    }
    this.render();
    this.schedulePoll();
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
    this.error =
      failure.kind === 'network'
        ? 'Could not reach GitLab. Check the connection and try again.'
        : `GitLab returned an unexpected response (${failure.status}).`;
    this.render();
    if (this.hasActive()) this.schedulePoll();
    else this.stopAllTimers();
  }

  private togglePipeline(id: number): void {
    if (this.expandedId === id) {
      this.expandedId = null;
      this.render();
      return;
    }
    this.expandedId = id;
    if (!this.jobs.has(id)) {
      this.jobs.set(id, 'loading');
      this.render();
      void this.loadJobs(this.generation, id, false);
    } else {
      this.render();
    }
  }

  private async loadJobs(gen: number, pipelineId: number, silent: boolean): Promise<void> {
    const project = this.resolved?.project;
    if (!project) return;
    if (!silent || !Array.isArray(this.jobs.get(pipelineId))) {
      this.jobs.set(pipelineId, 'loading');
      this.render();
    }
    const result = await fetchJobs(this.requester(), project, pipelineId);
    if (this.disposed || gen !== this.generation) return;
    if (result.ok) {
      this.jobs.set(pipelineId, result.data);
    } else if (silent) {
      // A background refresh must not discard jobs already on screen.
    } else {
      // A failed fetch is not an absence of jobs; say so rather than showing none.
      this.jobs.set(pipelineId, 'error');
    }
    if (this.expandedId === pipelineId) this.render();
  }

  private openJobDrawer(pipelineId: number, jobId: number): void {
    this.openJob = { pipelineId, jobId };
    this.followTail = true;
    this.drawerScrollTop = 0;
    if (this.traces.has(jobId)) {
      this.render();
      return;
    }
    this.traceLoadingId = jobId;
    this.render();
    void this.loadTrace(this.generation, jobId);
  }

  private async loadTrace(gen: number, jobId: number): Promise<void> {
    const project = this.resolved?.project;
    if (!project) return;
    const result = await fetchTrace(this.requester(), project, jobId);
    if (this.disposed || gen !== this.generation) return;
    this.traceLoadingId = null;
    if (!result.ok) {
      // A failed fetch is not a missing log; keep the two apart.
      this.traces.set(jobId, { state: 'error', text: '', truncated: null });
    } else {
      this.traces.set(jobId, traceStateOf(result.data ?? ''));
    }
    this.render();
  }

  /**
   * While the open Job is still active, refresh just its trace on the poll — the log is otherwise
   * fetched once and cached, so a running Job would freeze at the moment it was opened.
   */
  private refreshOpenTrace(gen: number): void {
    const reference = this.openJob;
    if (!reference || this.traceLoadingId === reference.jobId) return;
    const job = this.jobById(reference.jobId);
    if (!job || !isActiveStatus(job.status)) return;
    void this.loadTrace(gen, reference.jobId);
  }

  private jobById(jobId: number): Job | undefined {
    for (const value of this.jobs.values()) {
      if (!Array.isArray(value)) continue;
      const match = value.find((job) => job.id === jobId);
      if (match) return match;
    }
    return undefined;
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
   * Start a new session from a failed Job, seeded with its identity, links and
   * Trace tail. The Panel's only outbound action; nothing is sent to GitLab.
   */
  private startHandoff(pipelineId: number, jobId: number): void {
    if (!this.canHandoff() || this.handoffJobId != null) return;
    const job = this.jobById(jobId);
    if (!job || !isHandoffJob(job)) return;
    const pipeline = this.pipelines.find((candidate) => candidate.id === pipelineId) ?? null;
    this.handoffJobId = jobId;
    this.handoffError = null;
    this.render();
    void this.runHandoff(pipeline, job);
  }

  private async runHandoff(pipeline: Pipeline | null, job: Job): Promise<void> {
    const trace = await this.traceFor(job);
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
          project: this.resolved?.project ?? '',
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
  private async traceFor(job: Job): Promise<string | null> {
    const cached = this.traces.get(job.id);
    if (cached?.state === 'ready') return cached.text;
    const project = this.resolved?.project;
    if (!project) return null;
    const result = await fetchTrace(this.requester(), project, job.id);
    if (!result.ok) return null;
    const text = result.data ?? '';
    this.traces.set(job.id, traceStateOf(text));
    return text;
  }

  private finishHandoff(error: string | null): void {
    this.handoffJobId = null;
    this.handoffError = error;
    this.render();
  }

  // -- polling --------------------------------------------------------------

  private visibleStatuses(): string[] {
    const statuses: string[] = this.pipelines.map((pipeline) => pipeline.status);
    for (const value of this.jobs.values()) {
      if (Array.isArray(value)) for (const job of value) statuses.push(job.status);
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
    await this.loadPipelines(gen, this.resolved);
    if (gen === this.generation) this.refreshOpenTrace(gen);
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
    mark.innerHTML = GIT_MERGE_LINE;
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

    row.addEventListener('click', () => this.togglePipeline(pipeline.id));
    item.append(row);

    if (open) {
      const jobsWrap = el('div', 'gp-jobs');
      if (pipeline.web_url) {
        const link = document.createElement('a');
        link.className = 'gp-jobs-link';
        link.href = pipeline.web_url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'View pipeline in GitLab';
        link.addEventListener('click', (event) => {
          event.preventDefault();
          void this.port.openUrl(pipeline.web_url);
        });
        jobsWrap.append(link);
      }
      const value = this.jobs.get(pipeline.id);
      if (value === undefined || value === 'loading') {
        jobsWrap.append(el('div', 'gp-row-sub', 'Loading jobs…'));
      } else if (value === 'error') {
        jobsWrap.append(el('div', 'gp-row-sub', 'Could not load jobs. Collapse and reopen to retry.'));
      } else if (value.length === 0) {
        jobsWrap.append(el('div', 'gp-row-sub', 'No jobs reported yet.'));
      } else {
        for (const group of groupJobsByStage(value)) jobsWrap.append(this.renderStage(pipeline.id, group));
      }
      item.append(jobsWrap);
    }
    return item;
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

  private renderStage(pipelineId: number, group: StageGroup): HTMLElement {
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
      if (this.openJob?.jobId === job.id) row.dataset.selected = 'true';
      row.setAttribute('aria-label', `${job.name}, ${jobStatusInfo(job).label}`);
      row.append(statusIcon(jobStatusInfo(job), 13), el('span', 'gp-job-name', job.name));
      row.append(this.jobMeta(job));
      row.addEventListener('click', () => this.openJobDrawer(pipelineId, job.id));
      row.addEventListener('keydown', (event) => {
        // Only when the row itself is focused: the nested action button owns its
        // own Enter/Space, and this must not swallow it.
        if (event.target !== row) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.openJobDrawer(pipelineId, job.id);
        }
      });
      if (isHandoffJob(job)) row.append(this.renderHandoffAction(job, pipelineId));
      stage.append(row);
    }
    return stage;
  }

  /** The "Start session" affordance for a failed Job, on its row or in the drawer. */
  private renderHandoffAction(job: Job, pipelineId: number): HTMLElement {
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
        this.startHandoff(pipelineId, job.id);
      });
    }
    return button;
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
    const jobs = this.jobs.get(reference.pipelineId);
    const job = Array.isArray(jobs) ? jobs.find((candidate) => candidate.id === reference.jobId) : undefined;

    const head = el('div', 'gp-drawer-head');
    const title = el('span', 'gp-drawer-title', job ? `${job.name} · ${jobStatusInfo(job).label}` : `Job #${reference.jobId}`);
    head.append(title);
    if (job?.web_url) {
      const link = document.createElement('a');
      link.className = 'gp-drawer-link';
      link.href = job.web_url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'View full log in GitLab';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        void this.port.openUrl(job.web_url);
      });
      head.append(link);
    }
    if (job && isHandoffJob(job)) head.append(this.renderHandoffAction(job, reference.pipelineId));
    const close = el('button', 'gp-drawer-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close log');
    close.title = 'Close';
    close.innerHTML = CLOSE_ICON;
    close.addEventListener('click', () => this.closeDrawer());
    head.append(close);
    drawer.append(head);

    const entry = this.traces.get(reference.jobId);
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
