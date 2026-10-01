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

/**
 * A Pipeline started by a Trigger job. `web_url` is what identifies its project:
 * the payload carries a numeric `project_id`, not a path.
 */
export type DownstreamPipeline = {
  id: number;
  iid: number;
  project_id: number;
  status: string;
  source: string;
  ref: string;
  sha: string;
  web_url: string;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * A Trigger job: it starts a Downstream pipeline rather than running commands, so
 * it has no runner, duration or Trace, and is deliberately not a `Job`.
 */
export type Bridge = {
  id: number;
  name: string;
  stage: string;
  status: string;
  web_url: string;
  downstream_pipeline: DownstreamPipeline | null;
};

/** Whether the list is scoped to the current Ref or the whole project. */
export type Scope = 'branch' | 'all';
