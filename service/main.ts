/**
 * The proxy service's loopback shell. A thin wrapper around the pure handlers:
 * it reads the host-issued port and bearer, enforces the bearer on every
 * request, and delegates to `handleProxy`, `resolveGitConfig` and the
 * configuration routes. It holds no GitLab knowledge.
 *
 * Contract: `@openchamber/sdk/GUEST_SERVICES.md` — bind 127.0.0.1 on
 * `OPENCHAMBER_SERVICE_PORT`, require `Authorization: Bearer
 * <OPENCHAMBER_SERVICE_TOKEN>` on every request including health, and answer
 * one health route, one git-config route, one configuration route, one token
 * route and one proxy route.
 */
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { configPath, type ConfigFs } from './config';
import { resolveGitConfig, type GitConfigFs } from './git-config';
import {
  proxyWithConfig,
  readConfigRoute,
  writeConfigRoute,
  writeTokenRoute,
  type ProxyRouteRequest,
} from './routes';

const PORT = Number(process.env.OPENCHAMBER_SERVICE_PORT ?? 0);
const TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN ?? '';
const CONFIG_PATH = configPath(process.env);
const GIT_CONFIG_ROUTE = '/git-config';
const CONFIG_ROUTE = '/config';
const TOKEN_ROUTE = '/token';
const PROXY_ROUTE = '/proxy';

const gitConfigFs: GitConfigFs = {
  async stat(path) {
    try {
      const info = await stat(path);
      if (info.isDirectory()) return 'directory';
      if (info.isFile()) return 'file';
      return null;
    } catch {
      return null;
    }
  },
  readFile: (path) => readFile(path, 'utf8'),
};

/** The configuration store's filesystem, over real node fs. */
const configFs: ConfigFs = {
  readFile: (path) => readFile(path, 'utf8'),
  writeFile: (path, content, mode) => writeFile(path, content, { mode }),
  chmod: (path, mode) => chmod(path, mode),
  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
};

function authorized(request: IncomingMessage): boolean {
  return TOKEN.length > 0 && request.headers.authorization === `Bearer ${TOKEN}`;
}

function send(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(body);
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

/** Parse a JSON request body, or `null` when it is not a JSON object. */
async function readJson(request: IncomingMessage): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await readBody(request)) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const server = createServer((request, response) => {
  void (async () => {
    if (!authorized(request)) {
      send(response, 401, '{"error":"unauthorized"}');
      return;
    }
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/health') {
      send(response, 200, '{"status":"ok"}');
      return;
    }
    if (url.pathname === CONFIG_ROUTE) {
      if (request.method === 'GET') {
        send(response, 200, JSON.stringify({ config: await readConfigRoute(configFs, CONFIG_PATH) }));
        return;
      }
      const body = await readJson(request);
      if (!body) {
        send(response, 400, '{"error":"invalid request body"}');
        return;
      }
      const result = await writeConfigRoute(configFs, CONFIG_PATH, body);
      if (!result.ok) {
        send(response, 400, JSON.stringify({ error: result.error }));
        return;
      }
      send(response, 200, JSON.stringify({ config: result.view }));
      return;
    }
    if (url.pathname === TOKEN_ROUTE) {
      const body = await readJson(request);
      if (!body) {
        send(response, 400, '{"error":"invalid request body"}');
        return;
      }
      const result = await writeTokenRoute(configFs, CONFIG_PATH, body);
      if (!result.ok) {
        send(response, 400, JSON.stringify({ error: result.error }));
        return;
      }
      send(response, 200, JSON.stringify({ config: result.view }));
      return;
    }
    if (url.pathname === GIT_CONFIG_ROUTE) {
      // Unchanged from before the configuration routes: parse the body
      // directly, so this route's contract stays as ADR-0005 froze it.
      let body: { directory?: unknown };
      try {
        body = JSON.parse(await readBody(request)) as { directory?: unknown };
      } catch {
        send(response, 400, '{"error":"invalid request body"}');
        return;
      }
      const directory = typeof body.directory === 'string' ? body.directory : '';
      const result = await resolveGitConfig({ directory }, gitConfigFs);
      if (!result.ok) {
        send(response, 404, JSON.stringify({ error: result.error }));
        return;
      }
      send(response, 200, JSON.stringify({ config: result.config }));
      return;
    }
    if (url.pathname !== PROXY_ROUTE) {
      send(response, 404, '{"error":"not found"}');
      return;
    }
    const body = await readJson(request);
    if (!body) {
      send(response, 400, '{"error":"invalid request body"}');
      return;
    }
    const result = await proxyWithConfig(configFs, CONFIG_PATH, body as ProxyRouteRequest, fetch);
    if (!result.ok) {
      // The error is already redacted of any token by the handler.
      send(response, 502, JSON.stringify({ error: result.error, ...(result.code ? { code: result.code } : {}) }));
      return;
    }
    send(response, 200, JSON.stringify({ status: result.status, body: result.body, truncated: result.truncated }));
  })();
});

server.listen(PORT, '127.0.0.1', () => {
  // Only the loopback address and the host-issued port are ever bound.
  process.stdout.write(`proxy listening on 127.0.0.1:${PORT}\n`);
});
