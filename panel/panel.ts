import type { HostReadyContext, StartSessionSent } from '@openchamber/sdk';
import { applyHostReady, mountButton, mountEmpty, mountMenu, mountTabs } from '@openchamber/sdk/ui';

import { accessLevelOf, canRunPipeline, cancelRoleOf, menuState, type ActionId, type Capability } from './actions';
import { DEFAULT_HOST, HOST_BODY_CAP, LIVE_TICK_MS, LOG_MAX_LINES, PANEL_ID, POLL_INTERVAL_MS, SERVICE_CONFIG_PATH, SERVICE_GIT_CONFIG_PATH, SERVICE_PATH, SERVICE_TOKEN_PATH } from './config';
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
  cancelJob,
  cancelPipeline,
  fetchBridges,
  fetchJobs,
  fetchPipelines,
  fetchProject,
  fetchTokenScopes,
  fetchTrace,
  fetchTraceRange,
  fetchUser,
  forceCancelJob,
  newRequestCache,
  playJob,
  projectFromRedirectTarget,
  retryJob,
  retryPipeline,
  triggerPipeline,
  type ClientFailure,
  type PipelinePage,
  type RequestCache,
  type Requester,
  type WriteResult,
} from './gitlab-client';
import { buildHandoff, isHandoffJob } from './handoff';
import type { HostPort } from './host-port';
import {
  nextPollDelay,
  rateLimitedDelay,
  shouldPoll,
  widenForLowRateLimit,
} from './poll';
import { prefKey, readPrefs, writePrefs, type Prefs } from './prefs';
import {
  isLinkedWorktree,
  resolveProject,
  samePath,
  worktreePrimaryDirectory,
  type ProjectFailureKind,
  type ProjectResolution,
  type ResolveInput,
} from './project-resolver';
import {
  hasToken,
  normalizeHostInput,
  parseConfigEnvelope,
  parseProxyEnvelope,
  serviceErrorMessage,
  type ServiceConfig,
} from './service-config';
import { groupJobsByStage, type StageGroup } from './stage-groups';
import { isActiveStatus, jobStatusInfo, statusInfo, type StatusInfo } from './status';
import { TraceIndexer, lineAtOffset, stripAnsi, type IdleScheduler } from './trace-index';
import type { Bridge, Job, Pipeline, Scope } from './types';

/** Everything the panel needs from a clock. Injected so tests are deterministic. */
export type Timers = {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  setInterval(fn: () => void, ms: number): number;
  clearInterval(id: number): void;
  /** Scheduling for the Trace index's idle slices; mirrors `requestIdleCallback`. */
  requestIdleCallback(fn: () => void): number;
  cancelIdleCallback(id: number): void;
  now(): number;
};

export const defaultTimers: Timers = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clearTimeout: (id) => globalThis.clearTimeout(id),
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms) as unknown as number,
  clearInterval: (id) => globalThis.clearInterval(id),
  requestIdleCallback: (fn) => {
    const idle = (globalThis as { requestIdleCallback?: (callback: () => void) => number })
      .requestIdleCallback;
    return idle ? idle(fn) : (globalThis.setTimeout(fn, 0) as unknown as number);
  },
  cancelIdleCallback: (id) => {
    const cancel = (globalThis as { cancelIdleCallback?: (handle: number) => void })
      .cancelIdleCallback;
    if (cancel) cancel(id);
    else globalThis.clearTimeout(id);
  },
  now: () => Date.now(),
};

export type PanelOptions = {
  timers?: Timers;
};

export type PanelHandle = {
  refresh(): void;
  setScope(scope: Scope): void;
  isPolling(): boolean;
  dispose(): void;
};

type Problem = {
  /** Config-write state flows through `gp-config-error`; no Panel-wide kind. */
  kind:
    | ProjectFailureKind
    | 'no-token'
    | 'unauthorized'
    | 'forbidden'
    | 'not-found'
    | 'service'
    | 'moved'
    | 'redirected';
  title: string;
  body: string;
  hint?: string;
  detail?: string;
  /** An optional outbound action, e.g. opening the project in GitLab. */
  action?: { label: string; url: string };
  /** Whether the state offers the configuration form as its fix. */
  configure?: boolean;
  /** The Configured host to pre-fill when the Configure button opens the form. */
  configureHost?: string;
};

/** A configuration write's outcome: the saved view, or the reason it failed. */
type ConfigResult = { ok: true; config: ServiceConfig } | { ok: false; error: string };

/** Redirects followed in one refresh before a move chain is treated as runaway. */
const MAX_REDIRECT_HOPS = 5;

/** Estimated height of one unwrapped log row, in pixels. */
const LOG_LINE_HEIGHT = 18;
/** Characters per wrapped row when no width has been measured. */
const LOG_WRAP_CHARS = 80;
/** Viewport height assumed before layout exists (and under a test DOM). */
const LOG_VIEWPORT_FALLBACK = 320;
/** Lines the drawer renders at once, regardless of a viewport it may not be able to read. */
const LOG_WINDOW_LINES = 120;
/** How long a typed find query waits before it is run over the index. */
const LOG_FIND_DEBOUNCE_MS = 120;
/** A monospace glyph's advance at the drawer's 0.75rem font, before measurement. */
const DEFAULT_CHAR_WIDTH = 7.2;

/** How long a successful action's notice stays before it dismisses itself. */
const ACTION_NOTICE_MS = 5000;

/** The menu item wording; the row's own context says whether it is a Job or Pipeline. */
const ACTION_LABELS: Record<ActionId, string> = {
  'retry-job': 'Retry',
  'play-job': 'Play',
  'cancel-job': 'Cancel',
  'force-cancel-job': 'Force cancel',
  'retry-pipeline': 'Retry pipeline',
  'cancel-pipeline': 'Cancel pipeline',
  'run-pipeline': 'Run pipeline',
};

/** The success notice for an action, in the user's words. */
const ACTION_SUCCESS: Record<ActionId, string> = {
  'retry-job': 'Job retry started.',
  'play-job': 'Job started.',
  'cancel-job': 'Job cancellation requested.',
  'force-cancel-job': 'Force cancel requested.',
  'retry-pipeline': 'Pipeline retry started.',
  'cancel-pipeline': 'Pipeline cancellation requested.',
  'run-pipeline': 'Pipeline started.',
};

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

const REFRESH_ICON =
  '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>';
const CHEVRON =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 13.17l4.95-4.95 1.41 1.41L12 16 5.64 9.63 7.05 8.22z"/></svg>';
const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/></svg>';
/** Heroicons `cog-6-tooth` (solid): a standard settings gear with a punched-out centre. */
const GEAR_ICON =
  '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"/></svg>';
