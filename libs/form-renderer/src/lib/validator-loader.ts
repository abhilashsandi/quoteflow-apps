export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export type ValidatorFn = (value: string) => ValidationResult;
export type ValidatorsModule = { validators: Record<string, ValidatorFn> };
export type ModuleImporter = (url: string) => Promise<ValidatorsModule>;

/**
 * Real dynamic ESM import — the browser resolves and executes the bundle directly, no bundler
 * step. Built via `new Function` rather than a literal `import(url)` expression: every
 * bundler we ship through here (Vite for the libs, Next's Turbopack for the apps) tries to
 * statically resolve a literal `import()` call at build time and fails hard on a
 * non-literal/runtime URL ("Module not found: Can't resolve <dynamic>"), even though it's
 * completely valid for the browser to execute at runtime. Hiding the `import()` inside a
 * runtime-constructed function is the standard way to opt a truly dynamic import out of that
 * static analysis, portably across bundlers.
 */
const dynamicImport = new Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<ValidatorsModule>;
const importModule: ModuleImporter = (url) => dynamicImport(url);

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
