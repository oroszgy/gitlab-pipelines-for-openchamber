/**
 * The Extension's configuration store.
 *
 * The Proxy service owns the Extension's configuration — the Configured host
 * (defaulting to `gitlab.com`), the Project override and one Access token per
 * host — and persists it as a `0600` file in the user's config directory. Pure
 * and injectable through its one seam, the filesystem, so it is tested without
 * disk; the loopback server around it is a shell.
 */

import { dirname, posix, win32 } from 'node:path';
import { HOST_ERROR, normalizeBaseUrl } from './proxy';

/** The environment the config path is resolved from, injected so tests choose a platform. */
export type Env = Record<string, string | undefined>;

export const DEFAULT_HOST = 'gitlab.com';

/** A Watched Ref: the one Ref a project is watched on, and when it was set. */
export type Watch = { ref: string; addedAt: string };

export type Config = {
  /** The Configured host, a normalized authority such as `gitlab.com`. */
  host: string;
  /** The Project override, or `''` when unset. */
  project: string;
  /** One Access token per normalized host. */
  tokens: Record<string, string>;
  /** One Watched Ref per normalized `host/project` key. */
  watches: Record<string, Watch>;
};

/**
 * The filesystem seam: read, write, chmod and directory create. A write applies
 * `mode` only when it creates the file, so the store `chmod`s after every write
 * to leave the file at `0600` even when it already existed.
 */
export type ConfigFs = {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string, mode: number): Promise<void>;
  chmod(path: string, mode: number): Promise<void>;
  mkdir(path: string): Promise<void>;
};

export function defaultConfig(): Config {
  return { host: DEFAULT_HOST, project: '', tokens: {}, watches: {} };
}

/**
 * The configuration file's path for a platform: XDG on Linux (falling back to
 * `~/.config`), Application Support on macOS, APPDATA on Windows.
 */
export function configPath(env: Env, platform: string = process.platform): string {
  if (platform === 'win32') {
    const base = env.APPDATA ?? env.USERPROFILE;
    if (!base) throw new Error('APPDATA is not set.');
    return win32.join(base, 'gitlab-pipelines', 'config.json');
  }
  if (platform === 'darwin') {
    if (!env.HOME) throw new Error('HOME is not set.');
    return posix.join(env.HOME, 'Library', 'Application Support', 'gitlab-pipelines', 'config.json');
  }
  const xdg = env.XDG_CONFIG_HOME;
  const base = xdg ? xdg : env.HOME ? posix.join(env.HOME, '.config') : undefined;
  if (!base) throw new Error('HOME is not set.');
  return posix.join(base, 'gitlab-pipelines', 'config.json');
}

/**
 * A Configured host from a bare host or a full origin, as a lowercase authority
 * (`gitlab.com`, `gitlab.example.com:8443`). Refused unless it is `https` with no
 * credentials and no path beyond the root.
 */
export function normalizeHost(input: string): string | null {
  const origin = normalizeBaseUrl(input);
  if (!origin) return null;
  return new URL(origin).host;
}

/**
 * The valid token entries of a stored map, keyed by normalized host. An entry
 * with a malformed host or a non-string value counts as dropped, so a writer can
 * refuse it while a reader ignores it.
 */
function normalizeTokens(raw: unknown): { tokens: Record<string, string>; dropped: number } {
  const tokens: Record<string, string> = {};
  let dropped = 0;
  if (typeof raw === 'object' && raw !== null) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const normalized = normalizeHost(key);
      if (normalized && typeof value === 'string' && value) tokens[normalized] = value;
      else dropped += 1;
    }
  }
  return { tokens, dropped };
}

/** The refusal for a watch that names no project to key on. */
const PROJECT_ERROR = 'A project is required to watch.';

/** The refusal for a watch that names no Ref to poll. */
const REF_ERROR = 'A Ref is required to watch.';

/**
 * The configuration key for a project's watch: the normalized host and the
 * project path joined by `/`. A host never contains a `/`, so the first `/` is
 * the separator and the key stays unambiguous.
 */
function watchKey(
  host: string,
  project: string,
): { ok: true; key: string } | { ok: false; error: string } {
  const normalized = normalizeHost(host);
  if (!normalized) return { ok: false, error: HOST_ERROR };
  const trimmed = project.trim();
  if (!trimmed) return { ok: false, error: PROJECT_ERROR };
  return { ok: true, key: `${normalized}/${trimmed}` };
}

/** Whether a stored value is a well-formed watch: a Ref and an added-at. */
function isWatch(value: unknown): value is Watch {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.ref === 'string' &&
    record.ref !== '' &&
    typeof record.addedAt === 'string' &&
    record.addedAt !== ''
  );
}

/**
 * The valid watch entries of a stored map, keyed by normalized host+project. An
 * entry whose key no longer parses, or whose value is not a Ref and an added-at,
 * counts as dropped, so a reader ignores it while a writer refuses it.
 */
