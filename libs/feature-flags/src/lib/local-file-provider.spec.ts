import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalFileProvider } from './local-file-provider.js';

describe('createLocalFileProvider', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'feature-flags-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('resolves a value present in the file', async () => {
    const filePath = join(dir, 'flags.json');
    writeFileSync(filePath, JSON.stringify({ 'show-badge': true }));

    const provider = createLocalFileProvider(filePath);
    await expect(
      provider.resolveBooleanValue('show-badge', false),
    ).resolves.toBe(true);
  });

  it('falls back to the caller default for a key not in the file', async () => {
    const filePath = join(dir, 'flags.json');
    writeFileSync(filePath, JSON.stringify({ 'show-badge': true }));

    const provider = createLocalFileProvider(filePath);
    await expect(
      provider.resolveStringValue('unknown-flag', 'default-copy'),
    ).resolves.toBe('default-copy');
  });

  it('fails open to every default when the file does not exist', async () => {
    const provider = createLocalFileProvider(join(dir, 'missing.json'));
    await expect(
      provider.resolveBooleanValue('show-badge', false),
    ).resolves.toBe(false);
    await expect(provider.resolveNumberValue('limit', 42)).resolves.toBe(42);
  });

  it('fails open to every default when the file has invalid JSON', async () => {
    const filePath = join(dir, 'broken.json');
    writeFileSync(filePath, '{ not valid json');

    const provider = createLocalFileProvider(filePath);
    await expect(
      provider.resolveBooleanValue('show-badge', true),
    ).resolves.toBe(true);
  });

  it('reports its provider name', () => {
    const provider = createLocalFileProvider(join(dir, 'missing.json'));
    expect(provider.name).toBe('local-file');
  });
});
