import type {
  EvaluationContext,
  FeatureFlagProvider,
  FlagValue,
} from './types.js';

export interface LaunchDarklyProviderOptions {
  sdkKey: string;
}

/**
 * Stubbed to the same FeatureFlagProvider shape a real @launchdarkly/node-server-sdk-backed
 * provider would have. Migrating off createLocalFileProvider() is meant to be exactly this:
 * pass this provider to createFeatureFlagClient() instead — nothing else in the codebase
 * changes, since every call site only ever depends on FeatureFlagClient.
 *
 * Not wired to any real SDK or network call: this sample has no LaunchDarkly account to call
 * out to, so every resolve*Value here just returns the caller's own default. A real
 * implementation would construct `LDClient` from `sdkKey` in this function and call
 * `ldClient.variation(flagKey, ldContextFrom(context), defaultValue)` per resolver.
 */
export function createLaunchDarklyProvider(
  options: LaunchDarklyProviderOptions,
): FeatureFlagProvider {
  if (!options.sdkKey) {
    throw new Error('createLaunchDarklyProvider requires a non-empty sdkKey');
  }

  async function resolve<T extends FlagValue>(
    _flagKey: string,
    defaultValue: T,
    _context?: EvaluationContext,
  ): Promise<T> {
    return defaultValue;
  }

  return {
    name: 'launchdarkly-stub',
    resolveBooleanValue: resolve,
    resolveStringValue: resolve,
    resolveNumberValue: resolve,
  };
}
