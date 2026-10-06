import { describe, expect, test } from 'bun:test';
import {
  cleanProjectPath,
  deriveRef,
  hostOfOrigin,
  isLinkedWorktree,
  parseHeadRef,
  parseRemoteUrl,
  pickRemote,
  resolveProject,
  worktreePrimaryDirectory,
} from '../panel/project-resolver';

describe('parseRemoteUrl', () => {
  const cases: Array<[string, { host: string; path: string }]> = [
    ['git@gitlab.com:group/project.git', { host: 'gitlab.com', path: 'group/project' }],
    ['git@gitlab.com:group/subgroup/project.git', { host: 'gitlab.com', path: 'group/subgroup/project' }],
    ['git@gitlab.com:/group/project.git', { host: 'gitlab.com', path: 'group/project' }],
    ['ssh://git@gitlab.example.com:2222/group/project.git', { host: 'gitlab.example.com:2222', path: 'group/project' }],
    ['https://gitlab.example.com/group/project.git', { host: 'gitlab.example.com', path: 'group/project' }],
    ['https://user:token@gitlab.example.com/tanuki/awesome_project.git', { host: 'gitlab.example.com', path: 'tanuki/awesome_project' }],
    ['https://gitlab.com/group/project', { host: 'gitlab.com', path: 'group/project' }],
    ['https://gitlab.com/group/project/', { host: 'gitlab.com', path: 'group/project' }],
    ['git://gitlab.com/group/project.git', { host: 'gitlab.com', path: 'group/project' }],
    ['git@GitLab.com:group/project.git', { host: 'gitlab.com', path: 'group/project' }],
    ['ssh://git@GitLab.Example.com:2222/group/project.git', { host: 'gitlab.example.com:2222', path: 'group/project' }],
  ];

  for (const [remote, expected] of cases) {
    test(`${remote} → ${expected.host}/${expected.path}`, () => {
      expect(parseRemoteUrl(remote)).toEqual(expected);
    });
  }

  test('rejects values with no host or no path', () => {
    expect(parseRemoteUrl('')).toBeNull();
    expect(parseRemoteUrl('not-a-remote')).toBeNull();
    expect(parseRemoteUrl('https://gitlab.com')).toBeNull();
    expect(parseRemoteUrl('git@gitlab.com:')).toBeNull();
  });
});

describe('cleanProjectPath', () => {
  test('strips a leading slash, a trailing slash and one trailing .git', () => {
    expect(cleanProjectPath('/group/proj.git/')).toBe('group/proj');
    expect(cleanProjectPath('group/proj.GIT')).toBe('group/proj');
  });
});

describe('hostOfOrigin', () => {
  test('includes a non-default port', () => {
    expect(hostOfOrigin('https://gitlab.example.com:8443')).toBe('gitlab.example.com:8443');
    expect(hostOfOrigin('https://gitlab.com')).toBe('gitlab.com');
  });
});

describe('parseHeadRef', () => {
  test('reads a branch ref', () => {
    expect(parseHeadRef('ref: refs/heads/feature/x\n')).toBe('feature/x');
  });
  test('reads a tag ref', () => {
    expect(parseHeadRef('ref: refs/tags/v1.0.0')).toBe('v1.0.0');
  });
  test('a detached HEAD yields null', () => {
    expect(parseHeadRef('0123456789abcdef0123456789abcdef01234567')).toBeNull();
    expect(parseHeadRef(null)).toBeNull();
  });
});

describe('pickRemote', () => {
  const config = `[remote "upstream"]
\turl = https://gitlab.com/up/proj.git
[remote "origin"]
\turl = git@gitlab.com:group/project.git
[remote "fork"]
\turl = https://gitlab.com/me/proj.git
`;

  test('prefers origin', () => {
    expect(pickRemote(config)).toEqual({
      name: 'origin',
      remote: { host: 'gitlab.com', path: 'group/project' },
    });
  });

  test('falls back to upstream then the first remote', () => {
    const noOrigin = `[remote "fork"]
\turl = https://gitlab.com/me/proj.git
[remote "upstream"]
\turl = https://gitlab.com/up/proj.git
`;
    expect(pickRemote(noOrigin)?.name).toBe('upstream');
    const onlyFork = `[remote "fork"]
\turl = https://gitlab.com/me/proj.git
`;
    expect(pickRemote(onlyFork)?.name).toBe('fork');
  });

  test('returns null when no remote parses', () => {
    expect(pickRemote('[core]\n\tbare = false\n')).toBeNull();
  });
});

describe('deriveRef', () => {
  const worktrees = [
    { directory: '/other', name: 'other', branch: 'other-branch', status: 'ready' as const },
    { directory: '/repo/', name: 'primary', branch: 'main', status: 'ready' as const },
  ];

  test('prefers a matching worktree branch', () => {
    expect(deriveRef('/repo', 'ref: refs/heads/head-branch', worktrees)).toBe('main');
  });

  test('falls back to HEAD when no worktree matches', () => {
    expect(deriveRef('/elsewhere', 'ref: refs/heads/head-branch', worktrees)).toBe('head-branch');
  });

  test('falls back to HEAD when there is no worktree list', () => {
    expect(deriveRef('/repo', 'ref: refs/heads/head-branch', null)).toBe('head-branch');
  });

  test('returns null when neither source helps', () => {
    expect(deriveRef('/repo', '0123456789abcdef', [])).toBeNull();
  });
});

