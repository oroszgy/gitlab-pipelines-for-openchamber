import type {
  GuestProject,
  GuestProjectsSnapshot,
  GuestWorktree,
  GuestWorktreesSnapshot,
  HostReadyContext,
  HostTheme,
  JsonValue,
  StartSessionRequest,
  StartSessionResult,
  ToastRequest,
} from '@openchamber/sdk';
import type { HostPort, HostRequest, HostResponse } from '../panel/host-port';
import { eventIdentity, type TerminalEvent } from '../panel/service-config';
import type { Bridge, DownstreamPipeline, Job, Pipeline } from '../panel/types';

export type RequestHandler = (
  request: HostRequest,
  callIndex: number,
) => HostResponse | Promise<HostResponse>;

function envelope(payload: unknown, status = 200): HostResponse {
  return { status, body: JSON.stringify(payload) };
}

/**
 * A host-port test double. Every service request the panel makes is recorded,
 * and the fake service models the loopback service's routes (`/config`,
 * `/token`, `/proxy`, `/git-config`) over an in-memory configuration and token
 * store, so tests drive the Panel exactly as the real service would.
 *
 * A `gitlabHandler` answers the GitLab calls inside `/proxy`; `serviceHandler`
 * overrides the whole service, for grant/failure cases. `serviceRequests` holds
 * every service call; `gitlabRequests` holds the GitLab calls the service
 * forwarded.
 */
export class FakeHost implements HostPort {
  files = new Map<string, string>();
  projects: GuestProject[] = [];
  worktrees: GuestWorktree[] = [];
  serviceRequests: HostRequest[] = [];
  gitlabRequests: HostRequest[] = [];
  openUrls: string[] = [];
  /** Every `openSurface` call, in order. */
  openSurfaces: string[] = [];
  /** Text written through `writeClipboard`, in order. */
  clipboard: string[] = [];
  /** Every `setBadge` call, in order; `null` clears. */
  badges: (number | null)[] = [];
  /** Every host toast, in order. */
  toasts: ToastRequest[] = [];
  startSessions: StartSessionRequest[] = [];
  startSessionResult: StartSessionResult = { sessionId: 'ses_1', sent: 'sent', directory: '/repo' };
  startSessionError: unknown = null;
  disposed = false;

  /** The in-memory backing for `storage`, so a test can inspect what was written. */
  readonly stored = new Map<string, JsonValue>();
  /** When set, every storage call rejects, modelling an unavailable store. */
  storageError: unknown = null;

  /** The host's extension storage, as `host.storage`. */
  storage: HostPort['storage'] = {
    get: async (key) => {
      this.storageCheck();
      return this.stored.get(key);
    },
    set: async (key, value) => {
      this.storageCheck();
      this.stored.set(key, value);
    },
    delete: async (key) => {
      this.storageCheck();
      this.stored.delete(key);
    },
    keys: async () => {
      this.storageCheck();
      return [...this.stored.keys()].sort();
    },
  };

  private storageCheck(): void {
    if (this.storageError) throw this.storageError;
  }

  /** The service's stored configuration (the Configured host and Project override). */
  config: { host: string; project: string } = { host: 'gitlab.com', project: '' };
  /** Access tokens keyed by host, as the service holds them. */
  tokens: Record<string, string> = {};
  /** The Watched Ref per `host\0project`, as the service holds it. */
  readonly watches = new Map<string, { ref: string; addedAt: string }>();
  /** The retained Terminal event log (oldest first), as the service holds it. */
  events: TerminalEvent[] = [];
  /** How many events have ever been recorded; the cursor `/events` reads past. */
  eventSeq = 0;
  /** How many recorded events the service had marked seen. */
  seen = 0;
  /** When set, `/events/seen` answers 404, as a service with no watermark route would. */
  seenUnsupported = false;
  /** The authenticated username `/api/v4/user` answers with. */
  username = 'me';
  /** The repository config `/git-config` answers with, or null for 404. */
  gitConfig: string | null = null;
  /** Answers a GitLab call forwarded through `/proxy`. */
  gitlabHandler: RequestHandler | null = null;
  /** Overrides the whole service, for grant/failure cases. */
  serviceHandler: RequestHandler | null = null;

  private readonly readyListeners = new Set<(context: HostReadyContext) => void>();

