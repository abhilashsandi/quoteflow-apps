import { readFileSync } from 'node:fs';
import type { FeatureFlagProvider, FlagValue } from './types.js';

/**
 * The default provider for this sample: flags live in a plain JSON file on disk (a flat
 * `{ "flag-key": value }` map), read once at process startup — no network call, no SDK. A real
 * deployment swaps this for launch-darkly-provider.ts (or any other OpenFeature-shaped
 * provider) without touching a single call site — see createFeatureFlagClient().
 */
export function createLocalFileProvider(filePath: string): FeatureFlagProvider {
  let flags: Record<string, FlagValue> = {};
  try {
    flags = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<
      string,
      FlagValue
    >;
  } catch {
    // Missing or invalid file: every caller still gets its own default via resolve() below —
    // this provider never throws.
    flags = {};
  }

  async function resolve<T extends FlagValue>(
    flagKey: string,
    defaultValue: T,
  ): Promise<T> {
    const value = flags[flagKey];
    return value === undefined ? defaultValue : (value as T);
  }

  return {
    name: 'local-file',
    resolveBooleanValue: (flagKey, defaultValue) =>
      resolve(flagKey, defaultValue),
    resolveStringValue: (flagKey, defaultValue) =>
      resolve(flagKey, defaultValue),
    resolveNumberValue: (flagKey, defaultValue) =>
      resolve(flagKey, defaultValue),
  };
}