describe('resolveProject', () => {
  const apiOrigin = 'https://gitlab.com';
  const gitConfig = '[remote "origin"]\n\turl = git@gitlab.com:group/project.git\n';

  test('no project and no override is no-project', () => {
    expect(resolveProject({ directory: null, apiOrigin })).toEqual({ ok: false, failure: 'no-project' });
  });

  test('a directory with no readable remote is not-a-repo', () => {
    expect(resolveProject({ directory: '/repo', apiOrigin, gitConfig: null })).toEqual({
      ok: false,
      failure: 'not-a-repo',
    });
  });

  test('derives host, project and ref', () => {
    expect(
      resolveProject({
        directory: '/repo',
        apiOrigin,
        gitConfig,
        head: 'ref: refs/heads/main\n',
      }),
    ).toEqual({ ok: true, host: 'gitlab.com', project: 'group/project', ref: 'main', source: 'derived' });
  });

  test('a remote on a different host is host-mismatch', () => {
    expect(
      resolveProject({
        directory: '/repo',
        apiOrigin,
        gitConfig: '[remote "origin"]\n\turl = git@github.com:me/proj.git\n',
      }),
    ).toEqual({
      ok: false,
      failure: 'host-mismatch',
      detectedHost: 'github.com',
      detectedPath: 'me/proj',
    });
  });

  test('a capitalised scp-style remote still matches the configured host', () => {
    expect(
      resolveProject({
        directory: '/repo',
        apiOrigin,
        gitConfig: '[remote "origin"]\n\turl = git@GitLab.com:group/project.git\n',
        head: 'ref: refs/heads/main\n',
      }),
    ).toEqual({ ok: true, host: 'gitlab.com', project: 'group/project', ref: 'main', source: 'derived' });
  });

  test('a project override wins even with no directory', () => {
    expect(
      resolveProject({ directory: null, apiOrigin, projectOverride: 'group/pinned' }),
    ).toEqual({ ok: true, host: 'gitlab.com', project: 'group/pinned', ref: null, source: 'override' });
  });

  test('a project override ignores a host mismatch', () => {
    expect(
      resolveProject({
        directory: '/repo',
        apiOrigin,
        projectOverride: 'group/pinned',
        gitConfig: '[remote "origin"]\n\turl = git@github.com:me/proj.git\n',
        head: 'ref: refs/heads/main\n',
      }),
    ).toEqual({ ok: true, host: 'gitlab.com', project: 'group/pinned', ref: 'main', source: 'override' });
  });

  test('an empty override is treated as unset', () => {
    expect(resolveProject({ directory: null, apiOrigin, projectOverride: '   ' })).toEqual({
      ok: false,
      failure: 'no-project',
    });
  });

  test('the worktree list supplies the ref for a linked worktree', () => {
    const worktrees = [
      { directory: '/repo', name: 'primary', branch: 'main', status: 'ready' as const },
    ];
    const result = resolveProject({ directory: '/repo', apiOrigin, gitConfig, head: null, worktrees });
    expect(result.ok && result.ref).toBe('main');
  });

  test('a linked worktree reports its own failure, with the ref it could find', () => {
    const worktrees = [
      { directory: '/repo', name: 'feature', branch: 'feature/x', status: 'ready' as const },
    ];
    expect(
      resolveProject({
        directory: '/repo',
        apiOrigin,
        gitConfig: null,
        gitFile: 'gitdir: /main/.git/worktrees/repo\n',
        worktrees,
      }),
    ).toEqual({ ok: false, failure: 'linked-worktree', detectedRef: 'feature/x' });
  });

  test('a gitdir pointer without a known ref still reports a linked worktree', () => {
    expect(
      resolveProject({
        directory: '/repo',
        apiOrigin,
        gitConfig: null,
        gitFile: 'gitdir: /main/.git/worktrees/repo\n',
      }),
    ).toEqual({ ok: false, failure: 'linked-worktree', detectedRef: null });
  });

  test('an unreadable config with no gitdir pointer is still not-a-repo', () => {
    expect(
      resolveProject({ directory: '/repo', apiOrigin, gitConfig: null, gitFile: null }),
    ).toEqual({ ok: false, failure: 'not-a-repo' });
  });
});

describe('isLinkedWorktree', () => {
  test('detects the gitdir pointer line', () => {
    expect(isLinkedWorktree('gitdir: /main/.git/worktrees/repo\n')).toBe(true);
    expect(isLinkedWorktree('  gitdir: /main/.git/worktrees/repo')).toBe(true);
  });
  test('is false for a directory listing, a config file or nothing', () => {
    expect(isLinkedWorktree('ref: refs/heads/main\n')).toBe(false);
    expect(isLinkedWorktree('[core]\n\tbare = false\n')).toBe(false);
    expect(isLinkedWorktree(null)).toBe(false);
    expect(isLinkedWorktree('')).toBe(false);
  });
});

describe('worktreePrimaryDirectory', () => {
  test('names the primary checkout a worktree gitdir sits under', () => {
    expect(worktreePrimaryDirectory('gitdir: /main/.git/worktrees/repo\n')).toBe('/main');
    expect(worktreePrimaryDirectory('gitdir: /a/b/.git/worktrees/feature-x')).toBe('/a/b');
  });
  test('is null when the pointer is relative or not a worktree layout', () => {
    expect(worktreePrimaryDirectory('gitdir: ../main/.git/worktrees/repo\n')).toBeNull();
    expect(worktreePrimaryDirectory('gitdir: /super/.git/modules/sub\n')).toBeNull();
    expect(worktreePrimaryDirectory('ref: refs/heads/main\n')).toBeNull();
    expect(worktreePrimaryDirectory(null)).toBeNull();
  });
});
