import { describe, expect, test } from 'bun:test';
import { parseGitdir, resolveGitConfig, type GitConfigFs } from '../service/git-config';

type Entry = { kind: 'file' | 'directory'; content?: string };

/** A filesystem seam backed by a path → entry map. */
function fakeFs(entries: Record<string, Entry>): GitConfigFs {
  return {
    async stat(path) {
      return entries[path]?.kind ?? null;
    },
    async readFile(path) {
      const entry = entries[path];
      if (!entry || entry.kind !== 'file' || entry.content == null) {
        const error = new Error(`ENOENT ${path}`) as Error & { code: string };
        error.code = 'ENOENT';
        throw error;
      }
      return entry.content;
    },
  };
}

const CONFIG = '[remote "origin"]\n\turl = git@gitlab.com:group/project.git\n';

describe('parseGitdir', () => {
  test('resolves an absolute pointer', () => {
    expect(parseGitdir('gitdir: /primary/.git/worktrees/wt\n', '/repo')).toBe(
      '/primary/.git/worktrees/wt',
    );
  });

  test('resolves a relative pointer against the open directory', () => {
    expect(parseGitdir('gitdir: ../primary/.git/worktrees/wt\n', '/repo')).toBe(
      '/primary/.git/worktrees/wt',
    );
  });

  test('returns null when there is no marker', () => {
    expect(parseGitdir('[core]\n', '/repo')).toBeNull();
  });
});

describe('resolveGitConfig', () => {
  test('reads a normal checkout’s own config', async () => {
    const fs = fakeFs({
      '/repo/.git': { kind: 'directory' },
      '/repo/.git/config': { kind: 'file', content: CONFIG },
    });
    expect(await resolveGitConfig({ directory: '/repo' }, fs)).toEqual({
      ok: true,
      config: CONFIG,
    });
  });

  test('follows a worktree commondir to the primary config', async () => {
    const fs = fakeFs({
      '/wt/.git': { kind: 'file', content: 'gitdir: /primary/.git/worktrees/wt\n' },
      '/primary/.git/worktrees/wt/commondir': { kind: 'file', content: '../..\n' },
      '/primary/.git/config': { kind: 'file', content: CONFIG },
    });
    expect(await resolveGitConfig({ directory: '/wt' }, fs)).toEqual({
      ok: true,
      config: CONFIG,
    });
  });

  test('falls back to the gitdir’s own config when there is no commondir', async () => {
    const fs = fakeFs({
      '/wt/.git': { kind: 'file', content: 'gitdir: /super/.git/modules/sub\n' },
      '/super/.git/modules/sub/config': { kind: 'file', content: CONFIG },
    });
    expect(await resolveGitConfig({ directory: '/wt' }, fs)).toEqual({
      ok: true,
      config: CONFIG,
    });
  });

  test('reports a directory that is not a repository', async () => {
    const fs = fakeFs({});
    const result = await resolveGitConfig({ directory: '/repo' }, fs);
    expect(result.ok).toBe(false);
  });

  test('reports a repository whose config cannot be read', async () => {
    const fs = fakeFs({ '/repo/.git': { kind: 'directory' } });
    const result = await resolveGitConfig({ directory: '/repo' }, fs);
    expect(result.ok).toBe(false);
  });

  test('reports a .git pointer that is not a gitdir', async () => {
    const fs = fakeFs({ '/repo/.git': { kind: 'file', content: 'nonsense\n' } });
    const result = await resolveGitConfig({ directory: '/repo' }, fs);
    expect(result.ok).toBe(false);
  });

  test('reports an empty directory', async () => {
    const fs = fakeFs({});
    const result = await resolveGitConfig({ directory: '  ' }, fs);
    expect(result.ok).toBe(false);
  });
});
