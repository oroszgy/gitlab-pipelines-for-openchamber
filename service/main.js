// service/main.ts
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";

// service/config.ts
import { dirname, posix, win32 } from "node:path";

// service/proxy.ts
var REQUEST_HEADER_ALLOWLIST = new Set(["if-none-match"]);
var RESPONSE_HEADER_ALLOWLIST = [
  "etag",
  "link",
  "x-next-page",
  "x-prev-page",
  "x-total",
  "x-total-pages",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
  "retry-after"
];
var PROXY_TIMEOUT_MS = 20000;
var PROXY_BODY_MAX = 256000;
var WRITE_METHOD = "POST";
var WRITE_PATH_PREFIX = "/api/v4/";
function methodAllowed(method, path) {
  if (method === "GET")
    return true;
  return method === WRITE_METHOD && path.startsWith(WRITE_PATH_PREFIX);
}
var HOST_ERROR = "The GitLab host must be an https origin with no credentials or path.";
var PATH_ERROR = "The proxy path must stay on the configured GitLab host.";
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
async function readCapped(response) {
  const reader = response.body?.getReader();
  if (!reader) {
    const text2 = await response.text();
    return text2.length > PROXY_BODY_MAX ? { text: text2.slice(0, PROXY_BODY_MAX), truncated: true } : { text: text2, truncated: false };
  }
  const decoder = new TextDecoder;
  let text = "";
  let truncated = false;
  for (;; ) {
    const { done, value } = await reader.read();
    if (done)
      break;
    if (value)
      text += decoder.decode(value, { stream: true });
    if (text.length > PROXY_BODY_MAX) {
      truncated = true;
      text = text.slice(0, PROXY_BODY_MAX);
      if (reader.cancel)
        await reader.cancel();
      break;
    }
  }
  if (!truncated)
    text += decoder.decode();
  return { text, truncated };
}
function readAllowlistedHeaders(response) {
  const out = {};
  if (typeof response.headers?.get !== "function")
    return out;
  for (const name of RESPONSE_HEADER_ALLOWLIST) {
    const value = response.headers.get(name);
    if (value != null && value !== "")
      out[name] = value;
  }
  return out;
}
function forwardedHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    const name = key.toLowerCase();
    if (REQUEST_HEADER_ALLOWLIST.has(name))
      out[name] = value;
  }
  return out;
}
async function handleProxy(request, fetchImpl) {
  const origin = normalizeBaseUrl(request.baseUrl);
  if (!origin) {
    return { ok: false, error: HOST_ERROR };
  }
  if (!methodAllowed(request.method, request.path)) {
    return { ok: false, error: `Unsupported method ${request.method}.` };
  }
  const url = buildTargetUrl(origin, request.path, request.query ?? {});
  if (new URL(url).origin !== origin) {
    return { ok: false, error: PATH_ERROR };
  }
  const headers = {
    Authorization: `Bearer ${request.token}`,
    ...forwardedHeaders(request.headers)
  };
  if (request.body != null)
    headers["Content-Type"] = "application/json";
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  let response;
  let text;
  let truncated;
  try {
    response = await fetchImpl(url, {
      method: request.method,
      headers,
      ...request.body != null ? { body: request.body } : {},
      signal: controller.signal,
      redirect: "manual"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    return { ok: false, error: redact(`Could not reach ${origin}: ${message}`, request.token) };
  }
  try {
    ({ text, truncated } = await readCapped(response));
  } catch {
    return { ok: false, error: "The GitLab host returned no readable body." };
  } finally {
    clearTimeout(timer);
  }
  return {
    ok: true,
    status: response.status,
    body: redact(text, request.token),
    truncated,
    headers: readAllowlistedHeaders(response)
  };
}

// service/config.ts
var DEFAULT_HOST = "gitlab.com";
var EVENT_LOG_MAX = 200;
function defaultConfig() {
  return { host: DEFAULT_HOST, project: "", tokens: {}, watches: {}, events: [], eventSeq: 0, seen: 0 };
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
var PROJECT_ERROR = "A project is required to watch.";
var REF_ERROR = "A Ref is required to watch.";
function watchKey(host, project) {
  const normalized = normalizeHost(host);
  if (!normalized)
    return { ok: false, error: HOST_ERROR };
  const trimmed = project.trim();
  if (!trimmed)
    return { ok: false, error: PROJECT_ERROR };
  return { ok: true, key: `${normalized}/${trimmed}` };
}
function normalizeWatch(value) {
  if (typeof value !== "object" || value === null)
    return null;
  const record = value;
  if (typeof record.ref !== "string" || record.ref === "" || typeof record.addedAt !== "string" || record.addedAt === "") {
    return null;
  }
  const watch = { ref: record.ref, addedAt: record.addedAt };
  if (typeof record.error === "string" && record.error !== "")
    watch.error = record.error;
  return watch;
}
function normalizeWatches(raw) {
  const watches = {};
  let dropped = 0;
  if (typeof raw === "object" && raw !== null) {
    for (const [key, value] of Object.entries(raw)) {
      const slash = key.indexOf("/");
      const host = slash === -1 ? "" : key.slice(0, slash);
      const project = slash === -1 ? "" : key.slice(slash + 1);
      const parsedKey = watchKey(host, project);
      const watch = parsedKey.ok ? normalizeWatch(value) : null;
      if (parsedKey.ok && watch)
        watches[parsedKey.key] = watch;
      else
        dropped += 1;
    }
  }
  return { watches, dropped };
}
function eventIdentity(event) {
  const host = normalizeHost(event.host) ?? event.host;
  return JSON.stringify([host, event.project, event.ref, event.pipelineId, event.status]);
}
function isEvent(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const record = value;
  return typeof record.host === "string" && normalizeHost(record.host) !== null && typeof record.project === "string" && record.project.trim() !== "" && typeof record.ref === "string" && record.ref.trim() !== "" && typeof record.pipelineId === "number" && Number.isFinite(record.pipelineId) && typeof record.status === "string" && record.status !== "" && typeof record.at === "string" && record.at !== "";
}
function normalizeEvents(raw) {
  const events = [];
  let dropped = 0;
  if (Array.isArray(raw)) {
    for (const value of raw) {
      if (!isEvent(value)) {
        dropped += 1;
        continue;
      }
      events.push({ ...value, host: normalizeHost(value.host) ?? value.host });
    }
  }
  return { events: events.slice(Math.max(0, events.length - EVENT_LOG_MAX)), dropped };
}
function normalizeEventSeq(raw, retained) {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= retained ? raw : retained;
}
function normalizeSeen(raw, eventSeq) {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? Math.min(raw, eventSeq) : 0;
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
  const events = normalizeEvents(record.events).events;
  const eventSeq = normalizeEventSeq(record.eventSeq, events.length);
  return {
    host: host ?? DEFAULT_HOST,
    project,
    tokens: normalizeTokens(record.tokens).tokens,
    watches: normalizeWatches(record.watches).watches,
    events,
    eventSeq,
    seen: normalizeSeen(record.seen, eventSeq)
  };
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
function setWatch(config, host, project, ref, addedAt) {
  const resolved = watchKey(host, project);
  if (!resolved.ok)
    return { ok: false, error: resolved.error };
  const value = ref.trim();
  if (!value)
    return { ok: false, error: REF_ERROR };
  return {
    ok: true,
    config: { ...config, watches: { ...config.watches, [resolved.key]: { ref: value, addedAt } } }
  };
}
function clearWatch(config, host, project) {
  const resolved = watchKey(host, project);
  if (!resolved.ok)
    return { ok: false, error: resolved.error };
  const watches = { ...config.watches };
  delete watches[resolved.key];
  return { ok: true, config: { ...config, watches } };
}
function resolveWatch(config, host, project) {
  const resolved = watchKey(host, project);
  if (!resolved.ok)
    return null;
  return config.watches[resolved.key] ?? null;
}
function setWatchError(config, host, project, error) {
  const resolved = watchKey(host, project);
  if (!resolved.ok)
    return config;
  const watch = config.watches[resolved.key];
  if (!watch)
    return config;
  return {
    ...config,
    watches: { ...config.watches, [resolved.key]: { ref: watch.ref, addedAt: watch.addedAt, error } }
  };
}
function clearWatchError(config, host, project) {
  const resolved = watchKey(host, project);
  if (!resolved.ok)
    return config;
  const watch = config.watches[resolved.key];
  if (!watch?.error)
    return config;
  return {
    ...config,
    watches: { ...config.watches, [resolved.key]: { ref: watch.ref, addedAt: watch.addedAt } }
  };
}
function normalizeEvent(event) {
  return { ...event, host: normalizeHost(event.host) ?? event.host };
}
function appendEvent(config, event) {
  const normalized = normalizeEvent(event);
  const identity = eventIdentity(normalized);
  if (config.events.some((existing) => eventIdentity(existing) === identity))
    return config;
  const events = [...config.events, normalized];
  const overflow = Math.max(0, events.length - EVENT_LOG_MAX);
  return {
    ...config,
    events: overflow > 0 ? events.slice(overflow) : events,
    eventSeq: config.eventSeq + 1
  };
}
function eventCursor(config) {
  return config.eventSeq;
}
function unseenCount(config) {
  return Math.max(0, config.eventSeq - config.seen);
}
function advanceSeen(config, cursor) {
  if (!Number.isInteger(cursor) || cursor <= 0)
    return config;
  const target = Math.min(cursor, config.eventSeq);
  if (target <= config.seen)
    return config;
  return { ...config, seen: target };
}
function eventsAfter(config, after) {
  const retained = config.events.length;
  if (retained === 0)
    return [];
  const firstSeq = config.eventSeq - retained + 1;
  const start = after - firstSeq + 1;
  if (start <= 0)
    return config.events.slice();
  if (start >= retained)
    return [];
  return config.events.slice(start);
}
async function saveConfig(fs, path, config) {
  const host = normalizeHost(config.host);
  if (!host)
    return { ok: false, error: HOST_ERROR };
  const { tokens, dropped } = normalizeTokens(config.tokens);
  if (dropped > 0)
    return { ok: false, error: "A token is keyed by an invalid GitLab host." };
  const normalizedWatches = normalizeWatches(config.watches);
  if (normalizedWatches.dropped > 0) {
    return { ok: false, error: "A watch is keyed by an invalid GitLab host or project." };
  }
  const normalizedEvents = normalizeEvents(config.events);
  if (normalizedEvents.dropped > 0) {
    return { ok: false, error: "An event is malformed." };
  }
  const eventSeq = normalizeEventSeq(config.eventSeq, normalizedEvents.events.length);
  const next = {
    host,
    project: config.project,
    tokens,
    watches: normalizedWatches.watches,
    events: normalizedEvents.events,
    eventSeq,
    seen: normalizeSeen(config.seen, eventSeq)
  };
  await fs.mkdir(dirname(path));
  await fs.writeFile(path, `${JSON.stringify(next, null, 2)}
`, 384);
  await fs.chmod(path, 384);
  return { ok: true, config: next };
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
function nonBlankString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}
async function readWatchRoute(fs, path, input) {
  const config = await readConfig(fs, path);
  const host = nonBlankString(input.host) ?? config.host;
  const project = nonBlankString(input.project) ?? config.project;
  return resolveWatch(config, host, project);
}
async function writeWatchRoute(fs, path, input, now = () => new Date) {
  const current = await readConfig(fs, path);
  const host = nonBlankString(input.host) ?? current.host;
  const project = nonBlankString(input.project) ?? current.project;
  const ref = typeof input.ref === "string" ? input.ref.trim() : "";
  const change = ref ? setWatch(current, host, project, ref, now().toISOString()) : clearWatch(current, host, project);
  if (!change.ok)
    return { ok: false, error: change.error };
  const saved = await saveConfig(fs, path, change.config);
  if (!saved.ok)
    return { ok: false, error: saved.error };
  return { ok: true, watch: resolveWatch(saved.config, host, project) };
}
function cursorFrom(value) {
  if (typeof value === "number")
    return Number.isInteger(value) && value >= 0 ? value : 0;
  if (typeof value === "string" && /^\d+$/.test(value.trim()))
    return Number(value.trim());
  return 0;
}
async function readEventsRoute(fs, path, input) {
  const config = await readConfig(fs, path);
  return {
    events: eventsAfter(config, cursorFrom(input.after)),
    cursor: eventCursor(config),
    unseen: unseenCount(config)
  };
}
async function writeEventRoute(fs, path, input, now = () => new Date) {
  const at = typeof input.at === "string" && input.at ? input.at : now().toISOString();
  const candidate = {
    host: typeof input.host === "string" ? input.host : "",
    project: typeof input.project === "string" ? input.project.trim() : "",
    ref: typeof input.ref === "string" ? input.ref.trim() : "",
    pipelineId: typeof input.pipelineId === "number" && Number.isFinite(input.pipelineId) ? input.pipelineId : Number.NaN,
    status: typeof input.status === "string" ? input.status : "",
    at
  };
  if (!isEvent(candidate))
    return { ok: false, error: "A valid Terminal event is required." };
  const current = await readConfig(fs, path);
  const next = appendEvent(current, candidate);
  if (next === current)
    return { ok: true, event: normalizeEvent(candidate), recorded: false };
  const saved = await saveConfig(fs, path, next);
  if (!saved.ok)
    return { ok: false, error: saved.error };
  return { ok: true, event: normalizeEvent(candidate), recorded: true };
}
async function advanceSeenRoute(fs, path, input) {
  if (typeof input.cursor !== "number" || !Number.isInteger(input.cursor) || input.cursor < 0) {
    return { ok: false, error: "A non-negative cursor is required." };
  }
  const current = await readConfig(fs, path);
  const next = advanceSeen(current, input.cursor);
  if (next === current)
    return { ok: true, seen: current.seen, unseen: unseenCount(current) };
  const saved = await saveConfig(fs, path, next);
  if (!saved.ok)
    return { ok: false, error: saved.error };
  return { ok: true, seen: saved.config.seen, unseen: unseenCount(saved.config) };
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
    ...request.headers ? { headers: request.headers } : {},
    token
  }, fetchImpl);
}

// service/poller.ts
var SERVICE_POLL_INTERVAL_MS = 60000;
var TERMINAL_STATUSES = ["success", "failed", "canceled"];
var TERMINAL = new Set(TERMINAL_STATUSES);
function isTerminalStatus(status) {
  return status != null && TERMINAL.has(status);
}
var REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
var MOVED_PROJECT_ERROR = "The GitLab project has moved.";
var PIPELINES_PER_PAGE = 20;
function pipelinePath(project) {
  return `/api/v4/projects/${encodeURIComponent(project)}/pipelines`;
}
function parseRetryAfterMs(value, nowMs) {
  if (!value)
    return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed))
    return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date))
    return null;
  return Math.max(0, date - nowMs);
}
function widenedDelay(baseMs, elapsedMs) {
  const backoff = elapsedMs > 10 * 60000 ? 3 : elapsedMs > 2 * 60000 ? 2 : 1;
  return baseMs * backoff;
}
function rateLimitedDelay(baseMs, retryAfterMs) {
  return retryAfterMs != null ? Math.max(baseMs, retryAfterMs) : baseMs * 2;
}
function parsePipelines(body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed))
    return [];
  const pipelines = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null)
      continue;
    const record = item;
    if (typeof record.id !== "number" || typeof record.status !== "string")
      continue;
    const created = typeof record.created_at === "string" ? record.created_at : null;
    const updated = typeof record.updated_at === "string" ? record.updated_at : null;
    pipelines.push({
      id: record.id,
      status: record.status,
      createdAt: created,
      settledAt: updated ?? created
    });
  }
  return pipelines;
}
function settledAfterWatch(settleTime, addedAt) {
  const addedAtMs = Date.parse(addedAt);
  if (Number.isNaN(addedAtMs))
    return true;
  if (settleTime == null)
    return false;
  const settleMs = Date.parse(settleTime);
  if (Number.isNaN(settleMs))
    return false;
  return settleMs >= addedAtMs;
}
function activityAgeMs(pipelines, nowMs) {
  let age = 0;
  for (const pipeline of pipelines) {
    if (isTerminalStatus(pipeline.status))
      continue;
    const created = pipeline.createdAt == null ? Number.NaN : Date.parse(pipeline.createdAt);
    if (Number.isNaN(created))
      continue;
    age = Math.max(age, nowMs - created);
  }
  return age;
}
function parseWatchKey(key) {
  const slash = key.indexOf("/");
  if (slash <= 0)
    return null;
  const host = key.slice(0, slash);
  const project = key.slice(slash + 1);
  if (!host || !project)
    return null;
  return { host, project };
}
function pipelinesRequest(host, project, ref) {
  return {
    baseUrl: host,
    method: "GET",
    path: pipelinePath(project),
    query: { ref, per_page: String(PIPELINES_PER_PAGE) }
  };
}
async function pollOnce(context) {
  const { fs, path, fetchImpl } = context;
  const now = context.now ?? (() => new Date);
  const intervalMs = context.intervalMs ?? SERVICE_POLL_INTERVAL_MS;
  const startedAt = now();
  const nowMs = startedAt.getTime();
  const config = await readConfig(fs, path);
  const keys = Object.keys(config.watches);
  if (keys.length === 0)
    return { delayMs: intervalMs, paused: false, recorded: 0 };
  const events = [];
  const errors = [];
  let elapsedMs = 0;
  let retryAfterMs = null;
  let paused = false;
  for (const key of keys) {
    const parsed = parseWatchKey(key);
    const watch = config.watches[key];
    if (!parsed || !watch)
      continue;
    const result = await proxyWithConfig(fs, path, pipelinesRequest(parsed.host, parsed.project, watch.ref), fetchImpl);
    if (!result.ok)
      continue;
    if (result.status === 429) {
      paused = true;
      const retry = parseRetryAfterMs(result.headers["retry-after"], nowMs);
      if (retry != null && (retryAfterMs == null || retry > retryAfterMs))
        retryAfterMs = retry;
      break;
    }
    if (REDIRECT_STATUSES.has(result.status)) {
      if (watch.error !== MOVED_PROJECT_ERROR) {
        errors.push({ host: parsed.host, project: parsed.project, error: MOVED_PROJECT_ERROR });
      }
      continue;
    }
    if (result.status !== 200)
      continue;
    if (watch.error != null) {
      errors.push({ host: parsed.host, project: parsed.project, error: null });
    }
    const pipelines = parsePipelines(result.body);
    elapsedMs = Math.max(elapsedMs, activityAgeMs(pipelines, nowMs));
    const at = startedAt.toISOString();
    for (const pipeline of pipelines) {
      if (!isTerminalStatus(pipeline.status))
        continue;
      if (!settledAfterWatch(pipeline.settledAt, watch.addedAt))
        continue;
      events.push({
        host: parsed.host,
        project: parsed.project,
        ref: watch.ref,
        pipelineId: pipeline.id,
        status: pipeline.status,
        at
      });
    }
  }
  let recorded = 0;
  if (events.length > 0 || errors.length > 0) {
    let latest = await readConfig(fs, path);
    for (const update of errors) {
      latest = update.error == null ? clearWatchError(latest, update.host, update.project) : setWatchError(latest, update.host, update.project, update.error);
    }
    for (const event of events) {
      const next = appendEvent(latest, event);
      if (next !== latest) {
        recorded += 1;
        latest = next;
      }
    }
    await saveConfig(fs, path, latest);
  }
  let delayMs = widenedDelay(intervalMs, elapsedMs);
  if (paused)
    delayMs = rateLimitedDelay(delayMs, retryAfterMs);
  return { delayMs, paused, recorded };
}
var defaultTimers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => clearTimeout(handle)
};
function createPoller(options) {
  const timers = options.timers ?? defaultTimers;
  const intervalMs = options.intervalMs ?? SERVICE_POLL_INTERVAL_MS;
  let handle = null;
  let running = false;
  const run = async () => {
    if (!running)
      return;
    const outcome = await pollOnce(options);
    if (!running)
      return;
    schedule(outcome.delayMs);
  };
  const schedule = (delayMs) => {
    handle = timers.setTimeout(() => {
      handle = null;
      run();
    }, delayMs);
  };
  return {
    pollOnce: () => pollOnce(options),
    start() {
      if (running)
        return;
      running = true;
      schedule(intervalMs);
    },
    stop() {
      running = false;
      if (handle !== null) {
        timers.clearTimeout(handle);
        handle = null;
      }
    },
    isRunning: () => running
  };
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

// service/server.ts
var HEALTH_ROUTE = "/health";
var CONFIG_ROUTE = "/config";
var TOKEN_ROUTE = "/token";
var WATCH_ROUTE = "/watch";
var EVENTS_ROUTE = "/events";
var EVENTS_SEEN_ROUTE = "/events/seen";
var GIT_CONFIG_ROUTE = "/git-config";
var PROXY_ROUTE = "/proxy";
var REQUEST_BODY_MAX = 256000;

class BodyTooLargeError extends Error {
}
function parsePort(raw) {
  const value = (raw ?? "").trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`OPENCHAMBER_SERVICE_PORT must be an integer port, got ${JSON.stringify(raw ?? "")}.`);
  }
  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error(`OPENCHAMBER_SERVICE_PORT must be between 1 and 65535, got ${port}.`);
  }
  return port;
}
function json(status, payload) {
  return { status, body: JSON.stringify(payload) };
}
function authorized(request, token) {
  return token.length > 0 && request.headers.authorization === `Bearer ${token}`;
}
async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > REQUEST_BODY_MAX)
      throw new BodyTooLargeError;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
