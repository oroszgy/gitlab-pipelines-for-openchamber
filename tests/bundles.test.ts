import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Every bundle a build script compiles must also be typechecked. `bun run check`
 * builds each entry but only `tsc` catches its type errors, and `tsc` sees a
 * bundle only when its directory is in `tsconfig.json`'s `include` — so a new
 * `status/` bundle once shipped with no typechecking at all. This guard fails the
 * moment a `build:*` script names an entry outside the typechecked roots.
 */

const root = new URL('..', import.meta.url);

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, root), 'utf8')) as T;
}

describe('every bundle entry is typechecked', () => {
  const { scripts } = readJson<{ scripts: Record<string, string> }>('package.json');
  const { include } = readJson<{ include: string[] }>('tsconfig.json');
  const builds = Object.entries(scripts).filter(([name]) => name.startsWith('build:'));

  test('there is at least one bundle build script', () => {
    expect(builds.length).toBeGreaterThan(0);
  });

  for (const [name, script] of builds) {
    test(`${name}'s entry directory is in tsconfig include`, () => {
      const entry = script.split(/\s+/).find((token) => token.endsWith('.ts'));
      expect(entry, `${name} names no .ts entry`).toBeDefined();
      expect(include).toContain(dirname(entry as string));
    });
  }
});
