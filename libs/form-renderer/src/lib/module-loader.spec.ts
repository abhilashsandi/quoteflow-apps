import { createModuleLoader } from './module-loader.js';

describe('createModuleLoader', () => {
  it('caches a loaded module by URL: a second load of the same URL calls the importer once', async () => {
    const loader = createModuleLoader<{ value: string }>();
    const importer = jest.fn().mockResolvedValue({ value: 'a' });

    const first = await loader.load('/bundle-a.js', importer);
    const second = await loader.load('/bundle-a.js', importer);

    expect(first).toBe(second);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('treats different URLs as independent cache entries', async () => {
    const loader = createModuleLoader<{ value: string }>();
    const importerA = jest.fn().mockResolvedValue({ value: 'a' });
    const importerB = jest.fn().mockResolvedValue({ value: 'b' });

    const a = await loader.load('/bundle-a.js', importerA);
    const b = await loader.load('/bundle-b.js', importerB);

    expect(a.value).toBe('a');
    expect(b.value).toBe('b');
  });

  it('clear() empties the cache so a subsequent load re-imports', async () => {
    const loader = createModuleLoader<{ value: string }>();
    const importer = jest.fn().mockResolvedValue({ value: 'a' });

    await loader.load('/bundle-a.js', importer);
    loader.clear();
    await loader.load('/bundle-a.js', importer);

    expect(importer).toHaveBeenCalledTimes(2);
  });
});