  onReady(listener: (context: HostReadyContext) => void): () => void {
    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  emitReady(context: HostReadyContext): void {
    for (const listener of [...this.readyListeners]) listener(context);
  }

  async serviceRequest(input: HostRequest): Promise<HostResponse> {
    const index = this.serviceRequests.length;
    this.serviceRequests.push(input);
    if (this.serviceHandler) return this.serviceHandler(input, index);
    return this.defaultService(input);
  }

  /** The configuration the Panel sees: never a token, only presence per host. */
  private configView(): { host: string; project: string; hasToken: Record<string, boolean> } {
    const hasToken: Record<string, boolean> = {};
    for (const host of Object.keys(this.tokens)) hasToken[host] = true;
    return { host: this.config.host, project: this.config.project, hasToken };
  }

  private async defaultService(input: HostRequest): Promise<HostResponse> {
    if (input.path === '/config') {
      if ((input.method ?? 'GET') === 'GET') return envelope({ config: this.configView() });
      const body = JSON.parse(input.body ?? '{}') as { host?: unknown; project?: unknown };
      if (typeof body.host === 'string') this.config.host = body.host;
      if (typeof body.project === 'string') this.config.project = body.project;
      return envelope({ config: this.configView() });
    }
    if (input.path === '/token') {
      const body = JSON.parse(input.body ?? '{}') as { host?: unknown; token?: unknown };
      const host = typeof body.host === 'string' ? body.host : this.config.host;
      if (body.token === null) delete this.tokens[host];
      else if (typeof body.token === 'string') this.tokens[host] = body.token;
      return envelope({ config: this.configView() });
    }
    if (input.path === '/git-config') {
      if (this.gitConfig == null) return { status: 404, body: JSON.stringify({ error: 'nope' }) };
      return envelope({ config: this.gitConfig });
    }
    if (input.path === '/watch') {
      const method = input.method ?? 'GET';
      const body =
        method === 'PUT'
          ? (JSON.parse(input.body ?? '{}') as { host?: unknown; project?: unknown; ref?: unknown })
          : {};
      const host = typeof body.host === 'string' ? body.host : (input.query?.host ?? this.config.host);
      const project =
        typeof body.project === 'string' ? body.project : (input.query?.project ?? this.config.project);
      const key = `${host}\u0000${project}`;
      if (method === 'GET') return envelope({ watch: this.watches.get(key) ?? null });
      const ref = typeof body.ref === 'string' ? body.ref.trim() : '';
      if (ref) this.watches.set(key, { ref, addedAt: '2026-09-30T12:00:00Z' });
      else this.watches.delete(key);
      return envelope({ watch: this.watches.get(key) ?? null });
    }
    if (input.path === '/events') {
      const after = Number(input.query?.after ?? '0');
      const retained = this.events.length;
      const firstSeq = this.eventSeq - retained + 1;
      const start = retained === 0 ? 0 : after - firstSeq + 1;
      return envelope({
        events: retained === 0 ? [] : this.events.slice(Math.max(0, start)),
        cursor: this.eventSeq,
        unseen: Math.max(0, this.eventSeq - this.seen),
      });
    }
    if (input.path === '/events/seen') {
      if (this.seenUnsupported) return { status: 404, body: JSON.stringify({ error: 'not found' }) };
      const body = JSON.parse(input.body ?? '{}') as { cursor?: unknown };
      const cursor = body.cursor;
      if (typeof cursor !== 'number' || !Number.isInteger(cursor) || cursor < 0) {
        return envelope({ error: 'A non-negative cursor is required.' }, 400);
      }
      const target = Math.min(cursor, this.eventSeq);
      if (target > this.seen) this.seen = target;
      return envelope({ seen: this.seen, unseen: Math.max(0, this.eventSeq - this.seen) });
    }
    if (input.path === '/proxy') {
      const body = JSON.parse(input.body ?? '{}') as {
        baseUrl?: string;
        method?: string;
        path?: string;
        query?: Record<string, string>;
        body?: string;
        headers?: Record<string, string>;
      };
      const host = (body.baseUrl ?? '').replace(/^https:\/\//, '').replace(/\/+$/, '');
      if (!this.tokens[host]) {
        return {
          status: 502,
          body: JSON.stringify({ error: 'No Access token is configured for this GitLab host.', code: 'no-token' }),
        };
      }
      const request: HostRequest = {
        method: (body.method ?? 'GET') as HostRequest['method'],
        path: body.path ?? '/',
        query: body.query ?? {},
        ...(typeof body.body === 'string' ? { body: body.body } : {}),
        ...(body.headers ? { headers: body.headers } : {}),
      };
      const index = this.gitlabRequests.length;
      this.gitlabRequests.push(request);
      if (request.path === '/api/v4/user') {
        return envelope({ status: 200, body: JSON.stringify({ username: this.username }) });
      }
      if (!this.gitlabHandler) return envelope({ status: 200, body: '[]' });
      const response = await this.gitlabHandler(request, index);
      return envelope({
        status: response.status,
        body: response.body,
        ...(response.truncated != null ? { truncated: response.truncated } : {}),
        ...(response.headers ? { headers: response.headers } : {}),
      });
    }
    return { status: 404, body: JSON.stringify({ error: 'not found' }) };
  }

  async readFile(path: string): Promise<{ content: string }> {
    const content = this.files.get(path);
    if (content === undefined) {
      const error = new Error(`NOT_FOUND ${path}`) as Error & { code: string };
      error.code = 'NOT_FOUND';
      throw error;
    }
    return { content };
  }

  async listProjects(): Promise<GuestProjectsSnapshot> {
    return { kind: 'projects', state: 'ready', projects: this.projects };
  }

  async listWorktrees(projectId: string): Promise<GuestWorktreesSnapshot> {
    return { kind: 'worktrees', projectId, state: 'ready', worktrees: this.worktrees };
  }

  async openUrl(url: string): Promise<void> {
    this.openUrls.push(url);
  }

  async openSurface(surfaceId: string): Promise<void> {
    this.openSurfaces.push(surfaceId);
  }

  async writeClipboard(text: string): Promise<void> {
    this.clipboard.push(text);
  }

  async setBadge(count: number | null): Promise<void> {
    this.badges.push(count);
  }

  async toast(request: ToastRequest): Promise<void> {
    this.toasts.push(request);
  }

  /** Record a Terminal event as the service's poller would; deduped by identity. */
  recordEvent(event: TerminalEvent): void {
    const identity = eventIdentity(event);
    if (this.events.some((existing) => eventIdentity(existing) === identity)) return;
    this.events.push(event);
    this.eventSeq += 1;
  }

  /** Set the Watched Ref for a host+project, as `PUT /watch` would. */
  watch(host: string, project: string, ref: string): void {
    this.watches.set(`${host}\u0000${project}`, { ref, addedAt: '2026-09-30T12:00:00Z' });
  }

  async startSession(request: StartSessionRequest): Promise<StartSessionResult> {
    this.startSessions.push(request);
    if (this.startSessionError) throw this.startSessionError;
    return this.startSessionResult;
  }

  dispose(): void {
    this.disposed = true;
  }
}

type Timer = { id: number; fn: () => void; at: number; every: number | null };

/** Deterministic clock + timer queue. The panel is driven by this in tests. */
export class FakeTimers {
  private current = Date.parse('2026-09-30T12:00:00Z');
  private nextId = 1;
  private readonly timers = new Map<number, Timer>();

  setTimeout = (fn: () => void, ms: number): number => {
    const id = this.nextId++;
    this.timers.set(id, { id, fn, at: this.current + ms, every: null });
    return id;
  };

  clearTimeout = (id: number): void => {
    this.timers.delete(id);
  };

  setInterval = (fn: () => void, ms: number): number => {
    const id = this.nextId++;
    this.timers.set(id, { id, fn, at: this.current + ms, every: ms });
    return id;
  };

  clearInterval = (id: number): void => {
    this.timers.delete(id);
  };

  /** Idle slices run on the next `advance(0)`, like `requestIdleCallback`. */
  requestIdleCallback = (fn: () => void): number => this.setTimeout(fn, 0);

  cancelIdleCallback = (id: number): void => {
    this.clearTimeout(id);
  };

  now = (): number => this.current;

  pending(): Array<{ id: number; at: number; every: number | null }> {
    return [...this.timers.values()]
      .map(({ id, at, every }) => ({ id, at, every }))
      .sort((a, b) => a.at - b.at || a.id - b.id);
  }

  pendingDelays(): number[] {
    return this.pending().map((timer) => timer.at - this.current);
  }

  /** Run every timer due within `ms`, in order, including ones scheduled along the way. */
  advance(ms: number): void {
    const target = this.current + ms;
    for (;;) {
      const due = [...this.timers.values()]
        .filter((timer) => timer.at <= target)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.current = due.at;
      if (due.every != null) {
        due.at = this.current + due.every;
      } else {
        this.timers.delete(due.id);
      }
      due.fn();
    }
    this.current = target;
  }
}

/** Let queued promises resolve. Real timers; the panel's are fake. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function themeTokens(): HostTheme['tokens'] {
  return {
    background: '#111318',
    elevated: '#191c22',
    foreground: '#e6e8ec',
    muted: '#9aa0aa',
    subtle: '#23262e',
    border: '#2c3038',
    hover: '#23262e',
    selection: '#2b3b55',
    focus: '#5b8def',
    primary: '#5b8def',
    mutedSurface: '#1d2026',
    elevatedForeground: '#e6e8ec',
    active: '#2c3038',
    selectionForeground: '#e6e8ec',
    primaryForeground: '#ffffff',
    primaryText: '#9db8f5',
    successText: '#86d29a',
    warningText: '#e0b567',
    errorText: '#e08a8a',
    infoText: '#86b8e0',
    success: '#2e9e4f',
    warning: '#b8860b',
    error: '#c04040',
    info: '#3a7bbf',
    font: 'system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
    radius: '6px',
  };
}

export function readyContext(overrides: Partial<HostReadyContext> = {}): HostReadyContext {
  return {
    theme: { mode: 'dark', tokens: themeTokens() },
    locale: 'en',
    directory: '/repo',
    session: null,
    surface: 'panel',
    connection: { connected: true, account: 'me' },
    settings: {},
    item: null,
    ...overrides,
  };
}

export const GIT_CONFIG = `[core]
\trepositoryformatversion = 0
[remote "origin"]
\turl = git@gitlab.com:group/project.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
`;

/** A Pipeline row's shape, with only the fields a test cares about overridden. */
export function pipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 1,
    iid: 1,
    status: 'success',
    source: 'push',
    ref: 'main',
    sha: 'abcdef1234567890',
    web_url: 'https://gitlab.com/group/project/-/pipelines/1',
    created_at: '2026-09-30T11:50:00Z',
    updated_at: '2026-09-30T11:58:00Z',
    started_at: '2026-09-30T11:50:00Z',
    finished_at: '2026-09-30T11:52:00Z',
    duration: 120,
    ...overrides,
  };
}

