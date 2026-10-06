import { connectHost } from '@openchamber/sdk';
import type {
  GuestProjectsSnapshot,
  GuestWorktreesSnapshot,
  HostReadyContext,
  StartSessionRequest,
  StartSessionResult,
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
    onReady: (listener) => host.onReady(listener),
    dispose: () => host.dispose(),
  };
}
