import type { EvaluationContext, FeatureFlagProvider } from './types.js';

export interface FeatureFlagClient {
  readonly providerName: string;
  getBooleanValue(
    flagKey: string,
    defaultValue: boolean,
    context?: EvaluationContext,
  ): Promise<boolean>;
  getStringValue(
    flagKey: string,
    defaultValue: string,
    context?: EvaluationContext,
  ): Promise<string>;
  getNumberValue(
    flagKey: string,
    defaultValue: number,
    context?: EvaluationContext,
  ): Promise<number>;
}

/**
 * The one thing application code should depend on — never a provider directly, so swapping
 * providers (local file today, LaunchDarkly later) never touches a call site. Every resolve is
 * wrapped so a misbehaving provider (a bad file, a down LD connection) fails open to the
 * caller's own default instead of throwing into request-handling code.
 */
export function createFeatureFlagClient(
  provider: FeatureFlagProvider,
): FeatureFlagClient {
  async function safeResolve<T>(
    resolve: () => Promise<T>,
    defaultValue: T,
  ): Promise<T> {
    try {
      return await resolve();
    } catch {
      return defaultValue;
    }
  }

  return {
    providerName: provider.name,
    getBooleanValue: (flagKey, defaultValue, context) =>
      safeResolve(
        () => provider.resolveBooleanValue(flagKey, defaultValue, context),
        defaultValue,
      ),
    getStringValue: (flagKey, defaultValue, context) =>
      safeResolve(
        () => provider.resolveStringValue(flagKey, defaultValue, context),
        defaultValue,
      ),
    getNumberValue: (flagKey, defaultValue, context) =>
      safeResolve(
        () => provider.resolveNumberValue(flagKey, defaultValue, context),
        defaultValue,
      ),
  };
}
