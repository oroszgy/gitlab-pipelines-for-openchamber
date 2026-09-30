/**
 * The proxy service's loopback shell. A thin wrapper around the pure handler:
 * it reads the host-issued port and bearer, enforces the bearer on every
 * request, and delegates to `handleProxy`. It holds no GitLab knowledge.
 *
 * Contract: `@openchamber/sdk/GUEST_SERVICES.md` — bind 127.0.0.1 on
 * `OPENCHAMBER_SERVICE_PORT`, require `Authorization: Bearer
 * <OPENCHAMBER_SERVICE_TOKEN>` on every request including health, and answer
 * one health route and one proxy route.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleProxy, type ProxyRequest } from './proxy';

const PORT = Number(process.env.OPENCHAMBER_SERVICE_PORT ?? 0);
const TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN ?? '';

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
    if (url.pathname !== '/proxy') {
      send(response, 404, '{"error":"not found"}');
      return;
    }
    let proxyRequest: ProxyRequest;
    try {
      proxyRequest = JSON.parse(await readBody(request)) as ProxyRequest;
    } catch {
      send(response, 400, '{"error":"invalid request body"}');
      return;
    }
    const result = await handleProxy(proxyRequest, fetch);
    if (!result.ok) {
      // The error is already redacted of the token by the handler.
      send(response, 502, JSON.stringify({ error: result.error }));
      return;
    }
    send(response, 200, JSON.stringify({ status: result.status, body: result.body, truncated: result.truncated }));
  })();
});

server.listen(PORT, '127.0.0.1', () => {
  // Only the loopback address and the host-issued port are ever bound.
  process.stdout.write(`proxy listening on 127.0.0.1:${PORT}\n`);
});
