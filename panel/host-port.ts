import { connectHost } from '@openchamber/sdk';
import type {
  GuestProjectsSnapshot,
  GuestWorktreesSnapshot,
  HostReadyContext,
  JsonValue,
  StartSessionRequest,
  StartSessionResult,
  ToastRequest,
} from '@openchamber/sdk';

/**
 * The single seam between the panel and OpenChamber's host APIs. Every read of
 * host state or call to the host is expressed here (the UI kit is a
 * presentation library, not a host API); the real adapter wraps
 * `connectHost()` and the tests substitute a fake.
 *
 * There is deliberately no `request` bridge: every GitLab call goes through the
 * Proxy service, so the Panel never reaches GitLab itself. See ADR-0006.
 */

export type HostRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string>;
  body?: string;
  /**
   * The curated request headers for a GitLab call (`If-None-Match` today).
   * They travel inside the `/proxy` body, since the host bridge has no header
   * channel. See ADR-0009.
   */
  headers?: Record<string, string>;
};

export type HostResponse = {
  status: number;
  /** The host leaves the body as text; callers parse JSON where they need it. */
  body: string;
  /**
   * Set when the Proxy service reports that it stopped reading the upstream
   * body at its size cap. Absent for older responses, where the length is the
   * only signal.
   */
  truncated?: boolean;
  /**
   * The allowlisted GitLab response headers the service returned, lowercased.
   * Absent when the service is older or sent none.
   */
  headers?: Record<string, string>;
};

export type HostPort = {
  /** The local Proxy service: GitLab calls, git config and the extension's configuration. */
  serviceRequest(input: HostRequest): Promise<HostResponse>;
  readFile(path: string): Promise<{ content: string }>;
  listProjects(): Promise<GuestProjectsSnapshot>;
  listWorktrees(projectId: string): Promise<GuestWorktreesSnapshot>;
  /** The Panel's only outbound action: start a seeded OpenChamber session. */
  startSession(request: StartSessionRequest): Promise<StartSessionResult>;
  openUrl(url: string): Promise<void>;
  /**
   * Switch host chrome to another surface by its id. The Status section uses it
   * to open the rail panel (`openSurface(PANEL_ID)`). Ungated on the host.
   */
  openSurface(surfaceId: string): Promise<void>;
  /** Put text on the user's clipboard, for Copy the Trace. Ungated on the host. */
  writeClipboard(text: string): Promise<void>;
  /**
   * The number on this guest's rail icon; `null` clears it. The host also clears
   * it when the visible rail panel opens. In-memory, and ungated. See ADR-0011.
   */
  setBadge(count: number | null): Promise<void>;
  /** Raise a host toast. Ungated, and best-effort: a failure must never break the Panel. */
  toast(request: ToastRequest): Promise<void>;
  /**
   * The extension's own persistent JSON store. It is global across projects,
   * so `prefs.ts` namespaces every key by host+project+ref. Ungated on the host,
   * and every call is best-effort.
   */
  storage: {
    get(key: string): Promise<JsonValue | undefined>;
    set(key: string, value: JsonValue): Promise<void>;
    delete(key: string): Promise<void>;
    keys(): Promise<string[]>;
  };
  onReady(listener: (context: HostReadyContext) => void): () => void;
  dispose(): void;
};

/** The real adapter over the OpenChamber iframe bridge. */
export function createHostPort(): HostPort {
  const host = connectHost();
  return {
    serviceRequest: (input) =>
      host.serviceRequest({
        method: input.method ?? 'GET',
        path: input.path,
        ...(input.query ? { query: input.query } : {}),
        ...(input.body != null ? { body: input.body } : {}),
      }),
    readFile: (path) => host.readFile(path),
    listProjects: () => host.listProjects(),
    listWorktrees: (projectId) => host.listWorktrees(projectId),
    startSession: (request) => host.startSession(request),
    openUrl: (url) => host.openUrl(url),
    openSurface: (surfaceId) => host.openSurface(surfaceId),
    writeClipboard: (text) => host.writeClipboard(text),
    setBadge: (count) => host.setBadge(count),
    toast: (request) => host.toast(request),
    storage: {
      get: (key) => host.storage.get(key),
      set: (key, value) => host.storage.set(key, value),
      delete: (key) => host.storage.delete(key),
      keys: () => host.storage.keys(),
    },
    onReady: (listener) => host.onReady(listener),
    dispose: () => host.dispose(),
  };
}