/** Heroicons `bug-ant` (solid): marks the handoff as an agent debugging the failed Job. */
const BUG_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M8.478 1.6a.75.75 0 0 1 .273 1.026 3.72 3.72 0 0 0-.425 1.121c.058.058.118.114.18.168A4.491 4.491 0 0 1 12 2.25c1.413 0 2.673.651 3.497 1.668.06-.054.12-.11.178-.167a3.717 3.717 0 0 0-.426-1.125.75.75 0 1 1 1.298-.752 5.22 5.22 0 0 1 .671 2.046.75.75 0 0 1-.187.582c-.241.27-.505.52-.787.749a4.494 4.494 0 0 1 .216 2.1c-.106.792-.753 1.295-1.417 1.403-.182.03-.364.057-.547.081.152.227.273.476.359.742a23.122 23.122 0 0 0 3.832-.803 23.241 23.241 0 0 0-.345-2.634.75.75 0 0 1 1.474-.28c.21 1.115.348 2.256.404 3.418a.75.75 0 0 1-.516.75c-1.527.499-3.119.854-4.76 1.049-.074.38-.22.735-.423 1.05 2.066.209 4.058.672 5.943 1.358a.75.75 0 0 1 .492.75 24.665 24.665 0 0 1-1.189 6.25.75.75 0 0 1-1.425-.47 23.14 23.14 0 0 0 1.077-5.306c-.5-.169-1.009-.32-1.524-.455.068.234.104.484.104.746 0 3.956-2.521 7.5-6 7.5-3.478 0-6-3.544-6-7.5 0-.262.037-.511.104-.746-.514.135-1.022.286-1.522.455.154 1.838.52 3.616 1.077 5.307a.75.75 0 1 1-1.425.468 24.662 24.662 0 0 1-1.19-6.25.75.75 0 0 1 .493-.749 24.586 24.586 0 0 1 4.964-1.24h.01c.321-.046.644-.085.969-.118a2.983 2.983 0 0 1-.424-1.05 24.614 24.614 0 0 1-4.76-1.05.75.75 0 0 1-.516-.75c.057-1.16.194-2.302.405-3.417a.75.75 0 0 1 1.474.28c-.164.862-.28 1.74-.345 2.634 1.237.371 2.517.642 3.832.803.085-.266.207-.515.359-.742a18.698 18.698 0 0 1-.547-.08c-.664-.11-1.311-.612-1.417-1.404a4.535 4.535 0 0 1 .217-2.103 6.788 6.788 0 0 1-.788-.751.75.75 0 0 1-.187-.583 5.22 5.22 0 0 1 .67-2.04.75.75 0 0 1 1.026-.273Z"/></svg>';

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
  private readonly timers: Timers;

  private directory: string | null = null;
  private started = false;
  private disposed = false;

  /** The service-owned configuration, or null until it is first read. */
  private config: ServiceConfig | null = null;
  /** Whether the configuration form is open. */
  private configOpen = false;
  /** Whether a configuration save is in flight. */
  private configBusy = false;
  /** The configuration form's validation or save error, if any. */
  private configError: string | null = null;
  /**
   * The form's in-progress values. Kept so a background render cannot wipe a
   * half-typed host or Project override; the token lives only here and in the
   * input, never read back from the service.
   */
  private configDraft: { host: string; project: string; token: string } | null = null;
  /** The authenticated username for the Configured host, once known. */
  private username: string | null = null;
  /** The host the username belongs to, so a switch re-reads it. */
  private usernameHost: string | null = null;

  private scope: Scope = 'branch';
  /** The storage key the current view is remembered under, so it restores once per key. */
  private prefsKey: string | null = null;
  /** The record just read for a new key, applied once the Pipelines list has loaded. */
  private pendingRestore: Prefs | null = null;
  /** A remembered Job id waiting for its Pipeline's Jobs to load before it reopens. */
  private pendingJobId: number | null = null;
  /** Serializes best-effort preference writes, so an older one cannot land last. */
  private prefsWrite: Promise<void> = Promise.resolve();
  private phase: 'init' | 'loading' | 'ready' | 'problem' = 'init';
  private resolved: Extract<ProjectResolution, { ok: true }> | null = null;
  private problem: Problem | null = null;
  private error: string | null = null;
  private pipelines: Pipeline[] = [];
  /** The next Pipelines page number from `Link rel="next"`, or null at the end. */
  private pipelinesNextPage: number | null = null;
  /** How many Pipelines pages are loaded, so a poll does not reset the accumulation. */
  private pipelinesPage = 1;
  /** Whether a Load more request is in flight, so a second click cannot double it. */
  private loadMoreBusy = false;
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
  /** The byte offset reached per running Trace, so a poll fetches only the delta. */
  private readonly traceOffsets = new Map<string, number>();
  private traceLoadingKey: string | null = null;
  /** The Panel-local conditional-GET cache, dropped when the host or token changes. */
  private readonly requestCache: RequestCache = newRequestCache();
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
  /** Project capabilities by path, once read; absent means not yet known. */
  private readonly capabilities = new Map<string, Capability>();
  /** Whether the Access token has the `api` scope; null until read or when unreadable. */
  private tokenCanWrite: boolean | null = null;
  /** The host the token scopes belong to, so a switch re-reads them. */
  private tokenScopesHost: string | null = null;
  /** The one-time notice that the token is read-only; dismissed by hand. */
  private scopeNoticeDismissed = false;
  /** Refs whose all-refs fallback is suppressed for this session. */
  private readonly fallbackRefs = new Set<string>();
  /** The all-refs fallback notice, naming the Ref, until dismissed or reversed. */
  private fallbackNotice: { ref: string } | null = null;
  /** Whether a write is in flight, so a second click cannot fire one. */
  private actionBusy = false;
  /** The last action's outcome notice, and its auto-dismiss timer. */
  private actionNotice: { kind: 'success' | 'error'; text: string } | null = null;
  private actionNoticeTimer: number | null = null;
  /** The current rate-limit episode, until a request succeeds. */
  private rateLimited: { retryAfterMs: number | null } | null = null;
  /** Whether this episode's notice was dismissed by hand. */
  private rateLimitNoticeDismissed = false;
  /** GitLab's last reported `RateLimit-Remaining`, for pre-emptive widening. */
  private lastRateRemaining: number | null = null;

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
  /** The find field, match count and Jump control of the open log's toolbar. */
  private drawerFindEl: HTMLInputElement | null = null;
  private drawerCountEl: HTMLElement | null = null;
  private drawerToolsEl: HTMLElement | null = null;
  private drawerCopyEl: HTMLElement | null = null;
  private drawerJumpEl: HTMLElement | null = null;
  /** The open log's lines (tail-capped) and the text they came from. */
  private traceLines: string[] = [];
  private traceText = '';
  /** The raw Trace text last turned into `logLines`, to skip unchanged renders. */
  private traceRawText: string | null = null;
  private traceKey: string | null = null;
  /** The open log's find query, matching line indices and current match. */
  private traceFindQuery = '';
  private traceMatches: number[] = [];
  private traceMatchAt = -1;
  /** The pending debounce for a find query, if any. */
  private traceFindTimer: number | null = null;
  /** The error line indices from the last index update. */
  private traceErrors: number[] = [];
  /** The full accumulated Trace, ANSI-stripped, for Copy. */
  private traceCopyText = '';
  /** Measured row heights by line index; only rows actually rendered are measured. */
  private readonly traceHeights = new Map<number, number>();
  /** The characters-per-row the measured heights were taken at, to invalidate on resize. */
  private traceWrap = LOG_WRAP_CHARS;
  /** The last scroll offset a paint set, so our own scroll event is not read as the user's. */
  private traceScrollSet = -1;
  /** The last rendered window start, so a scroll within the window need not repaint. */
  private traceWindowStart = -1;
  /** The measured monospace advance width, once computed. */
  private traceCharWidthPx: number | null = null;
  /** The open log's incremental line index. */
  private traceIndexer: TraceIndexer | null = null;
  /** Whether the index was complete on the last update, to repaint once on completion. */
  private traceIndexed = false;
  /** Guards the single measurement re-settle pass. */
  private traceSettling = false;
  /** The open log's total row height, for a scroll-position bottom test. */
  private traceTotal = 0;

  private readonly handles: Array<{ dispose(): void }> = [];
  private unsubReady: (() => void) | null = null;

  constructor(root: HTMLElement, port: HostPort, options: PanelOptions) {
    this.root = root;
    this.port = port;
    this.timers = options.timers ?? defaultTimers;
  }

  start(): PanelHandle {
    this.unsubReady = this.port.onReady((ctx) => this.handleReady(ctx));
    this.render();
    return this;
  }

  // -- host events ----------------------------------------------------------

  private handleReady(ctx: HostReadyContext): void {
    applyHostReady(ctx, document.documentElement);
    const changed = ctx.directory !== this.directory || !this.started;
    this.directory = ctx.directory;
    if (changed) {
      this.started = true;
      void this.bootstrap();
    } else {
      this.render();
    }
  }

  /**
   * Read the configuration from the service, then resolve and load. The
   * configuration is the one source of truth for the host and the Project
   * override; a failure to read it is a service state, never a silent default.
   */
  private async bootstrap(): Promise<void> {
    this.phase = 'loading';
    this.render();
    const loaded = await this.loadConfig();
    if (this.disposed) return;
    if (!loaded) {
      this.render();
      return;
    }
    this.refresh();
  }

  /** Read the configuration; on success it becomes this Panel's view. Returns whether it loaded. */
  private async loadConfig(): Promise<boolean> {
    let response;
    try {
      response = await this.port.serviceRequest({ method: 'GET', path: SERVICE_CONFIG_PATH });
    } catch {
      this.showProblem(serviceProblem());
      return false;
    }
    if (this.disposed) return false;
    const config = response.status >= 200 && response.status < 300
      ? parseConfigEnvelope(response.body)
      : null;
    if (!config) {
      this.showProblem(serviceProblem());
      return false;
    }
    this.applyConfig(config);
    return true;
  }

  /** Adopt a configuration, dropping data from a previous host when it changed. */
  private applyConfig(config: ServiceConfig): void {
    if (config.host !== this.config?.host) this.forgetHostData();
    this.config = config;
  }

  private showProblem(problem: Problem): void {
    this.problem = problem;
    this.phase = 'problem';
    this.resolved = null;
    this.stopAllTimers();
    this.render();
  }

  // -- public controls ------------------------------------------------------

  refresh(): void {
    if (this.disposed) return;
    // Before the first successful configuration read there is nothing to
    // resolve against, so retry the read itself — this is what makes the
    // service state's Refresh recover after a grant.
    if (!this.config) {
      void this.bootstrap();
      return;
    }
    const gen = ++this.generation;
    void this.runRefresh(gen);
  }

  setScope(scope: Scope): void {
    if (scope === this.scope) return;
    // A manual scope change suppresses the all-refs fallback for this Ref.
    if (this.resolved?.ref) this.fallbackRefs.add(this.resolved.ref);
    this.scope = scope;
    this.expandedId = null;
    this.downstreamPath = [];
    this.openJob = null;
    this.resetTrace();
    this.pipelines = [];
    this.pipelinesNextPage = null;
    this.pipelinesPage = 1;
    this.persistView();
    this.refresh();
  }

  isPolling(): boolean {
    return this.pollTimer != null;
  }

  dispose(): void {
    this.disposed = true;
    this.stopAllTimers();
    if (this.actionNoticeTimer != null) this.timers.clearTimeout(this.actionNoticeTimer);
    if (this.traceFindTimer != null) this.timers.clearTimeout(this.traceFindTimer);
    this.disposeTraceIndexer();
    this.unsubReady?.();
    this.disposeHandles();
    clearNode(this.root);
    this.port.dispose();
  }

  // -- data flow ------------------------------------------------------------

  private async runRefresh(gen: number): Promise<void> {
    this.error = null;
    const config = this.config;
    if (!config) return;
    const host = config.host;

    // Drop the previous host's data only when the Configured host actually
    // changed, so an ordinary refresh keeps the list, expansion and open log.
    if (host !== this.lastHost) {
      this.forgetHostData();
      this.lastHost = host;
    }

    const override = config.project.trim();
    if (!this.directory && !override) {
      this.showProblem(problemFor({ ok: false, failure: 'no-project' }, host));
      return;
    }
    if (this.pipelines.length === 0) this.phase = 'loading';
    this.render();

    const resolution = await this.deriveProject(host);
    if (this.disposed || gen !== this.generation) return;
    if (!resolution.ok) {
      this.showProblem(problemFor(resolution, host));
      return;
    }
    this.problem = null;
    this.derivedProject = resolution.project;
    this.redirectHops = 0;
    this.resolved = this.applyHealedProject(resolution);
    await this.restoreScope(gen, host, this.resolved);
    if (this.disposed || gen !== this.generation) return;
    // A host with no Access token is its own state, distinct from a failed
    // request: the service would refuse the call, so do not attempt it. The
    // freshly resolved project stays in the header so the state has context.
    if (!hasToken(config, host)) {
      this.problem = noTokenProblem(host);
      this.phase = 'problem';
      this.stopAllTimers();
      this.render();
      return;
    }
    await this.loadUsername(gen, host);
    if (this.disposed || gen !== this.generation) return;
    await this.loadTokenScopes(gen, host);
    if (this.disposed || gen !== this.generation) return;
    this.ensureCapability(gen, this.resolved.project);
    await this.loadPipelines(gen, this.resolved, true);
  }

  /**
   * The authenticated user for the Configured host, read by proxying
   * `/api/v4/user`, which doubles as a token check. Best-effort: a failure
   * leaves the username unknown rather than blocking the list.
   */
  private async loadUsername(gen: number, host: string): Promise<void> {
    if (this.usernameHost === host && this.username != null) return;
    this.usernameHost = host;
    const result = await fetchUser(this.requester());
    if (this.disposed || gen !== this.generation) return;
    this.username = result.ok ? (result.data.username ?? null) : null;
    // A failed read (expired or invalid token) is retried on the next refresh,
    // so replacing the token updates the username without a reload.
    if (!result.ok) this.usernameHost = null;
    this.render();
  }

  /**
   * Whether the Access token can write. Read once per host from the token's own
   * self route; a refused or unreadable route leaves it unknown, never "no".
   */
  private async loadTokenScopes(gen: number, host: string): Promise<void> {
    if (this.tokenScopesHost === host) return;
    const result = await fetchTokenScopes(this.requester());
    if (this.disposed || gen !== this.generation) return;
    this.tokenScopesHost = host;
    const scopes = result.ok ? result.data.scopes : null;
    this.tokenCanWrite = Array.isArray(scopes) ? scopes.includes('api') : null;
  }

  /** Read a project's role and cancel restriction, once, cached by path. */
  private ensureCapability(gen: number, project: string): void {
    if (!project || this.capabilities.has(project)) return;
    void this.loadCapability(gen, project);
  }

  private async loadCapability(gen: number, project: string): Promise<void> {
    const result = await fetchProject(this.requester(), project);
    if (this.disposed || gen !== this.generation) return;
    if (!result.ok) return;
    this.capabilities.set(project, {
      accessLevel: accessLevelOf(result.data.permissions),
      canWrite: this.tokenCanWrite,
      cancelRole: cancelRoleOf(result.data.ci_restrict_pipeline_cancellation_role),
    });
    this.render();
  }

  private capabilityFor(project: string): Capability | null {
    return this.capabilities.get(project) ?? null;
  }

  /**
   * Drop cached capabilities and the token scope when the host, project override
   * or token changes, so the Panel re-reads them rather than trusting stale access.
   */
  private invalidateCapability(): void {
    this.capabilities.clear();
    this.tokenCanWrite = null;
    this.tokenScopesHost = null;
    this.scopeNoticeDismissed = false;
    // The conditional-GET cache and rate-limit state belong to the host+token
    // they were read under, so they go with the capability.
    this.requestCache.clear();
    this.lastRateRemaining = null;
    this.clearRateLimit();
  }

  /**
   * Drop everything resolved from the previous Configured host before resolving
   * again, so a host switch never shows another host's Pipelines, Jobs or Traces
   * as current. Cached Jobs are keyed by pipeline id, which is not unique across
   * hosts.
   */
  private forgetHostData(): void {
    this.pipelines = [];
    this.pipelinesNextPage = null;
    this.pipelinesPage = 1;
    this.bridges.clear();
    this.jobs.clear();
    this.traces.clear();
    this.traceOffsets.clear();
    this.openJob = null;
    this.resetTrace();
    this.expandedId = null;
    this.downstreamPath = [];
    this.pendingRestore = null;
    this.pendingJobId = null;
    this.updatedAt = null;
    this.healed.clear();
    this.derivedProject = null;
    this.redirectHops = 0;
    this.pendingHealNotice = null;
    this.healNotice = null;
    this.fallbackNotice = null;
    this.username = null;
    this.usernameHost = null;
    this.invalidateCapability();
  }

  private async deriveProject(host: string): Promise<ProjectResolution> {
    const override = this.config?.project.trim() ?? '';
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
      // Resolve against the Configured host the service owns; the remote's host
      // is compared against it for `host-mismatch` (ADR-0006).
      apiOrigin: `https://${host}`,
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

  /** The scope actually fetched: branch scope needs an open Ref, else all refs. */
  private currentScope(ref: string | null | undefined): Scope {
    return ref ? this.scope : 'all';
  }

  /**
   * Restore the remembered scope for this host+project+ref, once per key. A
   * refresh for the same key keeps the in-memory scope, so a manual change is
   * not undone by a poll. Best-effort: a failed read leaves the default.
   */
  private async restoreScope(
    gen: number,
    host: string,
    resolution: { project: string; ref: string | null },
  ): Promise<void> {
    const ref = resolution.ref;
    if (!ref) return;
    const key = prefKey(host, resolution.project, ref);
    if (key === this.prefsKey) return;
    this.prefsKey = key;
    const prefs = await readPrefs(this.port.storage, key);
    if (this.disposed || gen !== this.generation) return;
    // A different key with no record is a different view: fall back to Branch.
    this.scope = prefs.scope ?? 'branch';
    // The rest of the record waits for the Pipelines list, so a remembered
    // Pipeline can be checked against what is actually there.
    this.pendingRestore = prefs;
  }

  /** Remember the current view for this host+project+ref. Best-effort. */
  private persistView(): void {
    const host = this.config?.host;
    const resolution = this.resolved;
    if (!host || !resolution?.ref) return;
    const key = prefKey(host, resolution.project, resolution.ref);
    this.prefsKey = key;
    const now = this.timers.now();
    const patch: Prefs = {
      scope: this.scope,
      pipelineId: this.expandedId ?? undefined,
      downstream: this.downstreamPath.length > 0 ? this.downstreamPath : undefined,
      jobId: this.openJob?.jobId ?? undefined,
    };
    this.prefsWrite = this.prefsWrite.then(() => writePrefs(this.port.storage, key, patch, now));
  }

  private async loadPipelines(
    gen: number,
    resolution: Extract<ProjectResolution, { ok: true }>,
    seedBridges = false,
  ): Promise<void> {
    const scope = this.currentScope(resolution.ref);
    const result = await fetchPipelines(
      this.requester(),
      resolution.project,
      { scope, ref: resolution.ref },
      this.requestCache,
    );
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
    // A manual refresh resets to page 1; a poll merges so loaded pages survive.
    this.applyPipelines(result.data, seedBridges ? 'replace' : 'merge');
    this.updatedAt = this.timers.now();
    this.phase = 'ready';
    this.error = null;
    this.clearRateLimit();
    this.promoteHealNotice();
    this.pruneDownstreamNode();
    this.applyRememberedExpansion(gen);
    if (seedBridges) {
      this.seedBridges(gen, resolution.project);
      // A manual refresh re-reads the expanded Pipeline's own Jobs. On a poll,
      // `refetchVisible` owns every refetch, so this must not double up.
      if (this.expandedId != null) {
        void this.loadJobs(gen, resolution.project, this.expandedId, true);
      }
    }
    if (seedBridges && this.fallBackToAllRefs(resolution)) return;
    this.render();
    this.schedulePoll();
  }

  /**
   * On a fresh load in Branch scope with no Pipelines for a known Ref, switch to
   * All refs once, remembering the Ref for the session. A manual scope change or
   * the notice's Back to branch action adds the Ref first, so neither re-triggers.
   * Returns whether it switched, so the caller stops instead of painting twice.
   */
  private fallBackToAllRefs(resolution: Extract<ProjectResolution, { ok: true }>): boolean {
    const ref = resolution.ref;
    if (this.scope !== 'branch' || ref == null) return false;
    if (this.pipelines.length > 0 || this.fallbackRefs.has(ref)) return false;
    this.fallbackRefs.add(ref);
    this.fallbackNotice = { ref };
    this.setScope('all');
    return true;
  }

  /**
   * Fold a fetched Pipelines page into the list. `replace` (a manual refresh or
   * a scope/host change) starts over at page 1; `append` (Load more) adds the
   * page without disturbing expansion; `merge` (a poll) updates page 1 in place
   * while keeping any pages already loaded.
   */
  private applyPipelines(page: PipelinePage, mode: 'replace' | 'append' | 'merge'): void {
    if (mode === 'replace') {
      this.pipelines = page.pipelines;
      this.pipelinesNextPage = page.nextPage;
      this.pipelinesPage = 1;
      return;
    }
    const seen = new Set(this.pipelines.map((pipeline) => pipeline.id));
    if (mode === 'append') {
      for (const pipeline of page.pipelines) {
        if (seen.has(pipeline.id)) continue;
        this.pipelines.push(pipeline);
        seen.add(pipeline.id);
      }
      this.pipelinesNextPage = page.nextPage;
      this.pipelinesPage += 1;
      return;
    }
    // Merge: page 1 carries the newest, so it leads; older loaded pages follow.
    const merged: Pipeline[] = [];
    const added = new Set<number>();
    for (const pipeline of page.pipelines) {
      merged.push(pipeline);
      added.add(pipeline.id);
    }
    for (const pipeline of this.pipelines) {
      if (added.has(pipeline.id)) continue;
      merged.push(pipeline);
      added.add(pipeline.id);
    }
    this.pipelines = merged;
    // Only page 1 is loaded, so adopt its next page; otherwise keep the deeper one.
    if (this.pipelinesPage <= 1) this.pipelinesNextPage = page.nextPage;
  }

  /** Load the next Pipelines page, appending it without disturbing the list. */
  private async loadMore(): Promise<void> {
    if (this.loadMoreBusy) return;
    const page = this.pipelinesNextPage;
    const resolution = this.resolved;
    if (page == null || !resolution) return;
    const gen = this.generation;
    this.loadMoreBusy = true;
    this.render();
    const scope = this.currentScope(resolution.ref);
    const result = await fetchPipelines(
      this.requester(),
      resolution.project,
      { scope, ref: resolution.ref, page },
      this.requestCache,
    );
    const stale = this.disposed || gen !== this.generation;
    this.loadMoreBusy = false;
    if (stale) return;
    if (!result.ok) {
      this.handleFailure(result.failure);
      return;
    }
    this.clearRateLimit();
    this.applyPipelines(result.data, 'append');
    this.seedBridges(gen, resolution.project);
    this.render();
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

  /**
   * Reopen the remembered expansion once the list has loaded. The remembered
   * Pipeline must still be listed; otherwise the view stays collapsed, so a
   * deleted Pipeline leaves nothing dangling.
   */
  private applyRememberedExpansion(gen: number): void {
    const prefs = this.pendingRestore;
    this.pendingRestore = null;
    const pipelineId = prefs?.pipelineId;
    if (pipelineId == null || !this.pipelines.some((pipeline) => pipeline.id === pipelineId)) {
      this.pendingJobId = null;
      return;
    }
    this.expandedId = pipelineId;
    this.pendingJobId = prefs?.jobId ?? null;
    this.downstreamPath = (prefs?.downstream ?? []).map((node) => ({
      project: node.project,
      pipelineId: node.pipelineId,
      generation: node.generation,
      ancestors: node.ancestors.map((key) => ({ project: key.project, pipelineId: key.pipelineId })),
    }));
    // Reopen each remembered card the way `toggleDownstream` would, so its own
    // Jobs and Bridges fill in.
    for (const node of this.downstreamPath) {
      const key = pipelineKey(node.project, node.pipelineId);
      if (!Array.isArray(this.jobs.get(key))) void this.loadJobs(gen, node.project, node.pipelineId, false);
      if (!Array.isArray(this.bridges.get(key))) void this.loadBridges(gen, node.project, node.pipelineId, false);
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
    if (failure.kind === 'rate-limited') {
      // One notice per episode: the first 429 opens it, repeats do not stack.
      if (!this.rateLimited) {
        this.rateLimited = { retryAfterMs: failure.retryAfterMs };
        this.rateLimitNoticeDismissed = false;
      } else if (failure.retryAfterMs != null) {
        this.rateLimited = { retryAfterMs: failure.retryAfterMs };
      }
      this.error = null;
      this.render();
      this.schedulePoll();
      return;
    }
    if (
      failure.kind === 'no-token' ||
      failure.kind === 'unauthorized' ||
      failure.kind === 'forbidden' ||
      failure.kind === 'not-found' ||
      failure.kind === 'service'
    ) {
      this.problem = failureProblem(failure, this.configuredHost());
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
    const project = projectFromRedirectTarget(target, this.configuredHost());
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
    return this.baseUrl().replace(/\/+$/, '');
  }

  private togglePipeline(id: number): void {
    if (this.expandedId === id) {
      this.expandedId = null;
      this.downstreamPath = [];
      this.openJob = null;
      this.persistView();
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
    this.persistView();
    this.render();
  }

  private async loadJobs(gen: number, project: string, pipelineId: number, silent: boolean): Promise<void> {
    const key = pipelineKey(project, pipelineId);
    this.ensureCapability(gen, project);
    if (!silent || !Array.isArray(this.jobs.get(key))) {
      this.jobs.set(key, 'loading');
      this.render();
    }
    const result = await fetchJobs(this.requester(), project, pipelineId, this.requestCache);
    if (this.disposed || gen !== this.generation) return;
    if (result.ok) {
      this.jobs.set(key, result.data);
    } else if (silent) {
      // A background refresh must not discard jobs already on screen.
    } else {
      // A failed fetch is not an absence of jobs; say so rather than showing none.
      this.jobs.set(key, 'error');
    }
    this.restorePendingJob(project, pipelineId);
    this.render();
  }

  /**
   * Reopen the remembered Job once the Pipeline that holds it has loaded its
   * Jobs. A Job that is not in this Pipeline leaves the pending id for another
   * Pipeline's load; one that never appears simply stays closed.
   */
  private restorePendingJob(project: string, pipelineId: number): void {
    const jobId = this.pendingJobId;
    if (jobId == null) return;
    const jobs = this.jobs.get(pipelineKey(project, pipelineId));
    if (!Array.isArray(jobs) || !jobs.some((job) => job.id === jobId)) return;
    this.pendingJobId = null;
    this.openJobDrawer(project, pipelineId, jobId);
  }

  private async loadBridges(gen: number, project: string, pipelineId: number, silent: boolean): Promise<void> {
    const key = pipelineKey(project, pipelineId);
    const result = await fetchBridges(this.requester(), project, pipelineId, this.requestCache);
    if (this.disposed || gen !== this.generation) return;
    if (result.ok) {
      this.bridges.set(key, triggerRows(result.data, project));
      // A Downstream card's actions are gated by its own project, so its
      // capability is read when the bridge reveals it.
      for (const bridge of result.data) {
        const path = bridge.downstream_pipeline ? downstreamProject(bridge.downstream_pipeline) : null;
        if (path) this.ensureCapability(gen, path);
      }
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
    this.persistView();
    const key = jobKey(project, jobId);
    if (this.traces.has(key)) {
      this.render();
      return;
    }
    this.traceLoadingKey = key;
    this.render();
    const job = this.jobById(project, pipelineId, jobId);
    void this.loadTrace(this.generation, project, jobId, job != null && isActiveStatus(job.status));
  }

  /**
   * Load a Job's Trace. A running Job grows its log as a byte-range delta so it
   * is not re-read whole each Poll; a settled Job is one conditional GET, since
   * its body no longer changes. See ADR-0010.
   */
  private async loadTrace(gen: number, project: string, jobId: number, active: boolean): Promise<void> {
    if (active) return this.loadTraceDelta(gen, project, jobId);
    const key = jobKey(project, jobId);
    const result = await fetchTrace(this.requester(), project, jobId, this.requestCache);
    if (this.disposed || gen !== this.generation) return;
    if (this.traceLoadingKey === key) this.traceLoadingKey = null;
    if (!result.ok) {
      // A failed fetch is not a missing log; keep the two apart.
      this.traces.set(key, { state: 'error', text: '', truncated: null });
    } else {
      this.traces.set(key, traceStateOf(result.data ?? '', result.truncated));
    }
    this.render();
  }

  /**
   * Grow a running Job's Trace window by window. Each request asks from the
   * offset already held and appends only the new bytes, continuing while the
   * service says there is more or a window came back full, until the Job
   * settles or the drawer's line cap is reached.
   */
  private async loadTraceDelta(gen: number, project: string, jobId: number): Promise<void> {
    const key = jobKey(project, jobId);
    let offset = this.traceOffsets.get(key) ?? 0;
    const existing = this.traces.get(key);
    let text = existing?.state === 'ready' ? existing.text : '';
    for (;;) {
      const result = await fetchTraceRange(this.requester(), project, jobId, offset);
      if (this.disposed || gen !== this.generation) return;
      if (!result.ok) {
        // Keep what is already on screen rather than blanking a long log.
        if (!text) {
          if (this.traceLoadingKey === key) this.traceLoadingKey = null;
          this.traces.set(key, { state: 'error', text: '', truncated: null });
          this.render();
          return;
        }
        break;
      }
      text += result.data.text;
      offset = result.data.nextOffset;
      if (!result.data.more) break;
      if (logLines(text).length >= LOG_MAX_LINES) break;
    }
    if (this.traceLoadingKey === key) this.traceLoadingKey = null;
    this.traceOffsets.set(key, offset);
    this.traces.set(key, traceStateOf(text, false));
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
    void this.loadTrace(gen, reference.project, reference.jobId, true);
  }

  /**
   * The live Job behind a drawer/`Debug this job` reference: looked up in its own
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
    this.resetTrace();
    this.persistView();
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
   * Whether this Job offers **Debug this job**. Handoff seeds a session in the open checkout, so a
   * Job of a Downstream pipeline in *another* project is deliberately excluded: the checkout cannot
   * fix that project. Only the root Pipeline and its same-project child pipelines qualify. See the
   * Handoff section of `docs/specs/downstream-pipelines.md`.
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
      // A worktree-informed refusal carries `failure`, whose own reason is more
      // useful than the generic "skipped" copy.
      if ('failure' in result && result.failure) {
        this.finishHandoff(
          result.failure === 'bootstrap-failed'
            ? 'OpenChamber could not prepare the session. Try again.'
            : 'OpenChamber could not create the session. Try again.',
        );
        return;
      }
      sent = result.sent;
    } catch (error) {
      this.finishHandoff(this.handoffStartError(error));
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
    const result = await fetchTrace(this.requester(), project, job.id, this.requestCache);
    if (!result.ok) return null;
    const text = result.data ?? '';
    this.traces.set(key, traceStateOf(text, result.truncated));
    return text;
  }

  private finishHandoff(error: string | null): void {
    this.handoffJobId = null;
    this.handoffError = error;
    this.render();
  }

  /**
   * The host's reason for refusing to start a session, in the user's words. The
   * SDK rejects with a `HostRequestError` carrying a `code`; surfacing it is what
   * turns "it failed" into something the user can act on.
   */
  private handoffStartError(error: unknown): string {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
    const message = error instanceof Error ? error.message.trim() : '';
    switch (code) {
      case 'NO_MODEL':
        return 'No model is selected in OpenChamber, so the session was not started.';
      case 'MODEL_FAILED':
        return 'OpenChamber could not start the session: the model call failed.';
      case 'SESSION_BUSY':
        return 'The current OpenChamber session is busy. Try again once it settles.';
      case 'NO_DIRECTORY':
        return 'OpenChamber could not place the session: no project directory is open.';
      case 'DISCONNECTED':
        return 'The OpenChamber server changed while starting the session. Try again.';
      case 'HOST_TIMEOUT':
        return 'OpenChamber did not answer in time while starting the session.';
      case 'HOST_UNAVAILABLE':
        return 'OpenChamber is not reachable, so the session could not be started.';
      case 'NOT_GRANTED':
        return 'OpenChamber has not granted this extension the sessions and prompt capabilities it needs to start a session.';
      case 'DISABLED':
        return 'This extension is disabled in OpenChamber Settings, so it cannot start a session.';
      case 'HOST_REJECTED':
        return message && message !== 'Host did not return a session.'
          ? `Could not start a session: ${message}`
          : 'OpenChamber rejected the session. Check the selected model, then try again.';
      default:
        return message
          ? `Could not start a session: ${message}`
          : 'Could not start a session for this job.';
    }
  }

  // -- pipeline actions -----------------------------------------------------

  /** Why a write failed, in the user's words. */
  private actionFailureText(id: ActionId, failure: ClientFailure): string {
    const action = ACTION_LABELS[id];
    switch (failure.kind) {
      case 'forbidden':
        return `${action} was refused. The token may lack the api scope, or you may not have permission for this project.`;
      case 'unauthorized':
        return `${action} was refused: the Access token was rejected.`;
      case 'not-found':
        return `${action} failed: that Job or Pipeline no longer exists.`;
      case 'no-token':
        return `${action} failed: no Access token is configured for this host.`;
      case 'service':
        return `${action} failed: the Proxy service is unavailable.`;
      case 'rate-limited':
        return `${action} was rate-limited by GitLab. Try again shortly.`;
      case 'http':
        return `${action} failed: GitLab returned ${failure.status}.`;
      default:
        return `${action} failed: could not reach GitLab.`;
    }
  }

  /** Dispatch an action to its one GitLab call. */
  private performAction(
    project: string,
    pipelineId: number,
    jobId: number,
    id: ActionId,
  ): Promise<WriteResult> {
    const requester = this.requester();
    switch (id) {
      case 'retry-job':
        return retryJob(requester, project, jobId);
      case 'play-job':
        return playJob(requester, project, jobId);
      case 'cancel-job':
        return cancelJob(requester, project, jobId);
      case 'force-cancel-job':
        return forceCancelJob(requester, project, jobId);
      case 'retry-pipeline':
        return retryPipeline(requester, project, pipelineId);
      case 'cancel-pipeline':
        return cancelPipeline(requester, project, pipelineId);
      case 'run-pipeline':
        return triggerPipeline(requester, project, this.resolved?.ref ?? '');
    }
  }

  private async runAction(
    project: string,
    pipelineId: number,
    jobId: number,
    id: ActionId,
  ): Promise<void> {
    if (this.actionBusy) return;
    this.actionBusy = true;
    this.render();
    const result = await this.performAction(project, pipelineId, jobId, id);
    if (this.disposed) return;
    this.actionBusy = false;
    if (result.ok) {
      this.showActionNotice('success', ACTION_SUCCESS[id]);
      void this.refreshAfterAction(project, pipelineId);
    } else {
      this.showActionNotice('error', this.actionFailureText(id, result.failure));
    }
  }

  /**
   * Refetch the affected Pipeline at once rather than waiting for the next poll:
   * its Jobs and Bridges where they are already cached, then the list, so a retry
   * or cancel is reflected immediately — including on a Downstream card.
   */
  private async refreshAfterAction(project: string, pipelineId: number): Promise<void> {
    const gen = this.generation;
    const key = pipelineKey(project, pipelineId);
    const pending: Array<Promise<void>> = [];
    if (this.bridges.has(key)) pending.push(this.loadBridges(gen, project, pipelineId, true));
    if (Array.isArray(this.jobs.get(key))) pending.push(this.loadJobs(gen, project, pipelineId, true));
    await Promise.all(pending);
    if (this.disposed) return;
    this.refresh();
  }

  private showActionNotice(kind: 'success' | 'error', text: string): void {
    if (this.actionNoticeTimer != null) {
      this.timers.clearTimeout(this.actionNoticeTimer);
      this.actionNoticeTimer = null;
    }
    this.actionNotice = { kind, text };
    if (kind === 'success') {
      // Success is momentary; a failure stays until dismissed.
      this.actionNoticeTimer = this.timers.setTimeout(() => {
        this.actionNoticeTimer = null;
        this.actionNotice = null;
        this.render();
      }, ACTION_NOTICE_MS);
    }
    this.render();
  }

  /** The `⋯` menu for a Job row or the drawer header, or null when there is nothing to offer. */
  private renderJobActions(project: string, pipelineId: number, job: Job): HTMLElement | null {
    const capability = this.capabilityFor(project);
    if (!capability) return null;
    const state = menuState('job', job.status, capability);
    if (state.state === 'hidden') return null;
    const root = el('div', 'gp-actions');
    if (state.state === 'disabled') this.mountDisabledActions(root);
    else this.mountActionsMenu(root, state.items, project, pipelineId, job.id);
    return root;
  }

  /** The `⋯` menu for a Pipeline row or a Downstream card. */
  private renderPipelineActions(project: string, pipelineId: number, status: string): HTMLElement | null {
    const capability = this.capabilityFor(project);
    if (!capability) return null;
    const state = menuState('pipeline', status, capability);
    if (state.state === 'hidden') return null;
    const root = el('div', 'gp-actions');
    if (state.state === 'disabled') this.mountDisabledActions(root);
    else this.mountActionsMenu(root, state.items, project, pipelineId, 0);
    return root;
  }

  private mountActionsMenu(
    root: HTMLElement,
    items: ActionId[],
    project: string,
    pipelineId: number,
    jobId: number,
  ): void {
    const handle = mountMenu(root, {
      label: '⋯',
      variant: 'ghost',
      size: 'xs',
      items: items.map((id) => ({
        id,
        label: ACTION_LABELS[id],
        ...(id === 'force-cancel-job' ? { destructive: true } : {}),
      })),
      onSelect: (id) => void this.runAction(project, pipelineId, jobId, id as ActionId),
    });
    this.handles.push(handle);
    this.patchMenuTrigger(root);
    root.addEventListener('click', (event) => event.stopPropagation());
  }

  /** A menu with its items withheld because the token cannot write. */
  private mountDisabledActions(root: HTMLElement): void {
    const handle = mountMenu(root, {
      label: '⋯',
      variant: 'ghost',
      size: 'xs',
      items: [],
      onSelect: () => {},
    });
    this.handles.push(handle);
    const trigger = this.patchMenuTrigger(root, 'Pipeline actions need an api-scoped token.');
    if (trigger) trigger.disabled = true;
    root.addEventListener('click', (event) => event.stopPropagation());
  }

  /** Name the glyph-only trigger for assistive tech, which reads '⋯' as punctuation. */
  private patchMenuTrigger(root: HTMLElement, title = 'Pipeline actions'): HTMLButtonElement | null {
    const trigger = root.querySelector('button');
    if (!trigger) return null;
    trigger.setAttribute('aria-label', 'Pipeline actions');
    trigger.title = title;
    return trigger;
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
    const base = nextPollDelay(this.visibleStatuses(), { elapsedMs: now - this.pollStartedAt });
    const rate = this.rateLimited;
    // A rate-limit episode keeps polling even when nothing looks active, so the
    // list can recover; otherwise a settled view stops as before.
    if (base == null && !rate) {
      this.pollStartedAt = null;
      return;
    }
    let delay = base ?? POLL_INTERVAL_MS;
    if (rate) delay = rateLimitedDelay(delay, rate.retryAfterMs);
    // Pre-emptive widening is only for an ordinary success; a 429 already set
    // its own delay above.
    else delay = widenForLowRateLimit(delay, this.lastRateRemaining);
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

  // -- configuration --------------------------------------------------------

  /** The Configured host the service owns. */
  private configuredHost(): string {
    return this.config?.host ?? DEFAULT_HOST;
  }

  /** The base URL for the Configured host. */
  private baseUrl(): string {
    return `https://${this.configuredHost()}`;
  }

  private openConfig(host?: string): void {
    this.configOpen = true;
    this.configError = null;
    this.configDraft = {
      host: host ?? this.config?.host ?? DEFAULT_HOST,
      project: this.config?.project ?? '',
      token: '',
    };
    this.render();
  }

  private closeConfig(): void {
    this.configOpen = false;
    this.configError = null;
    this.configDraft = null;
    this.render();
  }

  /**
   * Persist the configuration form. The host and Project override go to
   * `/config`; a non-empty Access token goes to `/token` in a second request and
   * is never read back. A malformed host is refused here, so no request is made.
   */
  private async submitConfig(input: { host: string; project: string; token: string }): Promise<void> {
    if (this.configBusy) return;
    // An empty host clears back to the default rather than being malformed.
    const raw = input.host.trim();
    const host = raw === '' ? DEFAULT_HOST : normalizeHostInput(raw);
    if (!host) {
      this.configError = 'Enter a bare host like gitlab.example.com, or a full https:// origin.';
      this.render();
      return;
    }
    this.configBusy = true;
    this.configError = null;
    this.render();
    try {
      const saved = await this.postConfig(SERVICE_CONFIG_PATH, { host, project: input.project.trim() });
      if (!saved.ok) {
        this.configError = saved.error;
        return;
      }
      // Adopt the saved host/override even if the token write below fails, so
      // the Panel and the service never disagree about the host.
      this.applyConfig(saved.config);
      if (input.token.trim()) {
        const stored = await this.postConfig(SERVICE_TOKEN_PATH, {
          host,
          token: input.token.trim(),
        });
        if (!stored.ok) {
          this.configError = stored.error;
          return;
        }
        this.applyConfig(stored.config);
        // A new token may carry different scopes; re-read them rather than
        // keeping the previous token's capability.
        this.invalidateCapability();
      }
      this.configOpen = false;
      this.configDraft = null;
      this.refresh();
    } finally {
      this.configBusy = false;
      this.render();
    }
  }

  /** Clear the Access token for a host, then reload. */
  private async clearTokenFor(host: string): Promise<void> {
    if (this.configBusy) return;
    this.configBusy = true;
    this.configError = null;
    this.render();
    try {
      const result = await this.postConfig(SERVICE_TOKEN_PATH, { host, token: null });
      if (!result.ok) {
        this.configError = result.error;
        return;
      }
      this.applyConfig(result.config);
      this.invalidateCapability();
      this.refresh();
    } finally {
      this.configBusy = false;
      this.render();
    }
  }

  private async postConfig(path: string, body: Record<string, unknown>): Promise<ConfigResult> {
    let response;
    try {
      response = await this.port.serviceRequest({ method: 'POST', path, body: JSON.stringify(body) });
    } catch (error) {
      return { ok: false, error: serviceErrorMessage(error) };
    }
    const config =
      response.status >= 200 && response.status < 300 ? parseConfigEnvelope(response.body) : null;
    if (!config) return { ok: false, error: 'The configuration could not be saved.' };
    return { ok: true, config };
  }

  /**
   * Remember GitLab's remaining budget from an ordinary success, so a low one
   * widens the Poll pre-emptively rather than waiting for a 429. A 429's own
   * headers are deliberately ignored: its `Retry-After` already sets the delay,
   * and doubling it again would over-pause.
   */
  private recordRateLimit(status: number, headers: Record<string, string> | undefined): void {
    if (status < 200 || status >= 300) return;
    const remaining = headers?.['ratelimit-remaining'];
    if (remaining != null && /^\d+$/.test(remaining)) this.lastRateRemaining = Number(remaining);
  }

  /** End a rate-limit episode: the notice and the widened poll both clear. */
  private clearRateLimit(): void {
    this.rateLimited = null;
    this.rateLimitNoticeDismissed = false;
  }

  /**
   * The one call every GitLab fetch makes: the Proxy service resolves the
   * Access token for the request's host and attaches it, so the Panel never
   * holds one. Only the base URL rides in the query, for the service's logs.
   */
  private requester(): Requester {
    const base = this.baseUrl();
    return async (request) => {
      const response = await this.port.serviceRequest({
        method: 'POST',
        path: SERVICE_PATH,
        body: JSON.stringify({
          baseUrl: base,
          method: request.method ?? 'GET',
          path: request.path,
          query: request.query ?? {},
          ...(request.body != null ? { body: request.body } : {}),
          ...(request.headers ? { headers: request.headers } : {}),
        }),
      });
      const parsed = parseProxyEnvelope(response);
      this.recordRateLimit(parsed.status, parsed.headers);
      return parsed;
    };
  }

  private disposeHandles(): void {
    for (const handle of this.handles.splice(0)) handle.dispose();
  }

  private render(): void {
    if (this.disposed) return;
    this.disposeHandles();
    if (this.scrollEl) this.scrollTop = this.scrollEl.scrollTop;
    clearNode(this.root);
    this.root.className = 'gp';

    const progress = el('div', 'gp-progress');
    if (!this.isFirstLoad()) progress.hidden = true;
    this.root.append(progress);

    this.root.append(this.renderHeader());
    if (this.configOpen) this.root.append(this.renderConfigForm());
    const handoffNotice = this.renderHandoffNotice();
    if (handoffNotice) this.root.append(handoffNotice);
    const healNotice = this.renderHealNotice();
    if (healNotice) this.root.append(healNotice);
    const fallbackNotice = this.renderFallbackNotice();
    if (fallbackNotice) this.root.append(fallbackNotice);
    const scopeNotice = this.renderScopeNotice();
    if (scopeNotice) this.root.append(scopeNotice);
    const actionNotice = this.renderActionNotice();
    if (actionNotice) this.root.append(actionNotice);
    const rateNotice = this.renderRateLimitNotice();
    if (rateNotice) this.root.append(rateNotice);

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
    // The drawer was painted while detached, where layout is unavailable; repaint
    // now, and once more after the next layout, so the first view uses the real
    // viewport and width and measures its rows.
    if (this.openJob && this.drawerEl && this.traceLines.length > 0) {
      this.paintTrace(this.drawerEl, true);
      this.afterLayout(() => this.repaintTrace(true));
    }

    if (this.scrollEl) this.scrollEl.scrollTop = this.scrollTop;
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

    // One context line: `host/project · user` on the left, freshness and the
    // panel's controls on the right. The path truncates so the row stays one line.
    const projectPath = el('div', 'gp-project');
    const pathText = el('span', 'gp-project-path');
    if (this.resolved) {
      pathText.textContent = `${this.resolved.host}/${this.resolved.project}`;
    } else {
      pathText.hidden = true;
    }
    projectPath.append(pathText);
    if (this.username) projectPath.append(el('span', 'gp-head-user', this.username));
    if (!this.resolved) projectPath.hidden = true;
    row.append(projectPath, el('span', 'gp-spacer'));

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

    const ref = this.resolved?.ref;
    const capability = this.resolved ? this.capabilityFor(this.resolved.project) : null;
    if (ref && capability && canRunPipeline(capability)) {
      const runRoot = el('div', 'gp-run');
      this.handles.push(
        mountButton(runRoot, {
          label: 'Run pipeline',
          variant: 'outline',
          size: 'sm',
          disabled: this.actionBusy,
          onClick: () => void this.runAction(this.resolved?.project ?? '', 0, 0, 'run-pipeline'),
        }),
      );
      row.append(runRoot);
    }

    const config = el('button', 'gp-iconbtn gp-config-open');
    config.type = 'button';
    config.setAttribute('aria-label', 'Configure');
    config.title = 'Configure';
    config.innerHTML = GEAR_ICON;
    if (this.configOpen) config.setAttribute('aria-expanded', 'true');
    config.addEventListener('click', () => (this.configOpen ? this.closeConfig() : this.openConfig()));
    row.append(config);

    const refresh = el('button', 'gp-iconbtn');
    refresh.type = 'button';
    refresh.setAttribute('aria-label', 'Refresh');
    refresh.title = 'Refresh';
    refresh.innerHTML = REFRESH_ICON;
    if (this.isFirstLoad()) refresh.dataset.spinning = 'true';
    refresh.addEventListener('click', () => this.refresh());
    row.append(refresh);
    head.append(row);

    head.append(this.renderScope());
    return head;
  }

  /**
   * The configuration form: Configured host, Project override and Access token.
   * The token field is masked, starts empty and is posted once — the Panel never
   * reads a token back, so an existing token shows only as a placeholder.
   */
  private renderConfigForm(): HTMLElement {
    const config = this.config;
    const host = config?.host ?? DEFAULT_HOST;
    const tokenSet = config ? hasToken(config, host) : false;

    // A plain container, not a `<form>`: the sandboxed panel runs without
    // `allow-forms`, so a native submit is blocked and its event never fires.
    // Save is driven by the button click below. See
    // docs/research/openchamber-extension-research.md §8.5.
    const form = el('div', 'gp-config');

    const field = (labelText: string, input: HTMLInputElement): HTMLElement => {
      const wrap = el('label', 'gp-config-field');
      wrap.append(el('span', 'gp-config-label', labelText), input);
      return wrap;
    };

    const draft = this.configDraft ?? { host, project: config?.project ?? '', token: '' };

    const hostInput = document.createElement('input');
    hostInput.className = 'gp-config-host';
    hostInput.name = 'host';
    hostInput.type = 'text';
    hostInput.value = draft.host;
    hostInput.placeholder = DEFAULT_HOST;
    hostInput.addEventListener('input', () => {
      if (this.configDraft) this.configDraft.host = hostInput.value;
    });
    form.append(field('Configured host', hostInput));

    const projectInput = document.createElement('input');
    projectInput.className = 'gp-config-project';
    projectInput.name = 'project';
    projectInput.type = 'text';
    projectInput.value = draft.project;
    projectInput.placeholder = 'group/project';
    projectInput.addEventListener('input', () => {
      if (this.configDraft) this.configDraft.project = projectInput.value;
    });
    form.append(field('Project override', projectInput));

    const tokenInput = document.createElement('input');
    tokenInput.className = 'gp-config-token';
    tokenInput.name = 'token';
    tokenInput.type = 'password';
    tokenInput.value = draft.token;
    tokenInput.autocomplete = 'off';
    tokenInput.placeholder = tokenSet ? 'A token is saved' : 'read_api or api token';
    tokenInput.addEventListener('input', () => {
      if (this.configDraft) this.configDraft.token = tokenInput.value;
    });
    form.append(field('Access token', tokenInput));

    if (this.configError) form.append(el('p', 'gp-config-error', this.configError));

    const actions = el('div', 'gp-config-actions');
    const save = el('button', 'gp-config-save');
    save.type = 'button';
    save.textContent = this.configBusy ? 'Saving…' : 'Save';
    save.disabled = this.configBusy;
    actions.append(save);

    if (tokenSet) {
      const clear = el('button', 'gp-config-clear');
      clear.type = 'button';
      clear.textContent = 'Clear token';
      clear.disabled = this.configBusy;
      clear.addEventListener('click', () => void this.clearTokenFor(host));
      actions.append(clear);
    }

    const cancel = el('button', 'gp-config-cancel');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.closeConfig());
    actions.append(cancel);
    form.append(actions);

    const submit = (): void => {
      void this.submitConfig({
        host: hostInput.value,
        project: projectInput.value,
        token: tokenInput.value,
      });
    };
    save.addEventListener('click', submit);
    // Enter in a field saves too; there is no native form submit to fall back on.
    form.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement | null;
      if (event.key === 'Enter' && target?.tagName === 'INPUT') {
        event.preventDefault();
        submit();
      }
    });
    return form;
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
    if (this.pipelinesNextPage != null) {
      const more = el('div', 'gp-more');
      this.handles.push(
        mountButton(more, {
          label: this.loadMoreBusy ? 'Loading…' : 'Load more',
          variant: 'outline',
          size: 'sm',
          disabled: this.loadMoreBusy,
          onClick: () => void this.loadMore(),
        }),
      );
      nodes.push(more);
    }
    return nodes;
  }

  private renderProblem(problem: Problem): HTMLElement {
    const state = el('div', 'gp-state');
    const title = el('h2', 'gp-state-title', problem.title);
    state.append(title, el('p', 'gp-state-body', problem.body));
    if (problem.detail) state.append(el('p', 'gp-state-detail', problem.detail));
    if (problem.hint) state.append(el('p', 'gp-state-hint', problem.hint));
    const actions = el('div', 'gp-state-actions');
    if (problem.configure) {
      const configureRoot = el('div');
      this.handles.push(
        mountButton(configureRoot, {
          label: 'Configure',
          variant: 'default',
          size: 'sm',
          onClick: () => this.openConfig(problem.configureHost),
        }),
      );
      actions.append(configureRoot);
    }
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

    // A div with button semantics, like the Job row, so the actions menu can nest
    // a real button inside it without nesting buttons.
    const row = el('div', 'gp-row');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
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
    row.addEventListener('keydown', (event) => {
      // Only when the row itself is focused; a nested control owns its own keys.
      if (event.target !== row) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.togglePipeline(pipeline.id);
      }
    });
    const actions = this.renderPipelineActions(project, pipeline.id, pipeline.status);
    if (actions) row.append(actions);
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
      // Debug this job stays inside the open project: a multi-project Downstream
      // job renders without it, since the checkout cannot fix another project.
      if (isHandoffJob(job) && this.canHandoffJob(project)) row.append(this.renderHandoffAction(project, pipelineId, job));
      const actions = this.renderJobActions(project, pipelineId, job);
      if (actions) row.append(actions);
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
    // card is display-only: it never fetches jobs or offers Debug this job.
    const projectPath = downstreamProject(downstream);
    const parent = parentNode ?? this.nodeFor(project, pipelineId);
    const cardProject = projectPath ?? '';
    const actions = this.renderPipelineActions(cardProject, downstream.id, downstream.status);
    if (actions) meta.append(actions);

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
    this.persistView();
    this.render();
  }

  /** The "Debug this job" affordance for a failed Job, on its row or in the drawer. */
  private renderHandoffAction(project: string, pipelineId: number, job: Job): HTMLElement {
    const button = el('button', 'gp-handoff');
    button.type = 'button';
    const busy = this.handoffJobId === job.id;
    const canHandoff = this.canHandoff();
    button.disabled = !canHandoff || busy;
    const label = busy ? 'Starting…' : 'Debug this job';
    button.innerHTML = `${BUG_ICON}<span class="gp-handoff-label">${label}</span>`;
    button.title = canHandoff
      ? 'Start a session to debug this failed job'
      : this.directory == null
        ? 'Open a project to debug this job — a session needs a checkout.'
        : 'This project could not be resolved, so a session cannot be started.';
    button.setAttribute('aria-label', `${label} — ${job.name}`);
    if (canHandoff && !busy) {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.startHandoff(project, pipelineId, job.id);
      });
    }
    return button;
  }

  /** The shared shape of every panel notice: text, an optional action, and Dismiss. */
  private notice(
    text: string,
    options: {
      role: 'status' | 'alert';
      tone?: string;
      action?: { label: string; onClick: () => void };
      onDismiss: () => void;
    },
  ): HTMLElement {
    const notice = el('div', 'gp-notice');
    if (options.tone) notice.dataset.tone = options.tone;
    notice.setAttribute('role', options.role);
    notice.append(el('span', 'gp-notice-text', text));
    if (options.action) {
      const action = el('button', 'gp-notice-action');
      action.type = 'button';
      action.textContent = options.action.label;
      action.addEventListener('click', options.action.onClick);
      notice.append(action);
    }
    const dismiss = el('button', 'gp-notice-close');
    dismiss.type = 'button';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', options.onDismiss);
    notice.append(dismiss);
    return notice;
  }

  /** The one-time notice after a heal, naming the old path and the target. */
  private renderHealNotice(): HTMLElement | null {
    if (!this.healNotice) return null;
    const host = this.configuredHost();
    const { from, to } = this.healNotice;
    return this.notice(`Showing ${host}/${from} as ${host}/${to}.`, {
      role: 'status',
      onDismiss: () => {
        this.healNotice = null;
        this.render();
      },
    });
  }

  private renderHandoffNotice(): HTMLElement | null {
    if (!this.handoffError) return null;
    return this.notice(this.handoffError, {
      role: 'alert',
      onDismiss: () => this.finishHandoff(null),
    });
  }

  /** The one-time all-refs fallback, naming the Ref and offering a way back. */
  private renderFallbackNotice(): HTMLElement | null {
    if (!this.fallbackNotice) return null;
    const { ref } = this.fallbackNotice;
    return this.notice(`No pipelines for ${ref}. Showing all refs instead.`, {
      role: 'status',
      tone: 'info',
      action: {
        label: 'Back to branch',
        onClick: () => {
          this.fallbackNotice = null;
          this.setScope('branch');
        },
      },
      onDismiss: () => {
        this.fallbackNotice = null;
        this.render();
      },
    });
  }

  /** A one-time note that the token is read-only, so a withheld menu has its reason on screen. */
  private renderScopeNotice(): HTMLElement | null {
    if (this.tokenCanWrite !== false || this.scopeNoticeDismissed) return null;
    return this.notice(
      'Pipeline actions need a token with the api scope. This token is read-only.',
      {
        role: 'status',
        tone: 'info',
        onDismiss: () => {
          this.scopeNoticeDismissed = true;
          this.render();
        },
      },
    );
  }

  /** The last action's outcome: success auto-dismisses, failure stays until dismissed. */
  private renderActionNotice(): HTMLElement | null {
    if (!this.actionNotice) return null;
    return this.notice(this.actionNotice.text, {
      role: this.actionNotice.kind === 'error' ? 'alert' : 'status',
      tone: this.actionNotice.kind,
      onDismiss: () => {
        if (this.actionNoticeTimer != null) {
          this.timers.clearTimeout(this.actionNoticeTimer);
          this.actionNoticeTimer = null;
        }
        this.actionNotice = null;
        this.render();
      },
    });
  }

  /** One notice per rate-limit episode, until a request succeeds. */
  private renderRateLimitNotice(): HTMLElement | null {
    if (!this.rateLimited || this.rateLimitNoticeDismissed) return null;
    return this.notice(
      'GitLab rate-limited this host, so the panel paused. It will resume automatically.',
      {
        role: 'status',
        tone: 'info',
        onDismiss: () => {
          this.rateLimitNoticeDismissed = true;
          this.render();
        },
      },
    );
  }

  private renderDrawer(reference: OpenJob): HTMLElement {
    const drawer = el('div', 'gp-drawer');
    const job = this.jobById(reference.project, reference.pipelineId, reference.jobId);

    const head = el('div', 'gp-drawer-head');
    const title = el('span', 'gp-drawer-title', job ? `${job.name} · ${jobStatusInfo(job).label}` : `Job #${reference.jobId}`);
    head.append(title);
    if (job?.web_url) head.append(this.renderExternalLink('gp-drawer-link', 'View full log in GitLab', job.web_url));
    // Debug this job only inside the open project, matching the row's own gating.
    if (job && isHandoffJob(job) && this.canHandoffJob(reference.project)) {
      head.append(this.renderHandoffAction(reference.project, reference.pipelineId, job));
    }
    if (job) {
      const actions = this.renderJobActions(reference.project, reference.pipelineId, job);
      if (actions) head.append(actions);
    }
    const close = el('button', 'gp-drawer-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close log');
    close.title = 'Close';
    close.innerHTML = CLOSE_ICON;
    close.addEventListener('click', () => this.closeDrawer());
    head.append(close);
    drawer.append(head);
    this.watchDrawerKeys();

    const entry = this.traces.get(jobKey(reference.project, reference.jobId));
    if (!entry) {
      this.suspendTrace();
      drawer.append(el('div', 'gp-drawer-empty', 'Loading log…'));
      return drawer;
    }
    if (entry.state === 'error') {
      this.suspendTrace();
      drawer.append(el('div', 'gp-drawer-empty', 'Could not load the log. Close and reopen to retry.'));
      return drawer;
    }

    // Ready, or missing (an empty Trace). Find and Copy stay available either way,
    // so an empty log counts zero matches rather than erroring.
    this.ensureTrace(jobKey(reference.project, reference.jobId), entry.text);
    drawer.append(this.renderTraceTools());
    if (entry.truncated) drawer.append(truncationNotice(entry.truncated));
    const body = el('div', 'gp-drawer-body');
    body.addEventListener('scroll', () => {
      const top = body.scrollTop;
      const programmatic = top === this.traceScrollSet;
      this.traceScrollSet = -1;
      // Ignore the one scroll event our own paint caused, so follow-tail is not
      // switched off by a programmatic scroll — but only that one.
      if (programmatic) return;
      this.drawerScrollTop = top;
      this.followTail = this.traceAtBottom(top);
      // Windowed rendering: the rows for the newly visible range must be
      // rendered as the user scrolls, or the log shows only its first window.
      if (this.traceLines.length > 0) this.repaintTrace(false);
    });
    this.drawerEl = body;
    drawer.append(body);
    this.watchTraceResize(body);
    if (entry.state === 'missing') {
      body.append(el('div', 'gp-drawer-empty', 'No log output yet — the job has not started.'));
    } else {
      this.paintTrace(body, true);
    }
    return drawer;
  }

  /** Ctrl/Cmd+F focuses find while the drawer is open; Esc closes the drawer. */
  private watchDrawerKeys(): void {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
        // Only claim the shortcut where there is a find field, so a loading or
        // error drawer never shadows the host's own find.
        if (!this.drawerFindEl) return;
        event.preventDefault();
        this.drawerFindEl.focus();
      } else if (event.key === 'Escape') {
        this.closeDrawer();
      }
    };
    document.addEventListener('keydown', onKey);
    this.handles.push({ dispose: () => document.removeEventListener('keydown', onKey) });
  }

  /** Repaint when the drawer's size changes: the window and wrapping depend on it. */
  private watchTraceResize(body: HTMLElement): void {
    const view = body.ownerDocument.defaultView;
    const Observer = view?.ResizeObserver;
    if (Observer) {
      const observer = new Observer(() => this.repaintTrace(this.followTail));
      observer.observe(body);
      this.handles.push({ dispose: () => observer.disconnect() });
    }
    // A belt-and-braces trigger for a host that resizes the panel without
    // resizing the body's content box (or where ResizeObserver is unavailable).
    if (view) {
      const onResize = (): void => this.repaintTrace(this.followTail);
      view.addEventListener('resize', onResize);
      this.handles.push({ dispose: () => view.removeEventListener('resize', onResize) });
    }
  }

  /** Run once after the next layout, so a just-attached element measures correctly. */
  private afterLayout(callback: () => void): void {
    const view = this.root.ownerDocument.defaultView;
    if (!view?.requestAnimationFrame) return;
    const handle = view.requestAnimationFrame(() => callback());
    this.handles.push({ dispose: () => view.cancelAnimationFrame(handle) });
  }

  private idleScheduler(): IdleScheduler {
    return {
      request: (callback) => this.timers.requestIdleCallback(callback),
      cancel: (handle) => this.timers.cancelIdleCallback(handle),
    };
  }

  /**
   * Point the log view at a Trace. A new Job resets it; appended text is fed to
   * the indexer from where it stopped. Heights survive an append, except for the
   * previously partial last line, whose content an append can change.
   */
  private ensureTrace(key: string, text: string): void {
    if (this.traceKey !== key) {
      this.resetTrace();
      this.traceKey = key;
    }
    if (this.traceRawText === text) return;
    const lines = tailLines(text, LOG_MAX_LINES);
    const display = lines.join('\n');
    if (this.traceText && !display.startsWith(this.traceText)) {
      // The held text was replaced, not extended: earlier heights and index void.
      this.traceHeights.clear();
      this.traceErrors = [];
      this.traceIndexed = false;
      this.traceWindowStart = -1;
    } else if (display.length > this.traceText.length && this.traceLines.length > 0) {
      // An append can lengthen the previously partial last line.
      const last = this.traceLines.length - 1;
      this.traceHeights.delete(last);
    }
    this.traceLines = lines;
    this.traceText = display;
    this.traceRawText = text;
    this.traceCopyText = text;
    if (!this.traceIndexer) {
      this.traceIndexer = new TraceIndexer(this.idleScheduler(), () => this.onIndexUpdate());
    }
    this.traceIndexer.setText(display);
  }

  /** Reset the log view's data and element references, disposing its index. */
  private resetTrace(): void {
    this.disposeTraceIndexer();
    if (this.traceFindTimer != null) {
      this.timers.clearTimeout(this.traceFindTimer);
      this.traceFindTimer = null;
    }
    this.traceKey = null;
    this.traceLines = [];
    this.traceText = '';
    this.traceRawText = null;
    this.traceCopyText = '';
    this.traceFindQuery = '';
    this.traceMatches = [];
    this.traceMatchAt = -1;
    this.traceErrors = [];
    this.traceHeights.clear();
    this.traceIndexed = false;
    this.traceWindowStart = -1;
    this.clearTraceRefs();
  }

  /** Drop stale element references so a background index update cannot touch them. */
  private suspendTrace(): void {
    this.disposeTraceIndexer();
    this.traceRawText = null;
    this.traceIndexed = false;
    this.traceWindowStart = -1;
    this.clearTraceRefs();
  }

  private clearTraceRefs(): void {
    this.drawerEl = null;
    this.drawerFindEl = null;
    this.drawerCountEl = null;
    this.drawerToolsEl = null;
    this.drawerCopyEl = null;
    this.drawerJumpEl = null;
  }

  private disposeTraceIndexer(): void {
    this.traceIndexer?.dispose();
    this.traceIndexer = null;
  }

  private renderTraceTools(): HTMLElement {
    const tools = el('div', 'gp-drawer-tools');
    const find = document.createElement('input');
    find.type = 'search';
    find.className = 'gp-log-find';
    find.placeholder = 'Find in log';
    find.value = this.traceFindQuery;
    find.setAttribute('aria-label', 'Find in log');
    find.addEventListener('input', () => this.setTraceQuery(find.value));
    find.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey) this.traceFindPrevious();
        else this.traceFindNext();
      }
    });
    this.drawerFindEl = find;
    tools.append(find);

    const count = el('span', 'gp-log-count', this.traceCountText());
    this.drawerCountEl = count;
    tools.append(count);

    const previous = el('button', 'gp-log-prev');
    previous.type = 'button';
    previous.title = 'Previous match';
    previous.setAttribute('aria-label', 'Previous match');
    previous.textContent = '↑';
    previous.addEventListener('click', () => this.traceFindPrevious());
    tools.append(previous);

    const next = el('button', 'gp-log-next');
    next.type = 'button';
    next.title = 'Next match';
    next.setAttribute('aria-label', 'Next match');
    next.textContent = '↓';
    next.addEventListener('click', () => this.traceFindNext());
    tools.append(next);

    const copy = el('button', 'gp-log-copy', 'Copy');
    copy.type = 'button';
    copy.title = 'Copy the trace';
    copy.addEventListener('click', () => void this.copyTrace());
    this.drawerCopyEl = copy;
    tools.append(copy);

    this.drawerToolsEl = tools;
    this.drawerJumpEl = null;
    this.syncJumpButton();
    return tools;
  }

  /** Jump to error is present only while the index reports an error line. */
  private syncJumpButton(): void {
    const hasErrors = this.traceErrors.length > 0;
    if (hasErrors && !this.drawerJumpEl && this.drawerToolsEl) {
      const jump = el('button', 'gp-log-jump', 'Jump to error');
      jump.type = 'button';
      jump.addEventListener('click', () => this.jumpToError());
      this.drawerToolsEl.insertBefore(jump, this.drawerCopyEl);
      this.drawerJumpEl = jump;
    } else if (!hasErrors && this.drawerJumpEl) {
      this.drawerJumpEl.remove();
      this.drawerJumpEl = null;
    }
  }

  private traceCountText(): string {
    if (!this.traceFindQuery) return '';
    if (this.traceMatches.length === 0) return '0';
    return `${this.traceMatchAt + 1}/${this.traceMatches.length}`;
  }

  private updateFindCount(): void {
    if (this.drawerCountEl) this.drawerCountEl.textContent = this.traceCountText();
    this.syncJumpButton();
  }

  private onIndexUpdate(): void {
    this.traceErrors = this.traceIndexer?.errors() ?? [];
    this.traceMatches = this.traceIndexer?.find(this.traceFindQuery) ?? [];
    if (this.traceMatchAt >= this.traceMatches.length) this.traceMatchAt = this.traceMatches.length - 1;
    this.updateFindCount();
    const complete = this.traceIndexer?.complete ?? false;
    if (complete && !this.traceIndexed) {
      // The index now knows every line: repaint so heights and highlights are exact.
      this.traceIndexed = true;
      // New highlights need a repaint even if the window has not moved.
      this.traceWindowStart = -1;
      this.repaintTrace(this.followTail);
    } else if (!complete) {
      this.traceIndexed = false;
    }
  }

  private setTraceQuery(query: string): void {
    this.traceFindQuery = query;
    // Debounce the search over the index: a fast typist does not force one full
    // scan per keystroke. The count and highlights update when the debounce runs.
    if (this.traceFindTimer != null) this.timers.clearTimeout(this.traceFindTimer);
    this.traceFindTimer = this.timers.setTimeout(() => {
      this.traceFindTimer = null;
      this.runTraceFind();
    }, LOG_FIND_DEBOUNCE_MS);
  }

  private runTraceFind(): void {
    this.traceMatches = this.traceIndexer?.find(this.traceFindQuery) ?? [];
    this.traceMatchAt = this.traceMatches.length > 0 ? 0 : -1;
    if (this.traceMatchAt >= 0) this.scrollToTraceLine(this.traceMatches[this.traceMatchAt]!);
    this.updateFindCount();
    this.repaintTrace(true);
  }

  private traceFindNext(): void {
    if (this.traceMatches.length === 0) return;
    this.traceMatchAt = (this.traceMatchAt + 1) % this.traceMatches.length;
    this.scrollToTraceLine(this.traceMatches[this.traceMatchAt]!);
    this.updateFindCount();
    this.repaintTrace(true);
  }

  private traceFindPrevious(): void {
    if (this.traceMatches.length === 0) return;
    this.traceMatchAt = (this.traceMatchAt - 1 + this.traceMatches.length) % this.traceMatches.length;
    this.scrollToTraceLine(this.traceMatches[this.traceMatchAt]!);
    this.updateFindCount();
    this.repaintTrace(true);
  }

  private jumpToError(): void {
    const errors = this.traceErrors;
    if (errors.length === 0) return;
    this.scrollToTraceLine(errors[errors.length - 1]!);
    this.repaintTrace(true);
  }

  private scrollToTraceLine(index: number): void {
    let offset = 0;
    for (let line = 0; line < index; line++) offset += this.traceLineHeight(line);
    this.followTail = false;
    this.drawerScrollTop = offset;
  }

  private async copyTrace(): Promise<void> {
    try {
      await this.port.writeClipboard(this.traceCopyText);
    } catch {
      // A clipboard failure is the host's; the log stays readable.
    }
  }

  /**
   * A row's height: measured where layout allows, otherwise estimated from how
   * many fallback-width rows its text wraps to.
   */
  private traceLineHeight(index: number): number {
    const measured = this.traceHeights.get(index);
    if (measured != null) return measured;
    // No measured height yet: estimate from the line's wrap at the current width.
    const text = this.traceIndexer?.lineAt(index)?.text ?? this.traceLines[index] ?? '';
    return text.length === 0
      ? LOG_LINE_HEIGHT
      : Math.ceil(text.length / this.traceWrapChars()) * LOG_LINE_HEIGHT;
  }

  /**
   * Characters per rendered row, from the drawer's real width and the monospace
   * advance width at its font. A row is only estimated before it has been
   * measured, so the closer this is the less the spacers drift as rows mount.
   */
  private traceWrapChars(): number {
    const el = this.drawerEl;
    if (!el || el.clientWidth <= 0) return LOG_WRAP_CHARS;
    const style = el.ownerDocument.defaultView?.getComputedStyle(el);
    const padding = style
      ? (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
      : 0;
    const available = Math.max(1, el.clientWidth - padding - 1);
    return Math.max(1, Math.floor(available / this.traceCharWidth(el)));
  }

  /** The monospace advance width in CSS pixels, measured once and cached. */
  private traceCharWidth(el: HTMLElement): number {
    if (this.traceCharWidthPx != null) return this.traceCharWidthPx;
    let width = DEFAULT_CHAR_WIDTH;
    try {
      const canvas = el.ownerDocument.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const view = el.ownerDocument.defaultView;
      if (ctx && view) {
        const style = view.getComputedStyle(el);
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const sample = ctx.measureText('x'.repeat(50)).width / 50;
        if (sample > 0) width = sample;
      }
    } catch {
      // No canvas: the fallback advance is close enough to keep the estimate useful.
    }
    this.traceCharWidthPx = width;
    return width;
  }

  private traceViewport(): number {
    const body = this.drawerEl?.clientHeight ?? 0;
    // The drawer body can read as zero before layout has run (it is painted
    // detached, and the panel may be resized just after). The panel's own height
    // is a far better lower bound than a bare fallback.
    const panel = this.root.clientHeight;
    const derived = panel > 0 ? Math.max(LOG_VIEWPORT_FALLBACK, Math.floor(panel * 0.62) - 90) : 0;
    return Math.max(body, derived, LOG_VIEWPORT_FALLBACK);
  }

  /**
   * Whether a scroll position is at the log's bottom. Uses the element's real
   * `scrollHeight` when layout provides it, and the known row heights otherwise
   * (as under a test DOM, where every element measures zero).
   */
  private traceAtBottom(scrollTop: number): boolean {
    const el = this.drawerEl;
    if (el && el.scrollHeight > 0) {
      return isAtBottom({
        scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight || this.traceViewport(),
      });
    }
    return isAtBottom({
      scrollTop,
      scrollHeight: this.traceTotal,
      clientHeight: this.traceViewport(),
    });
  }

  /**
   * Render the visible window into `body`, with spacers standing in for the rest.
   * `reposition` sets the scroll offset to the computed one — only for a newly
   * attached body, follow-tail, or an explicit jump. An ordinary repaint of an
   * existing body must leave the scroll position to the browser, or clamping as
   * the content changes fights the user and the view can never settle.
   */
  private paintTrace(body: HTMLElement, reposition: boolean): void {
    // Read the scroll before clearing: clearing the content collapses the
    // scroller, and the browser resets `scrollTop` to zero.
    const previous = body.scrollTop;
    clearNode(body);
    // A width change re-wraps every row, so heights measured at the old width no
    // longer hold. This is also how the detached first paint's fallback width is
    // discarded once the drawer is in the document.
    const wrap = this.traceWrapChars();
    if (wrap !== this.traceWrap) {
      this.traceWrap = wrap;
      this.traceHeights.clear();
    }
    const heights = this.traceLines.map((_, index) => this.traceLineHeight(index));
    const viewport = this.traceViewport();
    const count = heights.length;
    const total = heights.reduce((sum, height) => sum + height, 0);
    this.traceTotal = total;
    // Follow-tail pins to the end; a scrolled position is preserved exactly as
    // the browser held it, so a repaint never fights the user's scrolling.
    const scroll = reposition
      ? this.followTail
        ? Math.max(0, total - viewport)
        : Math.max(0, this.drawerScrollTop)
      : Math.max(0, previous);

    // A fixed number of lines, led by the anchor, so the window never depends on a
    // viewport that may have been read as zero before layout. At >= 18px a line,
    // the lines below the anchor always cover more than any panel is tall.
    const start = this.traceStartFor(heights, scroll);
    const windowLines = Math.min(LOG_WINDOW_LINES, count);
    const end = Math.min(count, start + windowLines);
    this.traceWindowStart = start;
    let top = 0;
    for (let index = 0; index < start; index++) top += heights[index]!;
    let bottom = 0;
    for (let index = end; index < count; index++) bottom += heights[index]!;

    const content = el('div', 'gp-log');
    if (top > 0) {
      const spacer = el('div', 'gp-log-pad');
      spacer.style.height = `${top}px`;
      content.append(spacer);
    }
    const errors = new Set(this.traceErrors);
    const current = this.traceMatches[this.traceMatchAt];
    for (let index = start; index < end; index++) {
      content.append(this.renderTraceLine(index, errors, current));
    }
    if (bottom > 0) {
      const spacer = el('div', 'gp-log-pad');
      spacer.style.height = `${bottom}px`;
      content.append(spacer);
    }
    body.append(content);
    body.scrollTop = scroll;
    this.traceScrollSet = body.scrollTop;
    this.drawerScrollTop = body.scrollTop;
    this.measureTraceRows(content);
  }

  private renderTraceLine(
    index: number,
    errors: ReadonlySet<number>,
    current: number | undefined,
  ): HTMLElement {
    const line = el('div', 'gp-log-line');
    line.dataset.line = String(index);
    const indexed = this.traceIndexer?.lineAt(index);
    const text = indexed?.text ?? stripAnsi(this.traceLines[index] ?? '');
    line.textContent = text;
    if (errors.has(index)) line.dataset.error = 'true';
    const lower = indexed?.lower ?? text.toLowerCase();
    if (this.traceFindQuery && lower.includes(this.traceFindQuery.toLowerCase())) {
      line.dataset.match = 'true';
      if (current === index) line.dataset.current = 'true';
    }
    return line;
  }

  /**
   * Cache each rendered row's real height. Layout is unavailable under a test
   * DOM (every height is zero), so that path is skipped and estimates stand.
   */
  private measureTraceRows(content: HTMLElement): void {
    let changed = false;
    for (const node of content.querySelectorAll<HTMLElement>('.gp-log-line')) {
      const index = Number(node.dataset.line);
      if (!Number.isFinite(index)) continue;
      const height = node.getBoundingClientRect().height || node.offsetHeight;
      if (height > 0 && height !== this.traceHeights.get(index)) {
        this.traceHeights.set(index, height);
        changed = true;
      }
    }
    if (changed && !this.traceSettling) {
      this.traceSettling = true;
      this.traceWindowStart = -1;
      this.repaintTrace(false);
      this.traceSettling = false;
    }
  }

  private repaintTrace(reposition: boolean): void {
    const body = this.drawerEl;
    if (!body) return;
    // A scroll that stays within the rendered window needs no rebuild; rebuilding
    // on every scroll event is what makes the scrollbar stutter.
    if (!reposition && this.traceWrapChars() === this.traceWrap) {
      const heights = this.traceLines.map((_, index) => this.traceLineHeight(index));
      if (this.traceStartFor(heights, Math.max(0, body.scrollTop)) === this.traceWindowStart) return;
    }
    this.paintTrace(body, reposition);
  }

  /** The window start for a scroll offset: a fixed span led by the anchor line. */
  private traceStartFor(heights: readonly number[], scroll: number): number {
    const count = heights.length;
    const windowLines = Math.min(LOG_WINDOW_LINES, count);
    const anchor = lineAtOffset(heights, scroll);
    return Math.max(0, Math.min(anchor - Math.floor(LOG_WINDOW_LINES / 10), count - windowLines));
  }

  private renderFooter(): HTMLElement {
    const foot = el('div', 'gp-foot');
    const capability = this.resolved ? this.capabilityFor(this.resolved.project) : null;
    const writable = capability != null && canRunPipeline(capability);
    foot.append(el('span', '', writable ? 'Read + pipeline actions' : 'Read-only'));
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

/** Why the shown log is shorter than the job's trace, if it is. */
function traceTruncation(text: string, serviceTruncated?: boolean): TraceTruncation {
  // Trust the service's explicit signal when present; only fall back to the
  // body length for an older response that carries none.
  const hostCapped = serviceTruncated ?? text.length >= HOST_BODY_CAP;
  if (hostCapped) return 'host';
  if (logLines(text).length > LOG_MAX_LINES) return 'cap';
  return null;
}

/** A successful trace fetch's cache entry: `ready` with the text, or `missing` when empty. */
function traceStateOf(text: string, serviceTruncated?: boolean): TraceState {
  return text.trim()
    ? { state: 'ready', text, truncated: traceTruncation(text, serviceTruncated) }
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
    case 'host-mismatch': {
      const detected = resolution.detectedHost ?? 'another host';
      return {
        kind: 'host-mismatch',
        title: 'Different GitLab host',
        body: resolution.detectedHost
          ? `This remote points at ${detected}, but the Configured host is ${configuredHost}. To read this project, set Configured host to ${detected} and add an Access token for it.`
          : `This remote points at ${detected}, but the Configured host is ${configuredHost}. To read this project, set Configured host to the remote’s GitLab host and add an Access token for it.`,
        detail: resolution.detectedPath
          ? `${detected}/${resolution.detectedPath}`
          : detected,
        configure: true,
        configureHost: resolution.detectedHost,
      };
    }
  }
}

function noTokenProblem(configuredHost: string): Problem {
  return {
    kind: 'no-token',
    title: 'No Access token',
    body: `No Access token is stored for ${configuredHost}, so its pipelines cannot be read.`,
    hint: 'Add a personal access token — read_api to read, api to also run pipeline actions.',
    configure: true,
  };
}

/** The Proxy service, which owns the configuration and reaches GitLab, is unavailable. */
function serviceProblem(): Problem {
  return {
    kind: 'service',
    title: 'Proxy service unavailable',
    body: 'This extension reaches GitLab through its Proxy service, which is not running. It may not be granted yet, or it failed to start.',
    hint: 'Open Settings → Extensions and allow this extension’s service, then refresh.',
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

function failureProblem(failure: ClientFailure, configuredHost: string): Problem {
  if (failure.kind === 'no-token') return noTokenProblem(configuredHost);
  if (failure.kind === 'unauthorized') {
    return {
      kind: 'unauthorized',
      title: 'GitLab token rejected',
      body: 'The stored Access token cannot read this project. It may be invalid or expired, or lack the read_api scope.',
      hint: 'Replace it in the configuration form.',
      configure: true,
    };
  }
  if (failure.kind === 'forbidden') {
    return {
      kind: 'forbidden',
      title: 'GitLab refused this request',
      body: 'The stored Access token is not allowed to read this project. It may lack the read_api scope, or the account may not have access.',
      hint: 'Replace it in the configuration form.',
      configure: true,
    };
  }
  if (failure.kind === 'service') return serviceProblem();
  return {
    kind: 'not-found',
    title: 'Project not found',
    body: 'GitLab could not find this project, or the Access token cannot see it.',
  };
}

/**
 * Mount the Pipelines panel. `port` is the only host dependency; tests pass a
 * fake.
 */
export function mountPanel(root: HTMLElement, port: HostPort, options: PanelOptions = {}): PanelHandle {
  return new PipelinesPanel(root, port, options).start();
}
