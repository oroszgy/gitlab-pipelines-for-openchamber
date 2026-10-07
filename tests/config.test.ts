import { describe, expect, test } from 'bun:test';
import { join, win32 } from 'node:path';
import {
  appendEvent,
  clearToken,
  clearWatch,
  clearWatchError,
  configPath,
  defaultConfig,
  EVENT_LOG_MAX,
  eventCursor,
  eventsAfter,
  normalizeHost,
  readConfig,
  resolveToken,
  resolveWatch,
  saveConfig,
  setToken,
  setWatch,
  setWatchError,
  type Config,
  type ConfigFs,
  type Event,
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
      watches: {},
      events: [],
      eventSeq: 0,
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

describe('watches', () => {
  const addedAt = '2026-01-02T03:04:05.000Z';

  test('round-trips a watch through the config file, so it survives a restart', async () => {
    const fs = fakeFs();
    const stored = config({ watches: { 'gitlab.com/group/project': { ref: 'main', addedAt } } });
    const saved = await saveConfig(fs, PATH, stored);
    expect(saved.ok).toBe(true);
    expect(await readConfig(fs, PATH)).toEqual(stored);
  });

  test('reads an older config that has no watch field', async () => {
    const stored = JSON.stringify({ host: 'gitlab.com', project: '', tokens: {} });
    const fs = fakeFs({ [PATH]: { content: stored, mode: 0o600 } });
    expect((await readConfig(fs, PATH)).watches).toEqual({});
  });

  test('sets one watch for a project, replacing a previous Ref', () => {
    const first = setWatch(config(), 'gitlab.com', 'group/project', 'main', addedAt);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = setWatch(first.config, 'https://gitlab.com/', 'group/project', 'release', addedAt);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(Object.keys(second.config.watches)).toEqual(['gitlab.com/group/project']);
    expect(resolveWatch(second.config, 'gitlab.com', 'group/project')).toEqual({ ref: 'release', addedAt });
  });

  test('keeps watches for different projects apart', () => {
    const first = setWatch(config(), 'gitlab.com', 'group/a', 'main', addedAt);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = setWatch(first.config, 'gitlab.com', 'group/b', 'release', addedAt);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(resolveWatch(second.config, 'gitlab.com', 'group/a')?.ref).toBe('main');
    expect(resolveWatch(second.config, 'gitlab.com', 'group/b')?.ref).toBe('release');
  });

  test('clears one project\u2019s watch and leaves the others', () => {
    const both = config({
      watches: {
        'gitlab.com/group/a': { ref: 'main', addedAt },
        'gitlab.com/group/b': { ref: 'release', addedAt },
      },
    });
    const cleared = clearWatch(both, 'gitlab.com', 'group/a');
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.config.watches).toEqual({ 'gitlab.com/group/b': { ref: 'release', addedAt } });
  });

  test('resolves nothing for a project with no watch', () => {
    expect(resolveWatch(config(), 'gitlab.com', 'group/project')).toBeNull();
  });

  test('treats a bare host and its origin as the same key', () => {
    const stored = config({ watches: { 'gitlab.com/group/project': { ref: 'main', addedAt } } });
    expect(resolveWatch(stored, 'https://gitlab.com/', 'group/project')?.ref).toBe('main');
  });

  test('refuses a watch with no Ref', () => {
    expect(setWatch(config(), 'gitlab.com', 'group/project', '   ', addedAt).ok).toBe(false);
  });

  test('refuses a watch with no project', () => {
    expect(setWatch(config(), 'gitlab.com', '', 'main', addedAt).ok).toBe(false);
    expect(clearWatch(config(), 'gitlab.com', '').ok).toBe(false);
  });

  test('drops a malformed stored watch but keeps a good one', async () => {
    const stored = JSON.stringify({
      host: 'gitlab.com',
      project: '',
      tokens: {},
      watches: {
        'gitlab.com/group/project': { ref: 'main', addedAt },
        'gitlab.com/group/broken': { ref: 42 },
        'not a host/group/x': { ref: 'main', addedAt },
      },
    });
    const fs = fakeFs({ [PATH]: { content: stored, mode: 0o600 } });
    expect((await readConfig(fs, PATH)).watches).toEqual({
      'gitlab.com/group/project': { ref: 'main', addedAt },
    });
  });
});