/** A Job row's shape, with only the fields a test cares about overridden. */
export function job(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    name: 'build',
    stage: 'build',
    status: 'success',
    allow_failure: false,
    duration: 10,
    created_at: '2026-09-30T11:50:00Z',
    started_at: '2026-09-30T11:50:00Z',
    finished_at: '2026-09-30T11:50:10Z',
    web_url: 'https://gitlab.com/group/project/-/jobs/1',
    ...overrides,
  };
}

/** A Downstream pipeline's shape, as it rides inside a Bridge payload. */
export function downstreamPipeline(overrides: Partial<DownstreamPipeline> = {}): DownstreamPipeline {
  return {
    id: 42,
    iid: 3,
    project_id: 7,
    status: 'failed',
    source: 'pipeline',
    ref: 'main',
    sha: 'abcdef1234567890',
    web_url: 'https://gitlab.com/other/project/-/pipelines/42',
    created_at: '2026-09-30T11:50:00Z',
    updated_at: '2026-09-30T11:58:00Z',
    ...overrides,
  };
}

/** A Trigger job's shape, with only the fields a test cares about overridden. */
export function bridge(overrides: Partial<Bridge> = {}): Bridge {
  return {
    id: 50,
    name: 'trigger',
    stage: 'deploy',
    status: 'success',
    web_url: 'https://gitlab.com/group/project/-/jobs/50',
    downstream_pipeline: null,
    ...overrides,
  };
}

/** A Terminal event's shape, with only the fields a test cares about overridden. */
export function terminalEvent(overrides: Partial<TerminalEvent> = {}): TerminalEvent {
  return {
    host: 'gitlab.com',
    project: 'group/project',
    ref: 'main',
    pipelineId: 1,
    status: 'failed',
    at: '2026-09-30T11:59:00Z',
    ...overrides,
  };
}
