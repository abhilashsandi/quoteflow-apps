export type FlagValue = boolean | string | number;

/** Loosely mirrors OpenFeature's EvaluationContext — arbitrary attributes a provider can use
 * to target a specific user/session. This sample's providers don't do per-user targeting, but
 * the shape is here so a real provider (e.g. LaunchDarkly) can be dropped in without an
 * interface change. */
export interface EvaluationContext {
  targetingKey?: string;
  [key: string]: FlagValue | undefined;
}

/**
 * Mirrors the shape of an OpenFeature Provider: one resolver per flag value type. A provider
 * should never throw for a missing/unknown flag — it returns the caller's own default instead,
 * same as the real spec's "fail open" behavior.
 */
export interface FeatureFlagProvider {
  readonly name: string;
  resolveBooleanValue(
    flagKey: string,
    defaultValue: boolean,
    context?: EvaluationContext,
  ): Promise<boolean>;
  resolveStringValue(
    flagKey: string,
    defaultValue: string,
    context?: EvaluationContext,
  ): Promise<string>;
  resolveNumberValue(
    flagKey: string,
    defaultValue: number,
    context?: EvaluationContext,
  ): Promise<number>;
}
