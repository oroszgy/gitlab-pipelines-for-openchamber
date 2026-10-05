// service/main.ts
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";

// service/config.ts
import { dirname, posix, win32 } from "node:path";

// service/proxy.ts
var PROXY_TIMEOUT_MS = 20000;
var PROXY_BODY_MAX = 256000;
var METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
var HOST_ERROR = "The GitLab host must be an https origin with no credentials or path.";
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
    return { ok: false, error: HOST_ERROR };
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
  let text;
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
  }
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: "The GitLab host returned no readable body." };
  } finally {
    clearTimeout(timer);
  }
  const truncated = text.length > PROXY_BODY_MAX;
  const body = truncated ? text.slice(0, PROXY_BODY_MAX) : text;
  return { ok: true, status: response.status, body: redact(body, request.token), truncated };
}

// service/config.ts
var DEFAULT_HOST = "gitlab.com";
function defaultConfig() {
  return { host: DEFAULT_HOST, project: "", tokens: {} };
}
function configPath(env, platform = process.platform) {
  if (platform === "win32") {
    const base2 = env.APPDATA ?? env.USERPROFILE;
    if (!base2)
      throw new Error("APPDATA is not set.");
    return win32.join(base2, "gitlab-pipelines", "config.json");
  }
  if (platform === "darwin") {
    if (!env.HOME)
      throw new Error("HOME is not set.");
    return posix.join(env.HOME, "Library", "Application Support", "gitlab-pipelines", "config.json");
  }
  const xdg = env.XDG_CONFIG_HOME;
  const base = xdg ? xdg : env.HOME ? posix.join(env.HOME, ".config") : undefined;
  if (!base)
    throw new Error("HOME is not set.");
  return posix.join(base, "gitlab-pipelines", "config.json");
}
function normalizeHost(input) {
  const origin = normalizeBaseUrl(input);
  if (!origin)
    return null;
  return new URL(origin).host;
}
function normalizeTokens(raw) {
  const tokens = {};
  let dropped = 0;
  if (typeof raw === "object" && raw !== null) {
    for (const [key, value] of Object.entries(raw)) {
      const normalized = normalizeHost(key);
      if (normalized && typeof value === "string" && value)
        tokens[normalized] = value;
      else
        dropped += 1;
    }
  }
  return { tokens, dropped };
}
async function readConfig(fs, path) {
  let raw;
  try {
    raw = await fs.readFile(path);
  } catch {
    return defaultConfig();
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultConfig();
  }
  if (typeof parsed !== "object" || parsed === null)
    return defaultConfig();
  const record = parsed;
  const host = typeof record.host === "string" ? normalizeHost(record.host) : null;
  const project = typeof record.project === "string" ? record.project : "";
  return { host: host ?? DEFAULT_HOST, project, tokens: normalizeTokens(record.tokens).tokens };
}
function setToken(config, host, token) {
  const normalized = normalizeHost(host);
  if (!normalized)
    return { ok: false, error: HOST_ERROR };
  const value = token.trim();
  if (!value)
    return { ok: false, error: "An Access token is required." };
  return { ok: true, config: { ...config, tokens: { ...config.tokens, [normalized]: value } } };
}
function clearToken(config, host) {
  const normalized = normalizeHost(host);
  if (!normalized)
    return { ok: false, error: HOST_ERROR };
  const tokens = { ...config.tokens };
  delete tokens[normalized];
  return { ok: true, config: { ...config, tokens } };
}
function resolveToken(config, host) {
  const normalized = normalizeHost(host);
  if (!normalized)
    return null;
  return config.tokens[normalized] ?? null;
}
async function saveConfig(fs, path, config) {
  const host = normalizeHost(config.host);
  if (!host)
    return { ok: false, error: HOST_ERROR };
  const { tokens, dropped } = normalizeTokens(config.tokens);
  if (dropped > 0)
    return { ok: false, error: "A token is keyed by an invalid GitLab host." };
  const next = { host, project: config.project, tokens };
  await fs.mkdir(dirname(path));
  await fs.writeFile(path, `${JSON.stringify(next, null, 2)}
`, 384);
  await fs.chmod(path, 384);
  return { ok: true, config: next };
}

// service/git-config.ts
import { join, resolve } from "node:path";
function parseGitdir(marker, directory) {
  const match = /^\s*gitdir:\s*(.+?)\s*$/m.exec(marker);
  const raw = match?.[1];
  if (!raw)
    return null;
  return resolve(directory, raw);
}
async function resolveGitConfig(request, fs) {
  const directory = request.directory.trim();
  if (!directory)
    return { ok: false, error: "A directory is required." };
  const dotGit = join(directory, ".git");
  const kind = await fs.stat(dotGit);
  if (kind === "directory")
    return readConfig2(join(dotGit, "config"), fs);
  if (kind !== "file")
    return { ok: false, error: `${directory} is not a git repository.` };
  let marker;
  try {
    marker = await fs.readFile(dotGit);
  } catch {
    return { ok: false, error: "Could not read the .git pointer." };
  }
  const gitdir = parseGitdir(marker, directory);
  if (!gitdir)
    return { ok: false, error: "The .git pointer is not a gitdir." };
  const shared = await sharedGitDir(gitdir, fs);
  return readConfig2(join(shared, "config"), fs);
}
async function sharedGitDir(gitdir, fs) {
  try {
    const pointer = (await fs.readFile(join(gitdir, "commondir"))).trim();
    if (pointer)
      return resolve(gitdir, pointer);
  } catch {}
  return gitdir;
}
async function readConfig2(path, fs) {
  try {
    return { ok: true, config: await fs.readFile(path) };
  } catch {
    return { ok: false, error: `Could not read ${path}.` };
  }
}

