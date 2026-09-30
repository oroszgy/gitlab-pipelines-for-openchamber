import type { GuestWorktree } from '@openchamber/sdk';

/** A parsed git remote: the host (with port when the URL form has one) and the project path. */
export type Remote = {
  host: string;
  path: string;
};

export type ProjectFailureKind = 'no-project' | 'not-a-repo' | 'host-mismatch';

export type ProjectResolution =
  | {
      ok: true;
      /** The configured host, e.g. `gitlab.com`. */
      host: string;
      /** The GitLab project path, e.g. `group/subgroup/project`. */
      project: string;
      /** The current Ref, or null when it cannot be determined. */
      ref: string | null;
      source: 'derived' | 'override';
    }
  | {
      ok: false;
      failure: ProjectFailureKind;
      detectedHost?: string;
      detectedPath?: string;
    };

export type ResolveInput = {
  /** The open project's directory, or null when nothing is open. */
  directory: string | null;
  /** The one origin the manifest bakes in, e.g. `https://gitlab.com`. */
  apiOrigin: string;
  /** The `project` integration setting, if the user set one. */
  projectOverride?: string;
  /** Contents of `.git/config`, or null when it could not be read. */
  gitConfig?: string | null;
  /** Contents of `.git/HEAD`, or null when it could not be read. */
  head?: string | null;
  /** The host's worktree list for the project, or null when unavailable. */
  worktrees?: readonly GuestWorktree[] | null;
};

/** Host (with port) of an origin URL. */
export function hostOfOrigin(apiOrigin: string): string {
  try {
    return new URL(apiOrigin).host;
  } catch {
    return apiOrigin.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

/**
 * Parse a git remote URL into host + project path. Handles the scp-like form
 * (`git@host:group/proj.git`), the URL forms (`ssh://`, `https://`, `git://`,
 * including userinfo and ports), subgroups and a single trailing `.git`.
 * Returns null when the URL has no host or no path.
 */
export function parseRemoteUrl(remote: string): Remote | null {
  const raw = remote.trim();
  if (!raw) return null;

  let host = '';
  let rawPath = '';

  if (raw.includes('://')) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    host = url.host;
    rawPath = url.pathname;
  } else {
    const colon = raw.indexOf(':');
    if (colon < 0) return null;
    const authority = raw.slice(0, colon).replace(/^[^@]*@/, '');
    host = authority;
    rawPath = raw.slice(colon + 1);
    // `host:/group/proj.git` — a leading slash is allowed in the scp-like path.
    rawPath = rawPath.replace(/^\/+/, '');
  }

  const path = cleanProjectPath(rawPath);
  if (!host || !path) return null;
  return { host, path };
}

/** Strip a trailing slash and at most one trailing `.git`; keep every segment. */
export function cleanProjectPath(path: string): string {
  let cleaned = path.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (cleaned.toLowerCase().endsWith('.git')) cleaned = cleaned.slice(0, -4);
  return cleaned.replace(/\/+$/, '');
}

type RemoteEntry = { name: string; url: string };

/** All `[remote "…"]` sections' `url`s, in file order. */
export function parseRemotes(gitConfig: string): RemoteEntry[] {
  const remotes: RemoteEntry[] = [];
  let current: string | null = null;
  for (const line of gitConfig.split(/\r?\n/)) {
    const section = /^\s*\[remote\s+"([^"]+)"\]\s*$/.exec(line);
    if (section) {
      current = section[1] ?? null;
      continue;
    }
    if (/^\s*\[/.test(line)) {
      current = null;
      continue;
    }
    if (current == null) continue;
    const url = /^\s*url\s*=\s*(.+?)\s*$/.exec(line);
    if (url && url[1]) remotes.push({ name: current, url: url[1] });
  }
  return remotes;
}

/**
 * Pick the remote to use: `origin`, then `upstream`, then the first declared.
 * Returns the parsed remote plus the position (first or not), so callers can
 * fall through to the next URL when one does not parse.
 */
export function pickRemote(gitConfig: string): { remote: Remote; name: string } | null {
  const remotes = parseRemotes(gitConfig);
  const preferred = ['origin', 'upstream'];
  const ordered = [
    ...preferred.flatMap((name) => remotes.filter((r) => r.name === name)),
    ...remotes.filter((r) => !preferred.includes(r.name)),
  ];
  for (const entry of ordered) {
    const remote = parseRemoteUrl(entry.url);
    if (remote) return { remote, name: entry.name };
  }
  return null;
}

/** `ref: refs/heads/main` → `main`. A detached HEAD (raw SHA) returns null. */
export function parseHeadRef(head: string | null | undefined): string | null {
  if (!head) return null;
  const match = /^\s*ref:\s*refs\/(?:heads|tags)\/(.+?)\s*$/.exec(head);
  return match?.[1] ?? null;
}

export function samePath(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.replace(/\/+$/, '') === b.replace(/\/+$/, '');
}

/** The current Ref: the worktree list first, HEAD only as a fallback. */
export function deriveRef(
  directory: string | null,
  head: string | null | undefined,
  worktrees: readonly GuestWorktree[] | null | undefined,
): string | null {
  if (directory && worktrees) {
    const match = worktrees.find((worktree) => samePath(worktree.directory, directory));
    if (match?.branch) return match.branch;
  }
  return parseHeadRef(head);
}

/**
 * Resolve the GitLab project and current Ref from the open project, or a typed
 * failure. Pure: every file and worktree read is passed in.
 *
 * A `project` setting short-circuits Git entirely, which is the escape hatch
 * for `no-project`, `not-a-repo` and `host-mismatch`.
 */
export function resolveProject(input: ResolveInput): ProjectResolution {
  const host = hostOfOrigin(input.apiOrigin);
  const override = input.projectOverride?.trim() ?? '';

  if (!input.directory && !override) {
    return { ok: false, failure: 'no-project' };
  }

  if (override) {
    const project = cleanProjectPath(override);
    if (!project) return { ok: false, failure: 'no-project' };
    return {
      ok: true,
      host,
      project,
      ref: deriveRef(input.directory, input.head, input.worktrees),
      source: 'override',
    };
  }

  const picked = input.gitConfig ? pickRemote(input.gitConfig) : null;
  if (!picked) {
    return { ok: false, failure: 'not-a-repo' };
  }

  if (picked.remote.host !== host) {
    return {
      ok: false,
      failure: 'host-mismatch',
      detectedHost: picked.remote.host,
      detectedPath: picked.remote.path,
    };
  }

  return {
    ok: true,
    host,
    project: picked.remote.path,
    ref: deriveRef(input.directory, input.head, input.worktrees),
    source: 'derived',
  };
}
