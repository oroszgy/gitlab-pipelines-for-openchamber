/** Shapes the panel reads from GitLab's REST API (the subset it actually uses). */

export type Pipeline = {
  id: number;
  iid: number;
  status: string;
  source: string;
  ref: string;
  sha: string;
  web_url: string;
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  name?: string | null;
  tag?: boolean;
  merge_request?: { iid: number } | null;
};

export type Job = {
  id: number;
  name: string;
  stage: string;
  status: string;
  allow_failure: boolean;
  duration: number | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  web_url: string;
  ref?: string;
  tag?: boolean;
};

/** Whether the list is scoped to the current Ref or the whole project. */
export type Scope = 'branch' | 'all';