describe('watch errors', () => {
  const addedAt = '2026-01-02T03:04:05.000Z';
  const key = 'gitlab.com/group/project';

  test('records a watch error and clears it again', () => {
    const watched = config({ watches: { [key]: { ref: 'main', addedAt } } });
    const errored = setWatchError(watched, 'gitlab.com', 'group/project', 'moved');
    expect(resolveWatch(errored, 'gitlab.com', 'group/project')?.error).toBe('moved');
    expect(resolveWatch(errored, 'gitlab.com', 'group/project')?.ref).toBe('main');
    const cleared = clearWatchError(errored, 'gitlab.com', 'group/project');
    expect(resolveWatch(cleared, 'gitlab.com', 'group/project')).toEqual({ ref: 'main', addedAt });
  });

  test('leaves a project with no watch alone', () => {
    const errored = setWatchError(config(), 'gitlab.com', 'group/project', 'moved');
    expect(errored.watches).toEqual({});
  });

  test('a watch error round-trips through the config file', async () => {
    const fs = fakeFs();
    const watched = config({ watches: { [key]: { ref: 'main', addedAt } } });
    const errored = setWatchError(watched, 'gitlab.com', 'group/project', 'moved');
    const saved = await saveConfig(fs, PATH, errored);
    expect(saved.ok).toBe(true);
    expect(resolveWatch(await readConfig(fs, PATH), 'gitlab.com', 'group/project')?.error).toBe('moved');
  });

  test('drops a malformed stored error but keeps the watch', async () => {
    const stored = JSON.stringify({
      host: 'gitlab.com',
      project: '',
      tokens: {},
      watches: { [key]: { ref: 'main', addedAt, error: 42 } },
    });
    const fs = fakeFs({ [PATH]: { content: stored, mode: 0o600 } });
    expect(resolveWatch(await readConfig(fs, PATH), 'gitlab.com', 'group/project')).toEqual({
      ref: 'main',
      addedAt,
    });
  });
});

describe('the event log', () => {
  const at = '2026-01-02T03:04:05.000Z';
  const event = (overrides: Partial<Event> = {}): Event => ({
    host: 'gitlab.com',
    project: 'group/project',
    ref: 'main',
    pipelineId: 1,
    status: 'success',
    at,
    ...overrides,
  });

  test('round-trips events and the cursor through the config file, so they survive a restart', async () => {
    const fs = fakeFs();
    const stored = config({
      events: [event(), event({ pipelineId: 2, status: 'failed' })],
      eventSeq: 2,
    });
    const saved = await saveConfig(fs, PATH, stored);
    expect(saved.ok).toBe(true);
    expect(await readConfig(fs, PATH)).toEqual(stored);
  });

  test('reads an older config that has no event fields', async () => {
    const stored = JSON.stringify({ host: 'gitlab.com', project: '', tokens: {} });
    const fs = fakeFs({ [PATH]: { content: stored, mode: 0o600 } });
    const config = await readConfig(fs, PATH);
    expect(config.events).toEqual([]);
    expect(config.eventSeq).toBe(0);
  });

  test('appends an event and advances the cursor', () => {
    const next = appendEvent(config(), event());
    expect(next.events).toEqual([event()]);
    expect(next.eventSeq).toBe(1);
    expect(eventCursor(next)).toBe(1);
  });

  test('does not record a second event with an identity already present', () => {
    const once = appendEvent(config(), event());
    const twice = appendEvent(once, event());
    expect(twice.events).toHaveLength(1);
    expect(twice.eventSeq).toBe(1);
  });

  test('keeps a distinct identity part of the event apart', () => {
    const once = appendEvent(config(), event());
    const next = appendEvent(once, event({ status: 'failed' }));
    expect(next.events).toHaveLength(2);
  });

  test('bounds the log, dropping the oldest', () => {
    let stored = config();
    for (let i = 1; i <= EVENT_LOG_MAX + 5; i += 1) stored = appendEvent(stored, event({ pipelineId: i }));
    expect(stored.events).toHaveLength(EVENT_LOG_MAX);
    expect(stored.events[0]?.pipelineId).toBe(6);
    expect(stored.events.at(-1)?.pipelineId).toBe(EVENT_LOG_MAX + 5);
    expect(stored.eventSeq).toBe(EVENT_LOG_MAX + 5);
  });

  test('reads only the events after a cursor', () => {
    let stored = config();
    for (let i = 1; i <= 3; i += 1) stored = appendEvent(stored, event({ pipelineId: i }));
    expect(eventsAfter(stored, 0).map((e) => e.pipelineId)).toEqual([1, 2, 3]);
    expect(eventsAfter(stored, 1).map((e) => e.pipelineId)).toEqual([2, 3]);
    expect(eventsAfter(stored, 3)).toEqual([]);
  });

  test('reads every retained event when the cursor predates the dropped window', () => {
    let stored = config();
    for (let i = 1; i <= EVENT_LOG_MAX + 5; i += 1) stored = appendEvent(stored, event({ pipelineId: i }));
    expect(eventsAfter(stored, 0)).toHaveLength(EVENT_LOG_MAX);
  });

  test('drops a malformed stored event but keeps a good one', async () => {
    const stored = JSON.stringify({
      host: 'gitlab.com',
      project: '',
      tokens: {},
      events: [
        event(),
        { host: 'gitlab.com', project: '', ref: 'main', pipelineId: 1, status: 'success', at },
        { bad: true },
      ],
      eventSeq: 3,
    });
    const fs = fakeFs({ [PATH]: { content: stored, mode: 0o600 } });
    expect((await readConfig(fs, PATH)).events).toEqual([event()]);
  });

  test('rejects a stored event keyed by a malformed host, writing nothing', async () => {
    const fs = fakeFs();
    const result = await saveConfig(fs, PATH, config({ events: [event({ host: 'http://nope' })] }));
    expect(result.ok).toBe(false);
    expect(fs.entries[PATH]).toBeUndefined();
  });
});
