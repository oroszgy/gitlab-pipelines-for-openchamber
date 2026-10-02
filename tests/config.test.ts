import { describe, expect, test } from 'bun:test';
import { join, win32 } from 'node:path';
import {
  clearToken,
  configPath,
  defaultConfig,
  normalizeHost,
  readConfig,
  resolveToken,
  saveConfig,
  setToken,
  type Config,
  type ConfigFs,
} from '../service/config';

type Entry = { content: string; mode: number };

/** A filesystem seam backed by a path → entry map, exposing that map for assertions. */
function fakeFs(entries: Record<string, Entry> = {}): ConfigFs & { entries: Record<string, Entry> } {
  return {
    entries,
    async readFile(path) {
      const entry = entries[path];
      if (!entry) {
        const error = new Error(`ENOENT ${path}`) as Error & { code: string };
        error.code = 'ENOENT';
        throw error;
      }
      return entry.content;
    },
    async writeFile(path, content, mode) {
      // Mirrors Node: `mode` applies only when the file is created.
      const existing = entries[path];
      entries[path] = { content, mode: existing ? existing.mode : mode };
    },
    async chmod(path, mode) {
      const entry = entries[path];
      if (entry) entry.mode = mode;
    },
    async mkdir() {},
  };
}

describe('configPath', () => {
  test('uses XDG_CONFIG_HOME on a posix host when set', () => {
    expect(configPath({ XDG_CONFIG_HOME: '/xdg', HOME: '/home/me' }, 'linux')).toBe(
      join('/xdg', 'gitlab-pipelines', 'config.json'),
    );
  });

  test('falls back to ~/.config on a posix host', () => {
    expect(configPath({ HOME: '/home/me' }, 'linux')).toBe(
      join('/home/me', '.config', 'gitlab-pipelines', 'config.json'),
    );
  });

  test('treats an empty XDG_CONFIG_HOME as unset', () => {
    expect(configPath({ XDG_CONFIG_HOME: '', HOME: '/home/me' }, 'linux')).toBe(
      join('/home/me', '.config', 'gitlab-pipelines', 'config.json'),
    );
  });

  test('uses Application Support on macOS', () => {
    expect(configPath({ HOME: '/Users/me' }, 'darwin')).toBe(
      join('/Users/me', 'Library', 'Application Support', 'gitlab-pipelines', 'config.json'),
    );
  });

  test('uses APPDATA on Windows', () => {
    expect(configPath({ APPDATA: 'C:\\Users\\me\\AppData\\Roaming' }, 'win32')).toBe(
      win32.join('C:\\Users\\me\\AppData\\Roaming', 'gitlab-pipelines', 'config.json'),
    );
  });
});

describe('normalizeHost', () => {
  test.each([
    ['gitlab.com', 'gitlab.com'],
    ['https://gitlab.com', 'gitlab.com'],
    ['https://gitlab.com/', 'gitlab.com'],
    ['GitLab.com', 'gitlab.com'],
    ['https://gitlab.example.com:8443/', 'gitlab.example.com:8443'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeHost(input)).toBe(expected);
  });

  test.each([
    [''],
    ['   '],
    ['http://gitlab.com'],
    ['https://user:pass@gitlab.com'],
    ['https://gitlab.com/group'],
    ['not a host'],
  ])('refuses %s', (input) => {
    expect(normalizeHost(input)).toBeNull();
  });
});

describe('readConfig', () => {
  test('yields the default configuration when there is no file', async () => {
    expect(await readConfig(fakeFs(), '/cfg/config.json')).toEqual(defaultConfig());
  });

  test('yields the default configuration when the file is not valid JSON', async () => {
    const fs = fakeFs({ '/cfg/config.json': { content: 'not json', mode: 0o600 } });
    expect(await readConfig(fs, '/cfg/config.json')).toEqual(defaultConfig());
  });

  test('reads the host, project and tokens, normalizing the host spelling', async () => {
    const stored = JSON.stringify({
      host: 'https://GitLab.com/',
      project: 'group/project',
      tokens: { 'https://Self.example.com/': 'secret-a' },
    });
    const fs = fakeFs({ '/cfg/config.json': { content: stored, mode: 0o600 } });
    expect(await readConfig(fs, '/cfg/config.json')).toEqual({
      host: 'gitlab.com',
      project: 'group/project',
      tokens: { 'self.example.com': 'secret-a' },
    });
  });

  test('falls back to the default host when the stored host is malformed', async () => {
    const stored = JSON.stringify({ host: 'http://nope', project: '', tokens: {} });
    const fs = fakeFs({ '/cfg/config.json': { content: stored, mode: 0o600 } });
    expect((await readConfig(fs, '/cfg/config.json')).host).toBe('gitlab.com');
  });
});

const PATH = '/cfg/config.json';

function config(overrides: Partial<Config> = {}): Config {
  return { ...defaultConfig(), ...overrides };
}

describe('saveConfig', () => {
  test('writes the file as 0600 and reads back', async () => {
    const fs = fakeFs();
    const saved = await saveConfig(fs, PATH, config({ project: 'group/project' }));
    expect(saved.ok).toBe(true);
    expect(fs.entries[PATH]?.mode).toBe(0o600);
    expect(await readConfig(fs, PATH)).toEqual(config({ project: 'group/project' }));
  });

  test('rewrites an existing file with looser permissions to 0600', async () => {
    const fs = fakeFs({ [PATH]: { content: '{}', mode: 0o644 } });
    await saveConfig(fs, PATH, config());
    expect(fs.entries[PATH]?.mode).toBe(0o600);
  });

  test('rejects a malformed host and stores nothing', async () => {
    const fs = fakeFs();
    const result = await saveConfig(fs, PATH, config({ host: 'http://nope' }));
    expect(result.ok).toBe(false);
    expect(fs.entries[PATH]).toBeUndefined();
  });

  test('rejects a token keyed by a malformed host and stores nothing', async () => {
    const fs = fakeFs();
    const result = await saveConfig(fs, PATH, config({ tokens: { 'http://nope': 'a' } }));
    expect(result.ok).toBe(false);
    expect(fs.entries[PATH]).toBeUndefined();
  });
});

describe('Access tokens', () => {
  test('sets a token per host without disturbing another host', () => {
    const first = setToken(config(), 'gitlab.com', 'a');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = setToken(first.config, 'gitlab.example.com', 'b');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.config.tokens).toEqual({ 'gitlab.com': 'a', 'gitlab.example.com': 'b' });
  });

  test('treats a bare host and its origin as the same key', () => {
    const stored = config({ tokens: { 'gitlab.com': 'a' } });
    expect(resolveToken(stored, 'https://gitlab.com/')).toBe('a');
  });

  test('clears one host\u2019s token and leaves the others', () => {
    const stored = config({ tokens: { 'gitlab.com': 'a', 'gitlab.example.com': 'b' } });
    const cleared = clearToken(stored, 'gitlab.com');
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.config.tokens).toEqual({ 'gitlab.example.com': 'b' });
  });

  test('resolves nothing for a host with no token', () => {
    expect(resolveToken(config(), 'gitlab.com')).toBeNull();
  });

  test('rejects a token for a malformed host', () => {
    expect(setToken(config(), 'http://nope', 'a').ok).toBe(false);
    expect(clearToken(config(), 'not a host').ok).toBe(false);
    expect(resolveToken(config(), 'http://nope')).toBeNull();
  });
});