// service/routes.ts
function configView(config) {
  const hasToken = {};
  for (const host of Object.keys(config.tokens))
    hasToken[host] = true;
  return { host: config.host, project: config.project, hasToken };
}
async function readConfigRoute(fs, path) {
  return configView(await readConfig(fs, path));
}
async function writeConfigRoute(fs, path, input) {
  const current = await readConfig(fs, path);
  const host = typeof input.host === "string" ? input.host : current.host;
  const project = typeof input.project === "string" ? input.project : current.project;
  return persist(fs, path, { ...current, host, project });
}
async function writeTokenRoute(fs, path, input) {
  const current = await readConfig(fs, path);
  const host = typeof input.host === "string" && input.host.trim() ? input.host : current.host;
  const change = input.token === null ? clearToken(current, host) : setToken(current, host, typeof input.token === "string" ? input.token : "");
  if (!change.ok)
    return { ok: false, error: change.error };
  return persist(fs, path, change.config);
}
async function persist(fs, path, config) {
  const saved = await saveConfig(fs, path, config);
  if (!saved.ok)
    return { ok: false, error: saved.error };
  return { ok: true, view: configView(saved.config) };
}
var NO_TOKEN_ERROR = "No Access token is configured for this GitLab host.";
async function proxyWithConfig(fs, path, request, fetchImpl) {
  const origin = normalizeBaseUrl(typeof request.baseUrl === "string" ? request.baseUrl : "");
  if (!origin)
    return { ok: false, error: HOST_ERROR };
  const config = await readConfig(fs, path);
  const token = resolveToken(config, origin);
  if (!token)
    return { ok: false, code: "no-token", error: NO_TOKEN_ERROR };
  return handleProxy({
    baseUrl: origin,
    method: request.method,
    path: request.path,
    ...request.query ? { query: request.query } : {},
    ...request.body != null ? { body: request.body } : {},
    token
  }, fetchImpl);
}

// service/main.ts
var PORT = Number(process.env.OPENCHAMBER_SERVICE_PORT ?? 0);
var TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";
var CONFIG_PATH = configPath(process.env);
var GIT_CONFIG_ROUTE = "/git-config";
var CONFIG_ROUTE = "/config";
var TOKEN_ROUTE = "/token";
var PROXY_ROUTE = "/proxy";
var gitConfigFs = {
  async stat(path) {
    try {
      const info = await stat(path);
      if (info.isDirectory())
        return "directory";
      if (info.isFile())
        return "file";
      return null;
    } catch {
      return null;
    }
  },
  readFile: (path) => readFile(path, "utf8")
};
var configFs = {
  readFile: (path) => readFile(path, "utf8"),
  writeFile: (path, content, mode) => writeFile(path, content, { mode }),
  chmod: (path, mode) => chmod(path, mode),
  async mkdir(path) {
    await mkdir(path, { recursive: true });
  }
};
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
async function readJson(request) {
  try {
    const parsed = JSON.parse(await readBody(request));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
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
    if (url.pathname === CONFIG_ROUTE) {
      if (request.method === "GET") {
        send(response, 200, JSON.stringify({ config: await readConfigRoute(configFs, CONFIG_PATH) }));
        return;
      }
      const body2 = await readJson(request);
      if (!body2) {
        send(response, 400, '{"error":"invalid request body"}');
        return;
      }
      const result2 = await writeConfigRoute(configFs, CONFIG_PATH, body2);
      if (!result2.ok) {
        send(response, 400, JSON.stringify({ error: result2.error }));
        return;
      }
      send(response, 200, JSON.stringify({ config: result2.view }));
      return;
    }
    if (url.pathname === TOKEN_ROUTE) {
      const body2 = await readJson(request);
      if (!body2) {
        send(response, 400, '{"error":"invalid request body"}');
        return;
      }
      const result2 = await writeTokenRoute(configFs, CONFIG_PATH, body2);
      if (!result2.ok) {
        send(response, 400, JSON.stringify({ error: result2.error }));
        return;
      }
      send(response, 200, JSON.stringify({ config: result2.view }));
      return;
    }
    if (url.pathname === GIT_CONFIG_ROUTE) {
      let body2;
      try {
        body2 = JSON.parse(await readBody(request));
      } catch {
        send(response, 400, '{"error":"invalid request body"}');
        return;
      }
      const directory = typeof body2.directory === "string" ? body2.directory : "";
      const result2 = await resolveGitConfig({ directory }, gitConfigFs);
      if (!result2.ok) {
        send(response, 404, JSON.stringify({ error: result2.error }));
        return;
      }
      send(response, 200, JSON.stringify({ config: result2.config }));
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
    const result = await proxyWithConfig(configFs, CONFIG_PATH, body, fetch);
    if (!result.ok) {
      send(response, 502, JSON.stringify({ error: result.error, ...result.code ? { code: result.code } : {} }));
      return;
    }
    send(response, 200, JSON.stringify({ status: result.status, body: result.body, truncated: result.truncated }));
  })();
});
server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`proxy listening on 127.0.0.1:${PORT}
`);
});