async function readJson(request) {
  try {
    const parsed = JSON.parse(await readBody(request));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      throw error;
    return null;
  }
}
async function route(request, deps) {
  if (!authorized(request, deps.token))
    return json(401, { error: "unauthorized" });
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const method = request.method ?? "GET";
  if (url.pathname === HEALTH_ROUTE)
    return json(200, { status: "ok" });
  if (url.pathname === CONFIG_ROUTE) {
    if (method === "GET") {
      return json(200, { config: await readConfigRoute(deps.configFs, deps.configPath) });
    }
    const body2 = await readJson(request);
    if (!body2)
      return json(400, { error: "invalid request body" });
    const result2 = await writeConfigRoute(deps.configFs, deps.configPath, body2);
    if (!result2.ok)
      return json(400, { error: result2.error });
    return json(200, { config: result2.view });
  }
  if (url.pathname === TOKEN_ROUTE) {
    const body2 = await readJson(request);
    if (!body2)
      return json(400, { error: "invalid request body" });
    const result2 = await writeTokenRoute(deps.configFs, deps.configPath, body2);
    if (!result2.ok)
      return json(400, { error: result2.error });
    return json(200, { config: result2.view });
  }
  if (url.pathname === WATCH_ROUTE) {
    if (method === "GET") {
      return json(200, {
        watch: await readWatchRoute(deps.configFs, deps.configPath, {
          host: url.searchParams.get("host"),
          project: url.searchParams.get("project")
        })
      });
    }
    if (method !== "PUT")
      return json(404, { error: "not found" });
    const body2 = await readJson(request);
    if (!body2)
      return json(400, { error: "invalid request body" });
    const result2 = await writeWatchRoute(deps.configFs, deps.configPath, body2);
    if (!result2.ok)
      return json(400, { error: result2.error });
    return json(200, { watch: result2.watch });
  }
  if (url.pathname === EVENTS_ROUTE) {
    if (method === "GET") {
      return json(200, await readEventsRoute(deps.configFs, deps.configPath, {
        after: url.searchParams.get("after")
      }));
    }
    if (method !== "POST")
      return json(404, { error: "not found" });
    const body2 = await readJson(request);
    if (!body2)
      return json(400, { error: "invalid request body" });
    const result2 = await writeEventRoute(deps.configFs, deps.configPath, body2);
    if (!result2.ok)
      return json(400, { error: result2.error });
    return json(200, { event: result2.event, recorded: result2.recorded });
  }
  if (url.pathname === EVENTS_SEEN_ROUTE) {
    if (method !== "PUT")
      return json(404, { error: "not found" });
    const body2 = await readJson(request);
    if (!body2)
      return json(400, { error: "invalid request body" });
    const result2 = await advanceSeenRoute(deps.configFs, deps.configPath, body2);
    if (!result2.ok)
      return json(400, { error: result2.error });
    return json(200, { seen: result2.seen, unseen: result2.unseen });
  }
  if (url.pathname === GIT_CONFIG_ROUTE) {
    let body2;
    try {
      body2 = JSON.parse(await readBody(request));
    } catch (error) {
      if (error instanceof BodyTooLargeError)
        throw error;
      return json(400, { error: "invalid request body" });
    }
    const directory = typeof body2.directory === "string" ? body2.directory : "";
    const result2 = await resolveGitConfig({ directory }, deps.gitConfigFs);
    if (!result2.ok)
      return json(404, { error: result2.error });
    return json(200, { config: result2.config });
  }
  if (url.pathname !== PROXY_ROUTE)
    return json(404, { error: "not found" });
  const body = await readJson(request);
  if (!body)
    return json(400, { error: "invalid request body" });
  const result = await proxyWithConfig(deps.configFs, deps.configPath, body, deps.fetchImpl);
  if (!result.ok) {
    return json(502, { error: result.error, ...result.code ? { code: result.code } : {} });
  }
  return json(200, {
    status: result.status,
    body: result.body,
    truncated: result.truncated,
    headers: result.headers
  });
}
async function handleRequest(request, deps) {
  try {
    return await route(request, deps);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return json(413, { error: "The request body is too large." });
    }
    return json(500, { error: "The service could not complete the request." });
  }
}

// service/main.ts
var CONFIG_PATH = configPath(process.env);
var TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";
var PORT;
try {
  PORT = parsePort(process.env.OPENCHAMBER_SERVICE_PORT);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}
`);
  process.exit(1);
}
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
var deps = {
  token: TOKEN,
  configFs,
  configPath: CONFIG_PATH,
  gitConfigFs,
  fetchImpl: fetch
};
var poller = createPoller({ fs: configFs, path: CONFIG_PATH, fetchImpl: fetch });
deps.poller = poller;
var server = createServer((request, response) => {
  handleRequest(request, deps).then((result) => {
    response.writeHead(result.status, { "content-type": "application/json" });
    response.end(result.body);
  });
});
server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`proxy listening on 127.0.0.1:${PORT}
`);
  poller.start();
});
function shutdown() {
  poller.stop();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
