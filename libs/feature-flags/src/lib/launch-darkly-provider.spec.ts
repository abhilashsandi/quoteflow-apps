import { createLaunchDarklyProvider } from './launch-darkly-provider.js';

describe('createLaunchDarklyProvider', () => {
  it('throws when constructed without an sdkKey', () => {
    expect(() => createLaunchDarklyProvider({ sdkKey: '' })).toThrow(/sdkKey/i);
  });

  it('resolves every value type to the caller default (stub, not wired to a real SDK)', async () => {
    const provider = createLaunchDarklyProvider({ sdkKey: 'fake-key' });
    await expect(provider.resolveBooleanValue('any-flag', true)).resolves.toBe(
      true,
    );
    await expect(
      provider.resolveStringValue('any-flag', 'fallback'),
    ).resolves.toBe('fallback');
    await expect(provider.resolveNumberValue('any-flag', 7)).resolves.toBe(7);
  });

  it('reports its provider name', () => {
    const provider = createLaunchDarklyProvider({ sdkKey: 'fake-key' });
    expect(provider.name).toBe('launchdarkly-stub');
  });
});