function normalizeWatches(raw: unknown): { watches: Record<string, Watch>; dropped: number } {
  const watches: Record<string, Watch> = {};
  let dropped = 0;
  if (typeof raw === 'object' && raw !== null) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const slash = key.indexOf('/');
      const host = slash === -1 ? '' : key.slice(0, slash);
      const project = slash === -1 ? '' : key.slice(slash + 1);
      const parsedKey = watchKey(host, project);
      if (parsedKey.ok && isWatch(value)) watches[parsedKey.key] = value;
      else dropped += 1;
    }
  }
  return { watches, dropped };
}

/**
 * Read the configuration, yielding the default when the file is absent or
 * unreadable, or when its contents are not valid JSON — a corrupt file starts
 * the user fresh rather than making the Extension unusable. A stored host,
 * token key or watch key that no longer normalizes is dropped rather than
 * carried forward.
 */
export async function readConfig(fs: ConfigFs, path: string): Promise<Config> {
  let raw: string;
  try {
    raw = await fs.readFile(path);
  } catch {
    return defaultConfig();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultConfig();
  }
  if (typeof parsed !== 'object' || parsed === null) return defaultConfig();

  const record = parsed as Record<string, unknown>;
  const host = typeof record.host === 'string' ? normalizeHost(record.host) : null;
  const project = typeof record.project === 'string' ? record.project : '';

  return {
    host: host ?? DEFAULT_HOST,
    project,
    tokens: normalizeTokens(record.tokens).tokens,
    watches: normalizeWatches(record.watches).watches,
  };
}

/** A change to the configuration, or the reason it was refused. */
export type ConfigChange = { ok: true; config: Config } | { ok: false; error: string };

/** Set or replace the Access token for a host. */
export function setToken(config: Config, host: string, token: string): ConfigChange {
  const normalized = normalizeHost(host);
  if (!normalized) return { ok: false, error: HOST_ERROR };
  const value = token.trim();
  if (!value) return { ok: false, error: 'An Access token is required.' };
  return { ok: true, config: { ...config, tokens: { ...config.tokens, [normalized]: value } } };
}

/** Remove the Access token for a host, leaving every other host's token in place. */
export function clearToken(config: Config, host: string): ConfigChange {
  const normalized = normalizeHost(host);
  if (!normalized) return { ok: false, error: HOST_ERROR };
  const tokens = { ...config.tokens };
  delete tokens[normalized];
  return { ok: true, config: { ...config, tokens } };
}

/** The Access token for a host, or null when there is none. */
export function resolveToken(config: Config, host: string): string | null {
  const normalized = normalizeHost(host);
  if (!normalized) return null;
  return config.tokens[normalized] ?? null;
}

/**
 * Set one Watched Ref for a host and project, replacing any previous Ref for
 * that project. A blank Ref is refused rather than treated as a clear, so only
 * an explicit clear removes a watch.
 */
export function setWatch(
  config: Config,
  host: string,
  project: string,
  ref: string,
  addedAt: string,
): ConfigChange {
  const resolved = watchKey(host, project);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const value = ref.trim();
  if (!value) return { ok: false, error: REF_ERROR };
  return {
    ok: true,
    config: { ...config, watches: { ...config.watches, [resolved.key]: { ref: value, addedAt } } },
  };
}

/** Remove the watch for a host and project, leaving every other project's watch in place. */
export function clearWatch(config: Config, host: string, project: string): ConfigChange {
  const resolved = watchKey(host, project);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const watches = { ...config.watches };
  delete watches[resolved.key];
  return { ok: true, config: { ...config, watches } };
}

/** The watch for a host and project, or null when there is none. */
export function resolveWatch(config: Config, host: string, project: string): Watch | null {
  const resolved = watchKey(host, project);
  if (!resolved.ok) return null;
  return config.watches[resolved.key] ?? null;
}

/**
 * Persist the configuration as a `0600` file, creating its directory. A host
 * that no longer normalizes, a token keyed by one, or a watch keyed by one is
 * refused and nothing is written.
 */
export async function saveConfig(fs: ConfigFs, path: string, config: Config): Promise<ConfigChange> {
  const host = normalizeHost(config.host);
  if (!host) return { ok: false, error: HOST_ERROR };

  const { tokens, dropped } = normalizeTokens(config.tokens);
  if (dropped > 0) return { ok: false, error: 'A token is keyed by an invalid GitLab host.' };

  const normalizedWatches = normalizeWatches(config.watches);
  if (normalizedWatches.dropped > 0) {
    return { ok: false, error: 'A watch is keyed by an invalid GitLab host or project.' };
  }

  const next: Config = {
    host,
    project: config.project,
    tokens,
    watches: normalizedWatches.watches,
  };
  await fs.mkdir(dirname(path));
  await fs.writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 0o600);
  await fs.chmod(path, 0o600);
  return { ok: true, config: next };
}
