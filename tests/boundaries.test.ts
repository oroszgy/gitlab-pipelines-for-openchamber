import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';

/**
 * Architecture ratchet for the DOM module.
 *
 * `CODING_STANDARDS.md` says pure logic lives in `panel/*.ts` minus `panel.ts`,
 * and `panel/panel.ts` is the only DOM module. When that rule was written the
 * file already carried a set of pure helpers, so a strict "no pure functions
 * here" check would fail on day one. This ratchet freezes the helpers that
 * exist and forbids *new* module-level functions: new domain logic goes to a
 * pure module, where it can be tested without the DOM.
 *
 * Lower the allowlist whenever you move one; never raise it. A new entry means
 * a pure function has leaked back into the DOM module.
 */

const root = join(import.meta.dir, '..');
const PANEL = join(root, 'panel', 'panel.ts');

/** Module-level function names in `panel.ts` that predate this ratchet. */
const ALLOWED: readonly string[] = [
  // DOM builders: `el`, `clearNode`, `statusIcon` and `truncationNotice` create/clear nodes.
  'el',
  'clearNode',
  'statusIcon',
  'truncationNotice',
  // Presentation helpers that predate the ratchet; candidates to move out later.
  'isAtBottom',
  'traceTruncation',
  'traceStateOf',
  'handoffFailure',
  'pipelineSubtitle',
  'problemFor',
  'noTokenProblem',
  'serviceProblem',
  'movedProblem',
  'redirectedProblem',
  'failureProblem',
  // Key builders and the mount point.
  'pipelineKey',
  'jobKey',
  'mountPanel',
];

function moduleLevelFunctionNames(source: string): string[] {
  const names: string[] = [];
  const pattern = /^(?:export )?function ([A-Za-z_$][\w$]*)/gm;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) names.push(match[1]);
  }
  return names;
}

describe('panel.ts stays a DOM module', () => {
  const source = readFileSync(PANEL, 'utf8');
  const names = moduleLevelFunctionNames(source);

  test('declares no module-level function outside the frozen allowlist', () => {
    const unexpected = names.filter((name) => !ALLOWED.includes(name));
    expect(unexpected).toEqual([]);
  });

  test('the allowlist carries no stale entries', () => {
    const missing = ALLOWED.filter((name) => !names.includes(name));
    // A stale entry is dead allowance: remove it so the ratchet only tightens.
    expect(missing).toEqual([]);
  });
});
