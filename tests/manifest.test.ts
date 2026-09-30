import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { parseManifestJson } from '@openchamber/sdk/schemas';
import { API_ORIGIN, PANEL_ID } from '../panel/config';

const root = join(import.meta.dir, '..');
const raw = readFileSync(join(root, 'package.json'), 'utf8');
const parsed = parseManifestJson(raw);

describe('package manifest', () => {
  test('parses as an OpenChamber manifest', () => {
    if (!parsed.ok) throw new Error(`manifest did not parse: ${parsed.code} ${parsed.message}`);
    expect(parsed.manifest.apiVersion).toBe(1);
  });

  test('declares the Pipelines panel', () => {
    if (!parsed.ok) throw new Error('manifest did not parse');
    const panel = parsed.manifest.contributes.panel;
    expect(panel.id).toBe(PANEL_ID);
    expect(panel.name).toBe('Pipelines');
    expect(panel.icon).toBe('gitlab-fill');
    expect(panel.entry).toBe('panel/index.html');
  });

  test('integrates with exactly the configured GitLab origin over a bearer token', () => {
    if (!parsed.ok) throw new Error('manifest did not parse');
    const integration = parsed.manifest.contributes.integration;
    expect(integration?.token?.apiOrigin).toBe(API_ORIGIN);
    expect(integration?.token?.scheme).toBe('bearer');
    const settings = integration?.settings?.map((field) => field.id) ?? [];
    expect(settings).toContain('project');
    expect(settings).toContain('host');
    expect(settings).toContain('token');
  });

  test('ships the local proxy service for custom hosts', () => {    if (!parsed.ok) throw new Error('manifest did not parse');
    const service = parsed.manifest.contributes.service;
    expect(service?.runtime).toBe('host');
    expect(service?.entry).toBe('service/main.js');
    // The proxy is a narrow HTTPS proxy: no exec and no socket permissions.
    expect(service?.permissions?.exec).toBeUndefined();
    expect(service?.permissions?.sockets).toBeUndefined();
    expect(existsSync(join(root, 'service/main.js'))).toBe(true);
  });

  test('asks for files and sessions (network comes with the integration)', () => {
    if (!parsed.ok) throw new Error('manifest did not parse');
    const capabilities = parsed.manifest.contributes.capabilities ?? [];
    expect(capabilities).toContain('files');
    expect(capabilities).toContain('sessions');
  });

  test('ships the entry HTML and a built IIFE script', () => {
    expect(existsSync(join(root, 'panel/index.html'))).toBe(true);
    const html = readFileSync(join(root, 'panel/index.html'), 'utf8');
    expect(html).toContain('<script src="./main.js"></script>');
    expect(existsSync(join(root, 'panel/main.js'))).toBe(true);
  });
});
