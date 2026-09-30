import type {
  GuestConnection,
  GuestProject,
  GuestProjectsSnapshot,
  GuestWorktree,
  GuestWorktreesSnapshot,
  HostReadyContext,
  HostTheme,
} from '@openchamber/sdk';
import type { HostPort, HostRequest, HostResponse } from '../panel/host-port';

export type RequestHandler = (
  request: HostRequest,
  callIndex: number,
) => HostResponse | Promise<HostResponse>;

/** A host-port test double. Every read and request the panel makes is recorded. */
export class FakeHost implements HostPort {
  files = new Map<string, string>();
  projects: GuestProject[] = [];
  worktrees: GuestWorktree[] = [];
  requests: HostRequest[] = [];
  openUrls: string[] = [];
  disposed = false;
  handler: RequestHandler | null = null;

  private readonly readyListeners = new Set<(context: HostReadyContext) => void>();
  private readonly connectionListeners = new Set<(connection: GuestConnection) => void>();

  onReady(listener: (context: HostReadyContext) => void): () => void {
    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  onConnection(listener: (connection: GuestConnection) => void): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  emitReady(context: HostReadyContext): void {
    for (const listener of [...this.readyListeners]) listener(context);
  }

  emitConnection(connection: GuestConnection): void {
    for (const listener of [...this.connectionListeners]) listener(connection);
  }

  async request(input: HostRequest): Promise<HostResponse> {
    const index = this.requests.length;
    this.requests.push(input);
    if (this.handler) return this.handler(input, index);
    return { status: 200, body: '[]' };
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
