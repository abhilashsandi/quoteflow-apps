import {
  clearValidatorsModuleCache,
  loadValidatorsModule,
  type ValidatorsModule,
} from './validator-loader.js';

/**
 * Real dynamic `import()` of a runtime-computed URL can't be exercised under Jest's
 * babel/CJS transform (there's no browser to resolve it) — loadValidatorsModule's `importer`
 * param lets these tests exercise its actual caching logic (the interesting part we wrote)
 * with a fake importer. The real dynamic-import path is verified by running the app in an
 * actual browser (see quoteflow-rating-service's own bundle verification for the server side
 * of this same pattern).
 */
function fakeImporter(mod: ValidatorsModule) {
  return jest.fn().mockResolvedValue(mod);
}

describe('loadValidatorsModule', () => {
  afterEach(() => clearValidatorsModuleCache());

  it('resolves to the module the importer returns', async () => {
    const importer = fakeImporter({
      validators: { echo: (v) => ({ valid: v === 'ok' }) },
    });
    const mod = await loadValidatorsModule(
      '/bundles/validators/index-AAA.js',
      importer,
    );
    expect(mod.validators.echo('ok')).toEqual({ valid: true });
  });

  it('caches by URL: a second load of the same URL calls the importer only once', async () => {
    const importer = fakeImporter({
      validators: { always: () => ({ valid: true }) },
    });
    const url = '/bundles/validators/index-BBB.js';
    const first = await loadValidatorsModule(url, importer);
    const second = await loadValidatorsModule(url, importer);
    expect(first).toBe(second);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('a different URL (different content hash) is a cache miss, loaded independently', async () => {
    const importerA = fakeImporter({
      validators: { name: () => ({ valid: true, message: 'a' }) },
    });
    const importerB = fakeImporter({
      validators: { name: () => ({ valid: true, message: 'b' }) },
    });

    const modA = await loadValidatorsModule(
      '/bundles/validators/index-CCC.js',
      importerA,
    );
    const modB = await loadValidatorsModule(
      '/bundles/validators/index-DDD.js',
      importerB,
    );

    expect(modA.validators.name('x').message).toBe('a');
    expect(modB.validators.name('x').message).toBe('b');
    expect(importerA).toHaveBeenCalledTimes(1);
    expect(importerB).toHaveBeenCalledTimes(1);
  });

  it('concurrent loads of the same URL before it resolves share one in-flight promise', async () => {
    const importer = fakeImporter({ validators: {} });
    const url = '/bundles/validators/index-EEE.js';
    const [first, second] = await Promise.all([
      loadValidatorsModule(url, importer),
      loadValidatorsModule(url, importer),
    ]);
    expect(first).toBe(second);
    expect(importer).toHaveBeenCalledTimes(1);
  });
});
