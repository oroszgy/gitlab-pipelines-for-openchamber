/**
 * Panel CSS. Composed from the host's `--oc-*` tokens only — no literal
 * colours — so it reads correctly in both OpenChamber themes.
 *
 * Sizes follow OpenChamber's own type scale rather than the browser default:
 * 14px primary, 13px prose, 12px dense chrome and mono. `applyHostTheme` pins
 * the guest root at 0.875rem, which would make every `rem` render at 87.5% of
 * those values, so the root is restored to 16px here first.
 *
 * The Pipeline row cannot be expressed by the UI kit's `mountList` row at
 * 320px, so it is composed here from kit primitives and these tokens. Keep the
 * `.gp-row*` markup and these rules together.
 */
export const PANEL_CSS = `
html, body { margin: 0; height: 100%; color-scheme: light dark; }
/* The host writes 0.875rem onto the iframe root inline; !important beats it so
   rem units equal the pixel tiers OpenChamber's own UI uses. */
html { font-size: 16px !important; }
*, *::before, *::after { box-sizing: border-box; }

.gp {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--oc-fg, CanvasText);
  background: var(--oc-bg, Canvas);
  font-family: var(--oc-font, system-ui, sans-serif);
  font-size: 0.875rem;
  line-height: 1.45;
}
.gp button { font: inherit; color: inherit; }

.gp-progress {
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  overflow: hidden;
  background: transparent;
  z-index: 5;
}
.gp-progress[hidden] { display: none; }
.gp-progress::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0; left: -40%;
  width: 40%;
  background: var(--oc-primary, #5b8def);
  animation: gp-slide 1.1s ease-in-out infinite;
}
@keyframes gp-slide { from { left: -40%; } to { left: 100%; } }

.gp-head {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
}
.gp-head-row { display: flex; align-items: center; gap: 8px; }
.gp-spacer { flex: 1 1 auto; }

.gp-updated { display: inline-flex; align-items: center; gap: 5px; color: var(--oc-muted, GrayText); font-size: 0.75rem; white-space: nowrap; }
.gp-updated[hidden] { display: none; }
.gp-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--oc-info, #3a7bbf); }
.gp-dot[data-idle='true'] { background: var(--oc-muted, GrayText); animation: none; }
.gp-dot[data-idle='false'] { animation: gp-pulse 1.4s ease-in-out infinite; }
@keyframes gp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

.gp-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  color: var(--oc-muted, GrayText);
  cursor: pointer;
}
.gp-iconbtn:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); color: var(--oc-fg, CanvasText); }
.gp-iconbtn[data-spinning='true'] svg { animation: gp-spin 0.9s linear infinite; }

.gp-project { display: flex; min-width: 0; }
.gp-project-path {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gp-project-path[hidden] { display: none; }
.gp-head-user {
  flex: 0 0 auto;
  color: var(--oc-muted, GrayText);
  font-size: 0.75rem;
  white-space: nowrap;
}
.gp-head-user::before { content: '·'; margin: 0 6px; }

.gp-scope { display: flex; align-items: center; gap: 8px; }
.gp-scope[hidden] { display: none; }
.gp-scope-ref {
  min-width: 0;
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gp-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.gp-pad { padding: 8px 8px 12px; }

.gp-list { display: flex; flex-direction: column; gap: 2px; }

.gp-item {
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 9px);
}
.gp-item[data-open='true'] { border-color: var(--oc-border, rgba(127, 127, 127, 0.35)); background: var(--oc-subtle, transparent); }

.gp-row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.gp-row:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }

.gp-caret { display: inline-flex; color: var(--oc-muted, GrayText); transition: transform 0.12s ease; }
.gp-item[data-open='true'] .gp-caret { transform: rotate(90deg); }

.gp-row-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1 1 auto; }
.gp-row-line { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.gp-ref {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.gp-sha {
  flex: 0 0 auto;
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.75rem;
}
.gp-row-meta { flex: 0 0 auto; color: var(--oc-muted, GrayText); font-size: 0.75rem; white-space: nowrap; }
.gp-row-sub {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--oc-muted, GrayText);
  font-size: 0.75rem;
}

.gp-icon { display: inline-flex; flex: 0 0 auto; color: var(--oc-muted, GrayText); }
.gp-icon[data-tone='success'] { color: var(--oc-success-text, #2e9e4f); }
.gp-icon[data-tone='error'] { color: var(--oc-error-text, #c04040); }
.gp-icon[data-tone='warning'] { color: var(--oc-warning-text, #b8860b); }
.gp-icon[data-tone='info'] { color: var(--oc-info-text, #3a7bbf); }
.gp-icon[data-tone='primary'] { color: var(--oc-primary-text, #9db8f5); }
.gp-icon[data-muted='true'] { opacity: 0.55; }
.gp-icon[data-animate='true'] .gp-icon-svg { animation: gp-spin 0.9s linear infinite; }
.gp-icon-svg { display: inline-flex; }
@keyframes gp-spin { to { transform: rotate(360deg); } }

.gp-jobs { display: flex; flex-direction: column; gap: 6px; padding: 2px 8px 8px 22px; }
.gp-jobs-body { display: flex; flex-direction: column; gap: 6px; }
.gp-jobs-link { align-self: flex-start; color: var(--oc-primary-text, #9db8f5); text-decoration: none; font-size: 0.75rem; }
.gp-jobs-link:hover { text-decoration: underline; }

.gp-downstream-badge {
  flex: 0 0 auto;
  color: var(--oc-muted, GrayText);
  font-size: 0.75rem;
  white-space: nowrap;
}

.gp-trigger-wrap { display: flex; flex-direction: column; gap: 2px; }
.gp-trigger .gp-job-name { font-style: italic; }
.gp-downstream-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0 6px 4px 20px;
  padding: 6px 8px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-left: 2px solid var(--oc-primary, #5b8def);
  border-radius: var(--oc-radius, 9px);
  background: var(--oc-muted-surface, var(--oc-subtle, transparent));
}
.gp-downstream-label { font-weight: 500; font-size: 0.75rem; }
.gp-downstream-meta { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.gp-downstream-iid { flex: 0 0 auto; color: var(--oc-muted, GrayText); font-size: 0.75rem; }
.gp-downstream-open {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  color: var(--oc-primary-text, #9db8f5);
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
}
.gp-downstream-open:hover:not([disabled]) { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-downstream-open[disabled] { color: var(--oc-muted, GrayText); opacity: 0.6; cursor: default; }
.gp-stage { display: flex; flex-direction: column; gap: 1px; }
.gp-stage-head { display: flex; align-items: center; gap: 6px; color: var(--oc-muted, GrayText); font-size: 0.75rem; }
.gp-stage-name { flex: 0 0 auto; }
.gp-stage-count { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.gp-stage-line { flex: 1 1 auto; height: 1px; background: var(--oc-border, rgba(127, 127, 127, 0.35)); }

.gp-job {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 6px;
  border: 0;
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.gp-job:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-job[data-selected='true'] { background: var(--oc-selection, rgba(91, 141, 239, 0.25)); color: var(--oc-selection-fg, var(--oc-fg, CanvasText)); }
.gp-job-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.gp-job-meta { flex: 0 0 auto; color: var(--oc-muted, GrayText); font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.gp-handoff {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  color: var(--oc-primary-text, #9db8f5);
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
}
.gp-handoff:hover:not([disabled]) { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-handoff[disabled] { color: var(--oc-muted, GrayText); opacity: 0.6; cursor: default; }
.gp-handoff svg { flex: 0 0 auto; }

.gp-actions { display: inline-flex; align-items: center; flex: 0 0 auto; }
.gp-run { display: inline-flex; flex: 0 0 auto; }

.gp-notice {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  background: var(--oc-muted-surface, var(--oc-subtle, transparent));
  color: var(--oc-error-text, #c04040);
  font-size: 0.8125rem;
}
.gp-notice-text { flex: 1 1 auto; }
.gp-notice[data-tone='success'] { color: var(--oc-success-text, #2e9e4f); }
.gp-notice[data-tone='info'] { color: var(--oc-info-text, #86b8e0); }
.gp-notice-close {
  flex: 0 0 auto;
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  color: var(--oc-muted, GrayText);
  font-size: 0.75rem;
  cursor: pointer;
}
.gp-notice-close:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); color: var(--oc-fg, CanvasText); }

.gp-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 14px; text-align: center; }
.gp-state-title { margin: 0; font-size: 0.875rem; font-weight: 600; }
.gp-state-body { margin: 0; color: var(--oc-muted, GrayText); font-size: 0.8125rem; max-width: 34ch; }
.gp-state-hint { margin: 0; color: var(--oc-muted, GrayText); font-size: 0.75rem; max-width: 34ch; }
.gp-state-detail { margin: 0; font-family: var(--oc-mono, ui-monospace, monospace); font-size: 0.75rem; color: var(--oc-muted, GrayText); word-break: break-all; }
.gp-state-actions { display: flex; gap: 6px; margin-top: 2px; }
/* The kit's empty state is the other half of the same screen; keep its title on
   the 14px scale the hand-rolled states use. */
.gp .oc-sdk-empty-title { font-size: 0.875rem; }

.gp-drawer {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  max-height: 62%;
  border-top: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  background: var(--oc-elevated, var(--oc-bg, Canvas));
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.18);
}
.gp-drawer-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); }
.gp-drawer-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 0.8125rem; }
.gp-drawer-link { color: var(--oc-primary-text, #9db8f5); text-decoration: none; font-size: 0.75rem; white-space: nowrap; }
.gp-drawer-link:hover { text-decoration: underline; }
.gp-drawer-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0;
  border: 1px solid transparent; border-radius: var(--oc-radius, 9px);
  background: transparent; color: var(--oc-muted, GrayText); cursor: pointer;
}
.gp-drawer-close:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); color: var(--oc-fg, CanvasText); }
.gp-drawer-body {
  margin: 0;
  padding: 8px 10px 12px;
  overflow-y: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--oc-fg, CanvasText);
}
.gp-drawer-empty { padding: 14px 10px; color: var(--oc-muted, GrayText); font-size: 0.75rem; text-align: center; }
.gp-drawer-notice { flex: 0 0 auto; padding: 6px 10px; border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); color: var(--oc-warning-text, #e0b567); font-size: 0.75rem; }

.gp-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-top: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); color: var(--oc-muted, GrayText); font-size: 0.75rem; }

.gp-config {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  background: var(--oc-muted-surface, var(--oc-hover, rgba(127, 127, 127, 0.08)));
}
.gp-config-field { display: flex; flex-direction: column; gap: 3px; }
.gp-config-label { color: var(--oc-muted, GrayText); font-size: 0.75rem; }
.gp-config input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 9px);
  background: var(--oc-bg, Canvas);
  color: var(--oc-fg, CanvasText);
  font: inherit;
  font-size: 0.8125rem;
}
.gp-config input:focus { outline: 2px solid var(--oc-focus, #5b8def); outline-offset: -1px; }
.gp-config-error { margin: 0; color: var(--oc-error-text, #e08a8a); font-size: 0.75rem; }
.gp-config-actions { display: flex; align-items: center; gap: 8px; }
.gp-config-actions button {
  padding: 5px 10px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 9px);
  background: var(--oc-bg, Canvas);
  color: var(--oc-fg, CanvasText);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}
.gp-config-actions button:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-config-actions button:disabled { opacity: 0.6; cursor: default; }
.gp-config-save { background: var(--oc-primary, #5b8def); color: var(--oc-primary-fg, #ffffff); border-color: transparent; }
.gp-config-clear { margin-left: auto; color: var(--oc-error-text, #e08a8a); }

.gp-skel { display: flex; flex-direction: column; gap: 8px; padding: 4px 2px; }
.gp-skel-row { display: flex; gap: 8px; }
.gp-skel-line { height: 10px; border-radius: 4px; background: var(--oc-subtle, var(--oc-hover, rgba(127, 127, 127, 0.15))); opacity: 0.6; }
.gp-skel-line[data-w='short'] { flex: 0 0 28%; }
.gp-skel-line[data-w='grow'] { flex: 1 1 auto; }
`;
