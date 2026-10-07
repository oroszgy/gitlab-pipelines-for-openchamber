/**
 * The Work Status section: a compact line showing the Watched Ref, its latest
 * Status and the Unseen count, with a watch toggle. Clicking the line opens the
 * rail panel instead of the section expanding.
 *
 * It runs only while Work Status is shown and this section is expanded, so it
 * keeps no state it cannot rebuild: every mount re-reads the watch and the event
 * log from the service. It deliberately does **not** clear the badge or advance
 * the seen watermark — those belong to the rail panel (notifications/04/06). See
 * the notifications spec, "Surfaces", and ADR-0011.
 */

import type { HostReadyContext } from '@openchamber/sdk';
import { PANEL_ID, SERVICE_CONFIG_PATH } from './config';
import type { HostPort, HostResponse } from './host-port';
import {
  parseConfigEnvelope,
  getEvents,
  getWatch,
  putWatch,
  type ServiceConfig,
  type ServiceSender,
  type TerminalEvent,
  type TerminalEventView,
  type WatchedRef,
} from './service-config';
import { statusInfo } from './status';
import { resolveProject, samePath, type ResolveInput } from './project-resolver';

/** The Status frame's own styling; the section ships as its own bundle. */
export const STATUS_SECTION_CSS = `
.gps { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; font: inherit; cursor: pointer; }
.gps-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.gps-ref { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gps-status { border-radius: 999px; padding: 1px 8px; font-size: 0.85em; white-space: nowrap; }
.gps-status-neutral { background: color-mix(in srgb, currentColor 12%, transparent); }
.gps-status-success { color: var(--oc-success, #2e9e4f); background: color-mix(in srgb, currentColor 15%, transparent); }
.gps-status-error { color: var(--oc-error, #c04040); background: color-mix(in srgb, currentColor 15%, transparent); }
.gps-unseen { opacity: 0.7; font-size: 0.85em; white-space: nowrap; }
.gps-spacer { flex: 1 1 auto; }
.gps-toggle { font: inherit; font-size: 0.85em; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; padding: 2px 8px; cursor: pointer; white-space: nowrap; }
.gps-toggle[disabled] { opacity: 0.5; cursor: default; }
.gps-hint { opacity: 0.7; font-size: 0.85em; }
`;

export type StatusSectionHandle = { dispose(): void };

function span(className: string, text: string): HTMLSpanElement {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = text;
  return node;
}

