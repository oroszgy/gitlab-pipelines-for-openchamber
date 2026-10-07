import { describe, expect, test } from 'bun:test';
import type { JsonValue } from '@openchamber/sdk';
import { PREF_KEY_PREFIX, PREF_MAX_RECORDS, prefKey, readPrefs, writePrefs, type PrefStore } from './prefs';

/** An in-memory `host.storage`, plus its backing map for assertions. */
function memoryStore(): { store: PrefStore; map: Map<string, JsonValue> } {
  const map = new Map<string, JsonValue>();
  return {
    map,
    store: {
      get: async (key) => map.get(key),
      set: async (key, value) => {
        map.set(key, value);
      },
      delete: async (key) => {
        map.delete(key);
      },
      keys: async () => [...map.keys()].sort(),
    },
  };
}

describe('prefs keys', () => {
  test('namespaces one record per host, project and ref', () => {
    const main = prefKey('gitlab.com', 'group/project', 'main');
    expect(main).toBe('gp:v1:gitlab.com:group/project:main');
    expect(main.startsWith(PREF_KEY_PREFIX)).toBe(true);
    expect(prefKey('gitlab.example.com', 'group/project', 'main')).not.toBe(main);
    expect(prefKey('gitlab.com', 'group/other', 'main')).not.toBe(main);
    expect(prefKey('gitlab.com', 'group/project', 'release/1.0')).not.toBe(main);
  });
});

describe('prefs records', () => {
  test('a written record reads back under its own key', async () => {
    const { store } = memoryStore();
    const key = prefKey('gitlab.com', 'group/project', 'main');
    await writePrefs(store, key, { scope: 'all' }, 1_000);
    expect((await readPrefs(store, key)).scope).toBe('all');
  });

  test('an unreadable or unwritable store is non-fatal', async () => {
    const failing: PrefStore = {
      get: async () => {
        throw new Error('storage unavailable');
      },
      set: async () => {
        throw new Error('storage unavailable');
      },
      delete: async () => {
        throw new Error('storage unavailable');
      },
      keys: async () => {
        throw new Error('storage unavailable');
      },
    };
    await expect(readPrefs(failing, 'gp:v1:x')).resolves.toEqual({});
    await expect(writePrefs(failing, 'gp:v1:x', { scope: 'all' }, 1)).resolves.toBeUndefined();
  });

  test('a malformed stored value reads as no record', async () => {
    const { store, map } = memoryStore();
    map.set('gp:v1:x', 'not-a-record');
    map.set('gp:v1:y', ['nope']);
    expect(await readPrefs(store, 'gp:v1:x')).toEqual({});
    expect(await readPrefs(store, 'gp:v1:y')).toEqual({});
  });

  test('LRU pruning drops the oldest records past the cap', async () => {
    const { store } = memoryStore();
    for (let i = 0; i <= PREF_MAX_RECORDS; i++) {
      await writePrefs(store, prefKey('h', 'p', `ref-${i}`), { scope: 'all' }, i);
    }
    const keys = await store.keys();
    expect(keys.length).toBe(PREF_MAX_RECORDS);
    expect(await readPrefs(store, prefKey('h', 'p', 'ref-0'))).toEqual({});
    expect((await readPrefs(store, prefKey('h', 'p', `ref-${PREF_MAX_RECORDS}`))).scope).toBe('all');
  });
});
