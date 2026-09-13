export type ModuleImporter<T> = (url: string) => Promise<T>;

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
const realDynamicImport = new Function(
  'specifier',
  'return import(specifier);',
) as <T>(specifier: string) => Promise<T>;

/**
 * Shared by validator-loader.ts (Pattern 2) and config-loader.ts (Pattern 1's browser-side
 * portal/state resolution): caches an imported module by its own hashed URL — the URL IS the
 * cache key, so a rebuilt bundle (new hash) is a cache miss automatically and a stale cached
 * copy is structurally impossible.
 */
export function createModuleLoader<T>(
  defaultImporter: ModuleImporter<T> = realDynamicImport,
) {
  const cache = new Map<string, Promise<T>>();

  function load(
    url: string,
    importer: ModuleImporter<T> = defaultImporter,
  ): Promise<T> {
    let cached = cache.get(url);
    if (!cached) {
      cached = importer(url);
      cache.set(url, cached);
    }
    return cached;
  }

  function clear(): void {
    cache.clear();
  }

  return { load, clear };
}
