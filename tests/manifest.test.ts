import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { parseManifestJson } from '@openchamber/sdk/schemas';
import { requestedGuestCapabilities } from '@openchamber/sdk';
import { PANEL_ID } from '../panel/config';

const root = join(import.meta.dir, '..');

/**
 * A built bundle, proven present with an actionable message. The bundles are
 * gitignored, so a fresh checkout has none until `bun run build` (which
 * `bun run check` runs) creates them.
 */
function requireBuiltBundle(relativePath: string): void {
  if (existsSync(join(root, relativePath))) return;
  throw new Error(`${relativePath} is missing — run \`bun run build\` (or \`bun run check\`) first.`);
}

const raw = readFileSync(join(root, 'package.json'), 'utf8');
const parsed = parseManifestJson(raw);

describe('package manifest', () => {
  test('parses as an OpenChamber manifest', () => {
    if (!parsed.ok) throw new Error(`manifest did not parse: ${parsed.code} ${parsed.message}`);
    expect(parsed.manifest.apiVersion).toBe(1);
  });

  test('declares the GitLab Pipelines panel', () => {
    if (!parsed.ok) throw new Error('manifest did not parse');
    const panel = parsed.manifest.contributes.panel;
    expect(panel.id).toBe(PANEL_ID);
    expect(panel.name).toBe('GitLab Pipelines');
    expect(panel.icon).toBe('icon.svg');
    expect(panel.entry).toBe('panel/index.html');
  });

  test('ships the panel icon as a package SVG', () => {
    expect(existsSync(join(root, 'icon.svg'))).toBe(true);
    const svg = readFileSync(join(root, 'icon.svg'), 'utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
  });

  test('declares no integration, so no Connect flow can appear', () => {
    if (!parsed.ok) throw new Error('manifest did not parse');
    expect(parsed.manifest.contributes.integration).toBeUndefined();
    // Nothing may pin an origin: the Configured host lives in the service.
    expect(JSON.stringify(parsed.manifest)).not.toContain('apiOrigin');
  });

  test('ships the local proxy service for every GitLab host', () => {
    if (!parsed.ok) throw new Error('manifest did not parse');
    const service = parsed.manifest.contributes.service;
    expect(service?.runtime).toBe('host');
    expect(service?.entry).toBe('service/main.js');
    // The proxy is a narrow HTTPS proxy: no exec and no socket permissions.
    expect(service?.permissions?.exec).toBeUndefined();
    expect(service?.permissions?.sockets).toBeUndefined();
    requireBuiltBundle('service/main.js');
  });

  test('asks for files, sessions and prompt; the service carries network', () => {
    if (!parsed.ok) throw new Error('manifest did not parse');
    const capabilities = parsed.manifest.contributes.capabilities ?? [];
    expect(capabilities).toContain('files');
    expect(capabilities).toContain('sessions');
    // A seeded startSession carries text, which the host guards with `prompt`.
    expect(capabilities).toContain('prompt');
    expect(capabilities).not.toContain('network');
    // The SDK derives the actual approval request from the manifest; prove the
    // seed prompt is part of it, not just the raw list.
    const requested = requestedGuestCapabilities(parsed.manifest.contributes);
    expect(requested).toContain('prompt');
    expect(requested).toContain('sessions');
  });

  test('ships the entry HTML and a built IIFE script', () => {
    expect(existsSync(join(root, 'panel/index.html'))).toBe(true);
    const html = readFileSync(join(root, 'panel/index.html'), 'utf8');
    // The script URL is versioned so a version bump busts any cached bundle.
    const version = JSON.parse(raw).version as string;
    expect(html).toContain(`<script src="./main.js?v=${version}"></script>`);
    requireBuiltBundle('panel/main.js');
  });
});
