import { createModuleLoader, type ModuleImporter } from './module-loader.js';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export type ValidatorFn = (value: string) => ValidationResult;
export type ValidatorsModule = { validators: Record<string, ValidatorFn> };

const validatorsLoader = createModuleLoader<ValidatorsModule>();

/**
 * Pattern 2, the loading half: dynamic-import the compiled validator bundle straight from the
 * browser (see module-loader.ts for the caching + static-analysis-avoidance mechanics).
 * `importer` is injectable purely for testing the caching logic itself in Jest, where babel's
 * CJS transform of `import()` can't resolve arbitrary runtime URLs the way a real browser can
 * — production code always uses the real dynamic import.
 */
export function loadValidatorsModule(
  bundleUrl: string,
  importer?: ModuleImporter<ValidatorsModule>,
): Promise<ValidatorsModule> {
  return validatorsLoader.load(bundleUrl, importer);
}

export function clearValidatorsModuleCache(): void {
  validatorsLoader.clear();
}
