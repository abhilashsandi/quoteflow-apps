import {
  clearConfigModuleCache,
  resolveCarrierRouteConfig,
  type ConfigModule,
} from './config-loader.js';

const BASE_URL = 'http://localhost:4000';

function mockManifestFetch(manifest: unknown): jest.Mock {
  const mockFetch = jest
    .fn()
    .mockResolvedValue({ json: () => Promise.resolve(manifest) });
  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

function fakeImporter(mod: ConfigModule) {
  return jest.fn().mockResolvedValue(mod);
}

describe('resolveCarrierRouteConfig', () => {
  afterEach(() => {
    clearConfigModuleCache();
    jest.restoreAllMocks();
  });

  it('fetches the manifest, resolves the bundle URL, and calls the carrier-named export', async () => {
    mockManifestFetch({
      configs: { acme: '/bundles/configs/acme/index-ABC.js' },
      validators: null,
    });
    const getAcmeAutoQuoteConfig = jest
      .fn()
      .mockReturnValue({
        pages: [{ key: 'driver-info', title: 'x', sections: [] }],
      });
    const importer = fakeImporter({ getAcmeAutoQuoteConfig });

    const config = await resolveCarrierRouteConfig({
      ratingServiceBaseUrl: BASE_URL,
      manifestUrl: '/bundles/manifest.json',
      configKey: 'acme',
      portal: 'agent',
      state: 'CA',
      importer,
    });

    expect(importer).toHaveBeenCalledWith(
      'http://localhost:4000/bundles/configs/acme/index-ABC.js',
    );
    expect(getAcmeAutoQuoteConfig).toHaveBeenCalledWith('agent', 'CA');
    expect(config.pages[0]?.key).toBe('driver-info');
  });

  it('throws a clear error when the manifest has no bundle for the given configKey', async () => {
    mockManifestFetch({ configs: {}, validators: null });
    await expect(
      resolveCarrierRouteConfig({
        ratingServiceBaseUrl: BASE_URL,
        manifestUrl: '/bundles/manifest.json',
        configKey: 'acme',
        portal: 'customer',
      }),
    ).rejects.toThrow(/no published config bundle/i);
  });

  it('caches the imported bundle by URL — a second resolve for the same bundle does not re-import', async () => {
    mockManifestFetch({
      configs: { acme: '/bundles/configs/acme/index-ABC.js' },
      validators: null,
    });
    const getAcmeAutoQuoteConfig = jest.fn().mockReturnValue({ pages: [] });
    const importer = fakeImporter({ getAcmeAutoQuoteConfig });

    await resolveCarrierRouteConfig({
      ratingServiceBaseUrl: BASE_URL,
      manifestUrl: '/bundles/manifest.json',
      configKey: 'acme',
      portal: 'customer',
      importer,
    });
    await resolveCarrierRouteConfig({
      ratingServiceBaseUrl: BASE_URL,
      manifestUrl: '/bundles/manifest.json',
      configKey: 'acme',
      portal: 'agent',
      importer,
    });

    expect(importer).toHaveBeenCalledTimes(1);
    expect(getAcmeAutoQuoteConfig).toHaveBeenCalledTimes(2);
  });
});
