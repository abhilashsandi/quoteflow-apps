export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export type ValidatorFn = (value: string) => ValidationResult;
export type ValidatorsModule = { validators: Record<string, ValidatorFn> };
export type ModuleImporter = (url: string) => Promise<ValidatorsModule>;

/** Real dynamic ESM import — the browser resolves and executes the bundle directly, no bundler step. */
const importModule: ModuleImporter = (url) =>
  import(/* @vite-ignore */ url) as Promise<ValidatorsModule>;

/**
 * Pattern 2, the loading half: dynamic-import the compiled validator bundle straight from the
 * browser, and cache the imported module by its own hashed URL — the URL IS the cache key, so
 * a rebuilt bundle (new hash) is a cache miss automatically and a stale cached copy is
 * structurally impossible. `importer` is injectable purely for testing the caching logic
 * itself in Jest, where babel's CJS transform of `import()` can't resolve arbitrary runtime
 * URLs the way a real browser can — production code always uses the real dynamic import above.
 */
const moduleCache = new Map<string, Promise<ValidatorsModule>>();

export function loadValidatorsModule(
  bundleUrl: string,
  importer: ModuleImporter = importModule,
): Promise<ValidatorsModule> {
  let cached = moduleCache.get(bundleUrl);
  if (!cached) {
    cached = importer(bundleUrl);
    moduleCache.set(bundleUrl, cached);
  }
  return cached;
}

export function clearValidatorsModuleCache(): void {
  moduleCache.clear();
}
