import { createFeatureFlagClient } from './feature-flags-client.js';
import type { FeatureFlagProvider } from './types.js';

function fakeProvider(
  overrides: Partial<FeatureFlagProvider> = {},
): FeatureFlagProvider {
  return {
    name: 'fake',
    resolveBooleanValue: jest.fn().mockResolvedValue(false),
    resolveStringValue: jest.fn().mockResolvedValue(''),
    resolveNumberValue: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe('createFeatureFlagClient', () => {
  it('delegates to the provider and returns its resolved value', async () => {
    const provider = fakeProvider({
      resolveBooleanValue: jest.fn().mockResolvedValue(true),
    });
    const client = createFeatureFlagClient(provider);

    await expect(client.getBooleanValue('flag', false)).resolves.toBe(true);
    expect(provider.resolveBooleanValue).toHaveBeenCalledWith(
      'flag',
      false,
      undefined,
    );
  });

  it('passes the evaluation context through to the provider', async () => {
    const provider = fakeProvider();
    const client = createFeatureFlagClient(provider);
    const context = { targetingKey: 'user-1' };

    await client.getStringValue('flag', 'default', context);
    expect(provider.resolveStringValue).toHaveBeenCalledWith(
      'flag',
      'default',
      context,
    );
  });

  it('fails open to the caller default when the provider throws', async () => {
    const provider = fakeProvider({
      resolveNumberValue: jest.fn().mockRejectedValue(new Error('boom')),
    });
    const client = createFeatureFlagClient(provider);

    await expect(client.getNumberValue('flag', 99)).resolves.toBe(99);
  });

  it('exposes the underlying provider name', () => {
    const client = createFeatureFlagClient(
      fakeProvider({ name: 'local-file' }),
    );
    expect(client.providerName).toBe('local-file');
  });
});
