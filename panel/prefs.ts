import type { JsonValue } from '@openchamber/sdk';
import type { Scope } from './types';

/**
 * The remembered view of one host+project+ref, kept in the extension's own
 * persistent JSON store. Every field is optional: a record holds only what has
 * been set, so one writer never clobbers another's field.
 */
export type Prefs = {
  scope?: Scope;
  pipelineId?: number;
  downstream?: PrefDownstreamNode[];
  jobId?: number;
  /** When the record was last written, so writes can be LRU-pruned. */
  savedAt?: number;
};

/** One node of the remembered Downstream chain: what to reopen, and its path. */
export type PrefDownstreamNode = {
  project: string;
  pipelineId: number;
  generation: number;
  ancestors: Array<{ project: string; pipelineId: number }>;
};

/**
 * The persistent store the host exposes, as `panel/host-port.ts` wraps it.
 * Declared structurally so the pure module is tested without a host.
 */
export type PrefStore = {
  get(key: string): Promise<JsonValue | undefined>;
  set(key: string, value: JsonValue): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
};

/** The key prefix; the version is bumped when the record shape changes. */
export const PREF_KEY_PREFIX = 'gp:v1';

/**
 * How many records to keep before the oldest are pruned. Kept small so the
 * host's 2 000-key / 2 MiB budget is never approached.
 */
export const PREF_MAX_RECORDS = 100;

/** The storage key for one host, project path and Ref. */
export function prefKey(host: string, project: string, ref: string): string {
  return `${PREF_KEY_PREFIX}:${host}:${project}:${ref}`;
}

/** Accept a stored value only when it is the record shape we wrote; else no record. */
export function parsePrefs(value: JsonValue | undefined): Prefs {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, JsonValue>;
  const prefs: Prefs = {};
  if (record.scope === 'branch' || record.scope === 'all') prefs.scope = record.scope;
  if (typeof record.pipelineId === 'number') prefs.pipelineId = record.pipelineId;
  const downstream = parseDownstream(record.downstream);
  if (downstream) prefs.downstream = downstream;
  if (typeof record.jobId === 'number') prefs.jobId = record.jobId;
  if (typeof record.savedAt === 'number') prefs.savedAt = record.savedAt;
  return prefs;
}

function parsePipelineKey(value: JsonValue | undefined): { project: string; pipelineId: number } | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  const key = value as Record<string, JsonValue>;
  if (typeof key.project !== 'string' || typeof key.pipelineId !== 'number') return null;
  return { project: key.project, pipelineId: key.pipelineId };
}

/** Accept a stored Downstream chain only when every node is the shape we wrote. */
export function parseDownstream(value: JsonValue | undefined): PrefDownstreamNode[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const nodes: PrefDownstreamNode[] = [];
  for (const entry of value) {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) return undefined;
    const node = entry as Record<string, JsonValue>;
    if (
      typeof node.project !== 'string' ||
      typeof node.pipelineId !== 'number' ||
      typeof node.generation !== 'number' ||
      !Array.isArray(node.ancestors)
    ) {
      return undefined;
    }
    const ancestors: Array<{ project: string; pipelineId: number }> = [];
    for (const ancestor of node.ancestors) {
      const key = parsePipelineKey(ancestor);
      if (!key) return undefined;
      ancestors.push(key);
    }
    nodes.push({ project: node.project, pipelineId: node.pipelineId, generation: node.generation, ancestors });
  }
  return nodes;
}

/** The stored form of a Downstream chain: plain JSON objects, no host types. */
export function serializeDownstream(nodes: readonly PrefDownstreamNode[]): JsonValue {
  return nodes.map(
    (node): JsonValue => ({
      project: node.project,
      pipelineId: node.pipelineId,
      generation: node.generation,
      ancestors: node.ancestors.map((key): JsonValue => ({ project: key.project, pipelineId: key.pipelineId })),
    }),
  );
}

function serializePrefs(prefs: Prefs): JsonValue {
  const record: Record<string, JsonValue> = {};
  if (prefs.scope != null) record.scope = prefs.scope;
  if (prefs.pipelineId != null) record.pipelineId = prefs.pipelineId;
  if (prefs.downstream != null) record.downstream = serializeDownstream(prefs.downstream);
  if (prefs.jobId != null) record.jobId = prefs.jobId;
  if (prefs.savedAt != null) record.savedAt = prefs.savedAt;
  return record;
}

/** The record at `key`, or an empty record when none is stored or the store fails. */
export async function readPrefs(store: PrefStore, key: string): Promise<Prefs> {
  try {
    return parsePrefs(await store.get(key));
  } catch {
    // Storage is best-effort: a failed read yields no remembered state.
    return {};
  }
}

/** Merge `patch` into the record at `key`, stamping it with `now`. Best-effort. */
export async function writePrefs(store: PrefStore, key: string, patch: Prefs, now: number): Promise<void> {
  try {
    const existing = await readPrefs(store, key);
    await store.set(key, serializePrefs({ ...existing, ...patch, savedAt: now }));
  } catch {
    // Storage is best-effort: a failed write is ignored, never blocking a render.
  }
  await prunePrefs(store);
}

/** Delete the least recently written records beyond the cap. Best-effort. */
export async function prunePrefs(store: PrefStore): Promise<void> {
  try {
    const keys = (await store.keys()).filter((key) => key.startsWith(`${PREF_KEY_PREFIX}:`));
    if (keys.length <= PREF_MAX_RECORDS) return;
    const records = await Promise.all(
      keys.map(async (key) => ({ key, savedAt: (await readPrefs(store, key)).savedAt ?? 0 })),
    );
    records.sort((a, b) => a.savedAt - b.savedAt);
    for (const record of records.slice(0, records.length - PREF_MAX_RECORDS)) {
      await store.delete(record.key);
    }
  } catch {
    // Storage is best-effort: pruning never blocks a render.
  }
}
