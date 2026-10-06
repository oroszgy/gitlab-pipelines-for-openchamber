/**
 * The proxy service's loopback shell. It reads the host-issued port and bearer,
 * then hands every request to `handleRequest`, which owns the routes' logic and
 * answers an unexpected failure as a 500. This module only binds the socket and
 * wires the real filesystem and `fetch` in.
 *
 * Contract: `@openchamber/sdk/GUEST_SERVICES.md` — bind 127.0.0.1 on
 * `OPENCHAMBER_SERVICE_PORT`, require `Authorization: Bearer
 * <OPENCHAMBER_SERVICE_TOKEN>` on every request including health, and answer
 * one health route, one git-config route, one configuration route, one token
 * route and one proxy route.
 */
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { configPath, type ConfigFs } from './config';
import type { GitConfigFs } from './git-config';
import { handleRequest, parsePort, type ServiceDeps } from './server';

const CONFIG_PATH = configPath(process.env);
const TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN ?? '';

let PORT: number;
try {
  PORT = parsePort(process.env.OPENCHAMBER_SERVICE_PORT);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

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

const deps: ServiceDeps = {
  token: TOKEN,
  configFs,
  configPath: CONFIG_PATH,
  gitConfigFs,
  fetchImpl: fetch,
};

const server = createServer((request, response) => {
  // `handleRequest` never rejects: it answers every failure itself.
  void handleRequest(request, deps).then((result) => {
    response.writeHead(result.status, { 'content-type': 'application/json' });
    response.end(result.body);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  // Only the loopback address and the host-issued port are ever bound.
  process.stdout.write(`proxy listening on 127.0.0.1:${PORT}\n`);
});