/** Mount the section into `root`, reading everything back from the service on ready. */
export function mountStatusSection(root: HTMLElement, port: HostPort): StatusSectionHandle {
  let disposed = false;
  let directory: string | null = null;
  let config: ServiceConfig | null = null;
  let context: { project: string; ref: string | null } | null = null;
  let watch: WatchedRef | null = null;
  let view: TerminalEventView | null = null;
  let busy = false;
  let problem: string | null = null;

  const sender: ServiceSender = (input) => port.serviceRequest(input);

  root.className = 'gps';
  root.setAttribute('role', 'button');
  root.setAttribute('tabindex', '0');
  root.setAttribute('title', 'Open GitLab Pipelines');

  const openPanel = (): void => {
    void port.openSurface(PANEL_ID).catch(() => {
      // Opening the panel is best-effort; a host that refuses it is not a failure.
    });
  };
  root.addEventListener('click', openPanel);
  root.addEventListener('keydown', (event) => {
    if (event.target !== root) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPanel();
    }
  });

  /** The event whose Status the section shows: the latest for the watched Ref. */
  function latestEvent(): TerminalEvent | null {
    if (!view || !config || !context) return null;
    const ref = watch?.ref ?? context.ref;
    let latest: TerminalEvent | null = null;
    for (const event of view.events) {
      if (event.host !== config.host || event.project !== context.project) continue;
      if (ref != null && event.ref !== ref) continue;
      latest = event; // The log is chronological, so the last match is the newest.
    }
    return latest;
  }

  function render(): void {
    if (disposed) return;
    root.replaceChildren();
    if (problem) {
      root.append(span('gps-hint', problem));
      return;
    }
    if (!context) {
      root.append(span('gps-hint', 'Loading…'));
      return;
    }
    const ref = watch?.ref ?? context.ref ?? '—';
    const latest = latestEvent();
    const status = latest ? statusInfo(latest.status) : null;

    const row = document.createElement('div');
    row.className = 'gps-row';
    row.append(span('gps-ref', ref));
    if (status) row.append(span(`gps-status gps-status-${status.tone}`, status.label));
    else row.append(span('gps-status gps-status-neutral', 'No runs yet'));
    row.append(span('gps-unseen', `${view?.unseen ?? 0} unseen`));
    row.append(span('gps-spacer', ''));

    const watching = watch != null && watch.ref === context.ref;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gps-toggle';
    button.textContent = watching ? 'Watching' : 'Watch';
    button.setAttribute('aria-pressed', watching ? 'true' : 'false');
    button.disabled = busy || context.ref == null;
    button.addEventListener('click', (event) => {
      // The whole section opens the panel; the toggle is not that click.
      event.stopPropagation();
      void toggle();
    });
    row.append(button);

    root.append(row);
  }

  /** Set or clear the watch: on clears it, off sets it to the current Ref. */
  async function toggle(): Promise<void> {
    if (busy || !config || !context) return;
    const ref = context.ref;
    if (!ref) return;
    const watching = watch != null && watch.ref === ref;
    busy = true;
    render();
    try {
      const result = await putWatch(sender, config.host, context.project, watching ? null : ref);
      if (!disposed && result) watch = result.watch;
    } finally {
      busy = false;
      if (!disposed) render();
    }
  }

  /** Resolve host+project+ref from the service config and the open project's Git. */
  async function deriveContext(host: string): Promise<{ project: string; ref: string | null } | null> {
    const override = config?.project.trim() ?? '';
    let gitConfig: string | null = null;
    let head: string | null = null;
    let worktrees: ResolveInput['worktrees'] = null;
    if (directory) {
      try {
        gitConfig = (await port.readFile('.git/config')).content;
      } catch {
        gitConfig = null;
      }
      try {
        head = (await port.readFile('.git/HEAD')).content;
      } catch {
        head = null;
      }
      try {
        const projects = await port.listProjects();
        const match = projects.projects.find((project) => samePath(project.directory, directory));
        if (match) worktrees = (await port.listWorktrees(match.id)).worktrees;
      } catch {
        worktrees = null;
      }
    }
    const resolution = resolveProject({
      directory,
      apiOrigin: `https://${host}`,
      projectOverride: override,
      gitConfig,
      head,
      worktrees,
    });
    return resolution.ok ? { project: resolution.project, ref: resolution.ref } : null;
  }

  async function load(ctx: HostReadyContext): Promise<void> {
    if (ctx.surface !== 'status') return;
    directory = ctx.directory;
    let response: HostResponse;
    try {
      response = await port.serviceRequest({ method: 'GET', path: SERVICE_CONFIG_PATH });
    } catch {
      problem = 'The Proxy service is not available.';
      render();
      return;
    }
    const parsed =
      response.status >= 200 && response.status < 300 ? parseConfigEnvelope(response.body) : null;
    if (disposed) return;
    if (!parsed) {
      problem = 'The Proxy service is not available.';
      render();
      return;
    }
    config = parsed;
    const derived = await deriveContext(parsed.host);
    if (disposed) return;
    if (!derived) {
      problem = 'Open a GitLab project to watch its Pipeline.';
      render();
      return;
    }
    context = derived;
    const watchResult = await getWatch(sender, parsed.host, derived.project);
    if (disposed) return;
    watch = watchResult?.watch ?? null;
    view = await getEvents(sender, 0);
    if (disposed) return;
    render();
  }

  const unsubscribe = port.onReady((ctx) => {
    void load(ctx);
  });
  render();

  return {
    dispose() {
      disposed = true;
      unsubscribe();
    },
  };
}
