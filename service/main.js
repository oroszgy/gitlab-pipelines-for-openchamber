// service/main.ts
import { createServer } from "node:http";

// service/proxy.ts
var PROXY_TIMEOUT_MS = 20000;
var PROXY_BODY_MAX = 256000;
var METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
function normalizeBaseUrl(baseUrl) {
  const raw = baseUrl.trim();
  if (!raw)
    return null;
  const withScheme = raw.includes("://") ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:")
    return null;
  if (url.username || url.password)
    return null;
  if (url.pathname !== "/" && url.pathname !== "")
    return null;
  if (url.search || url.hash)
    return null;
  return url.origin;
}
function buildTargetUrl(baseUrl, path, query) {
  const origin = normalizeBaseUrl(baseUrl);
  if (!origin)
    throw new Error("invalid base URL");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, origin);
  for (const [key, value] of Object.entries(query))
    url.searchParams.set(key, value);
  return url.toString();
}
function redact(text, token) {
  if (!token)
    return text;
  return text.split(token).join("[redacted]");
}
async function handleProxy(request, fetchImpl) {
  const origin = normalizeBaseUrl(request.baseUrl);
  if (!origin) {
    return { ok: false, error: "The GitLab host must be an https origin with no credentials or path." };
  }
  if (!METHODS.includes(request.method)) {
    return { ok: false, error: `Unsupported method ${request.method}.` };
  }
  const url = buildTargetUrl(origin, request.path, request.query ?? {});
  const headers = { Authorization: `Bearer ${request.token}` };
  if (request.body != null)
    headers["Content-Type"] = "application/json";
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(url, {
      method: request.method,
      headers,
      ...request.body != null ? { body: request.body } : {},
      signal: controller.signal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    return { ok: false, error: redact(`Could not reach ${origin}: ${message}`, request.token) };
  } finally {
    clearTimeout(timer);
  }
  let text;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: "The GitLab host returned no readable body." };
  }
  const truncated = text.length > PROXY_BODY_MAX;
  const body = truncated ? text.slice(0, PROXY_BODY_MAX) : text;
  return { ok: true, status: response.status, body: redact(body, request.token), truncated };
}

// service/main.ts
var PORT = Number(process.env.OPENCHAMBER_SERVICE_PORT ?? 0);
var TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";
function authorized(request) {
  return TOKEN.length > 0 && request.headers.authorization === `Bearer ${TOKEN}`;
}
function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(body);
}
async function readBody(request) {
  const chunks = [];
  for await (const chunk of request)
    chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
var server = createServer((request, response) => {
  (async () => {
    if (!authorized(request)) {
      send(response, 401, '{"error":"unauthorized"}');
      return;
    }
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/health") {
      send(response, 200, '{"status":"ok"}');
      return;
    }
    if (url.pathname !== "/proxy") {
      send(response, 404, '{"error":"not found"}');
      return;
    }
    let proxyRequest;
    try {
      proxyRequest = JSON.parse(await readBody(request));
    } catch {
      send(response, 400, '{"error":"invalid request body"}');
      return;
    }
    const result = await handleProxy(proxyRequest, fetch);
    if (!result.ok) {
      send(response, 502, JSON.stringify({ error: result.error }));
      return;
    }
    send(response, 200, JSON.stringify({ status: result.status, body: result.body, truncated: result.truncated }));
  })();
});
server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`proxy listening on 127.0.0.1:${PORT}
`);
});
