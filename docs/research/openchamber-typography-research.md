# OpenChamber typography: research for native panel styling

Status: research notes, written 2026-10-01. Every factual claim has an inline source.
Local artifacts (the installed AppImage's web assets, the shipped SDK) are cited by path; the public
documentation and SDK equivalents are cited where they exist.

---

## TL;DR

- **There is no separate typography guide for extensions.** The two references that define how a panel
  should look are the `@openchamber/sdk/ui` kit — "ready-made controls that use the app's colours,
  fonts, and spacing, so your extension looks like the rest of OpenChamber"
  ([UI kit](https://docs.openchamber.dev/sdk/ui/)) — and the app's own CSS custom properties, which the
  kit mirrors.
- **The app's UI type scale is 14 / 13.5 / 13 / 12px** (body, label, meta, code), with no reading text
  below 12px. A search of the app's own stylesheet found `text-transform: uppercase` only as a utility
  class, so uppercase is not a host convention for section labels.
- **The kit is authored for a 16px root** (its default button is 14px, `sm` 13px, `xs` 12px, list-row
  title 14px, sub/meta 12px), but the host pins the guest iframe root at `0.875rem`. Inside an iframe
  `1rem` is therefore 14px, and **every `rem` renders at 87.5% of what the SDK authored** — the kit's
  own controls included.
- **This extension authored its sizes in `rem`**, so its text was the worst affected: the base rendered
  at ~11.4px and the fine print at ~9.6px. The panel now restores the root to 16px and uses the app's
  14 / 13 / 12px tiers.

---

## 1. The host's type scale

Source: the installed app's stylesheet,
`/tmp/.mount_openchUPJI5m/resources/web-dist/assets/index-*.css` (OpenChamber desktop 2.0.3). The
`:root` block defines named size tokens and a Tailwind scale:

| Custom property | Value | px | Used for |
| --- | --- | --- | --- |
| `--text-settings-page-title` | `1.0625rem` | 17 | settings page title |
| `--text-markdown` | `0.875rem` | 14 | body text |
| `--text-ui-header` | `0.875rem` | 14 | headers |
| `--text-ui-label` | `0.84375rem` | 13.5 | labels, buttons |
| `--text-meta` | `0.8125rem` | 13 | secondary text |
| `--text-micro` | `0.8125rem` | 13 | captions |
| `--text-code` | `0.75rem` | 12 | code/monospace |
| `--text-xs` / `--text-sm` / `--text-base` | `0.75rem` / `0.875rem` / `1rem` | 12 / 14 / 16 | Tailwind utilities |

`body` uses `font-size: var(--text-markdown)`. The typography helper classes (`typography-ui-header`,
`typography-meta`, `typography-micro`, …) all set `line-height: round(1.45em, 1px)`, and the base
`--radius` is `0.5625rem` (9px).

Weights in the app: `400` for body and field labels, `500` for group titles and buttons, `600` for page
and settings titles. The SDK's list row (`@openchamber/sdk/ui`, `data-size` sizes below) has no title
weight at all — it inherits `400`.

Uppercase is not a default: the only `text-transform: uppercase` rules in the app stylesheet are the
Tailwind `.uppercase` utility and a markdown heading rule, not a section-label convention.

## 2. The SDK UI kit's authored scale

Source: `node_modules/@openchamber/sdk/dist/ui/style.js` (shipped `@openchamber/sdk@2.0.3`). The kit's
values match the app tokens above:

| Kit element | CSS value | Intended px |
| --- | --- | --- |
| `.oc-sdk` root | `0.875rem` | 14 |
| `.oc-sdk-btn` (default / `sm` / `xs`) | `0.875rem` / `0.8125rem` / `0.75rem` | 14 / 13 / 12 |
| `.oc-sdk-row-title` (inherits root) | — | 14 |
| `.oc-sdk-row-sub`, `.oc-sdk-row-meta`, `.oc-sdk-row-lead` | `0.75rem` | 12 |
| `.oc-sdk-tab` / `.oc-sdk-field-label` | `0.8125rem` | 13 |
| `.oc-sdk-empty-title`, `.oc-sdk-empty-body`, `.oc-sdk-banner-*` | `0.8125rem` | 13 |
| `.oc-sdk-badge` | `11px` | 11 |
| `.oc-sdk` root `line-height` | `1.45` | — |

The 14 / 13 / 12 pattern only produces those pixel sizes if `1rem` is 16px.

## 3. The root-size trap

`applyHostReady(ctx, document.documentElement)` runs in the panel's `onReady` and calls
`applyHostTheme`, which sets `root.style.fontSize = '0.875rem'`
(`node_modules/@openchamber/sdk/dist/ui/theme.js`). An `html` font-size of `0.875rem` resolves against
the initial 16px, so the iframe root computes to **14px and every `rem` descendant is 14px**, not 16px.

Measured in headless Chrome with the real kit stylesheet and the same root override:

| Element | Authored | Rendered in the iframe |
| --- | --- | --- |
| kit root / `.oc-sdk-btn` | `0.875rem` | **12.25px** |
| `.oc-sdk-btn` `sm` / `.oc-sdk-tab` | `0.8125rem` | **11.375px** |
| `.oc-sdk-row-sub` / `row-meta` | `0.75rem` | **10.5px** |
| this panel's base (before the fix) | `0.8125rem` | **11.375px** |
| this panel's fine print (before the fix) | `0.6875rem` | **9.625px** |

So the whole guest surface — the panel's own CSS *and* the mounted kit controls — rendered 12.5% smaller
than the app it sits beside. `applyHostTheme` also hardcodes the root size, and the host's user
font-size / padding settings are applied to the app document (`document.documentElement.style.fontSize =
"<n>%"`, `--padding-scale`) and never reach the iframe, so a panel cannot follow them through the current
contract (`GuestSettings` is an extension's own declared settings, per
`node_modules/@openchamber/sdk/dist/contract.d.ts`).

## 4. What this extension does

`panel/styles.ts` restores the root to 16px (`html { font-size: 16px !important }`, which beats the
host's inline value) and then expresses its own scale in the app's tiers:

- **14px** — panel base, brand, pipeline Ref (row title), job name, state title;
- **13px** — prose: state body, notices, drawer title and body, empty text;
- **12px** — dense chrome and monospace: SHA, project path, scope Ref, row sub/meta, freshness, stage
  head, job meta, jobs link, downstream label/iid/button/badge, handoff, footer, drawer link/notice,
  state hint/detail, and the Trace log.

The root rule is deliberately the one place the panel overrides a host-written value: it is what makes
the panel and the kit controls it mounts agree with the app. It is a single line to revert if a future
SDK stops pinning the root.

## 5. Sources

- UI kit documentation: <https://docs.openchamber.dev/sdk/ui/>
- SDK UI kit stylesheet: `node_modules/@openchamber/sdk/dist/ui/style.js` (`@openchamber/sdk@2.0.3`)
- SDK theme application: `node_modules/@openchamber/sdk/dist/ui/theme.js`
- SDK contract: `node_modules/@openchamber/sdk/dist/contract.d.ts`
- Installed app stylesheet: `/tmp/.mount_openchUPJI5m/resources/web-dist/assets/index-*.css`
  (OpenChamber desktop 2.0.3)
- Host guest-HTML injection (no root font-size set): `resources/app.asar →
  node_modules/@openchamber/web/server/lib/guests/html-styles.js`
