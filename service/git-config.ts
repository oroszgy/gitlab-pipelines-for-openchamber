/**
 * Resolve a repository's git config from an open directory.
 *
 * The Panel reaches a normal checkout's `.git/config` through the host file API,
 * but a Linked worktree's `.git` is a *file* pointing at the primary repository,
 * which lives outside the open project and so is unreadable there. The Panel
 * asks this service — a host-runtime process with the user's rights — to follow
 * that pointer and return the primary repository's config text. The service stays
 * GitLab-agnostic: it returns raw config, and the Panel parses the remote.
 *
 * Pure and injectable through the one seam it has — its file reads — so it can be
 * tested without a real repository.
 */

import { join, resolve } from 'node:path';

export type GitConfigRequest = {
  directory: string;
};

export type GitConfigResult = { ok: true; config: string } | { ok: false; error: string };

/** The filesystem seam: one kind probe and one text read, both by absolute path. */
export type GitConfigFs = {
  stat(path: string): Promise<'file' | 'directory' | null>;
  readFile(path: string): Promise<string>;
};

/**
 * The `gitdir:` a Linked worktree's `.git` file holds, resolved against the open
 * directory so a relative pointer works. Returns null when the marker is absent.
 */
export function parseGitdir(marker: string, directory: string): string | null {
  const match = /^\s*gitdir:\s*(.+?)\s*$/m.exec(marker);
  const raw = match?.[1];
  if (!raw) return null;
  return resolve(directory, raw);
}

/**
 * A directory's repository config: its own `.git/config` for a normal checkout,
 * or — following the `.git` pointer and the shared `commondir` — the primary
 * repository's config for a Linked worktree.
 */
export async function resolveGitConfig(
  request: GitConfigRequest,
  fs: GitConfigFs,
): Promise<GitConfigResult> {
  const directory = request.directory.trim();
  if (!directory) return { ok: false, error: 'A directory is required.' };

  const dotGit = join(directory, '.git');
  const kind = await fs.stat(dotGit);
  if (kind === 'directory') return readConfig(join(dotGit, 'config'), fs);
  if (kind !== 'file') return { ok: false, error: `${directory} is not a git repository.` };

  let marker: string;
  try {
    marker = await fs.readFile(dotGit);
  } catch {
    return { ok: false, error: 'Could not read the .git pointer.' };
  }
  const gitdir = parseGitdir(marker, directory);
  if (!gitdir) return { ok: false, error: 'The .git pointer is not a gitdir.' };

  const shared = await sharedGitDir(gitdir, fs);
  return readConfig(join(shared, 'config'), fs);
}

/**
 * A Linked worktree's shared git dir: its `commondir` resolved against the
 * worktree gitdir when present, else the gitdir itself (a submodule keeps its
 * config there).
 */
async function sharedGitDir(gitdir: string, fs: GitConfigFs): Promise<string> {
  try {
    const pointer = (await fs.readFile(join(gitdir, 'commondir'))).trim();
    if (pointer) return resolve(gitdir, pointer);
  } catch {
    // No commondir: the gitdir is the git dir.
  }
  return gitdir;
}

async function readConfig(path: string, fs: GitConfigFs): Promise<GitConfigResult> {
  try {
    return { ok: true, config: await fs.readFile(path) };
  } catch {
    return { ok: false, error: `Could not read ${path}.` };
  }
}
