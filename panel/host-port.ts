import { connectHost } from '@openchamber/sdk';
import type {
  GuestConnection,
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
};

export type HostPort = {
  request(input: HostRequest): Promise<HostResponse>;
  /** The local proxy service, for a custom GitLab host. */
  serviceRequest(input: HostRequest): Promise<HostResponse>;
  readFile(path: string): Promise<{ content: string }>;
  listProjects(): Promise<GuestProjectsSnapshot>;
  listWorktrees(projectId: string): Promise<GuestWorktreesSnapshot>;
  /** The Panel's only outbound action: start a seeded OpenChamber session. */
  startSession(request: StartSessionRequest): Promise<StartSessionResult>;
  openUrl(url: string): Promise<void>;
  onReady(listener: (context: HostReadyContext) => void): () => void;
  onConnection(listener: (connection: GuestConnection) => void): () => void;
  dispose(): void;
};

/** The real adapter over the OpenChamber iframe bridge. */
export function createHostPort(): HostPort {
  const host = connectHost();
  return {
    request: (input) =>
      host.request({
        method: input.method ?? 'GET',
        path: input.path,
        ...(input.query ? { query: input.query } : {}),
        ...(input.body != null ? { body: input.body } : {}),
      }),
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
    onConnection: (listener) => host.onConnection(listener),
    dispose: () => host.dispose(),
  };
}
