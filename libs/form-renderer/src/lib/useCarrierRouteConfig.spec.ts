import { renderHook, waitFor } from '@testing-library/react';
import * as configLoader from './config-loader.js';
import { useCarrierRouteConfig } from './useCarrierRouteConfig.js';

const bundle = { manifestUrl: '/bundles/manifest.json', configKey: 'acme' };

describe('useCarrierRouteConfig', () => {
  afterEach(() => jest.restoreAllMocks());

  it('resolves the config for the given portal and reports ready', async () => {
    const config = {
      pages: [{ key: 'driver-info', title: 'x', sections: [] }],
    };
    jest
      .spyOn(configLoader, 'resolveCarrierRouteConfig')
      .mockResolvedValue(config);

    const { result } = renderHook(() =>
      useCarrierRouteConfig({
        ratingServiceBaseUrl: 'http://localhost:4000',
        bundle,
        portal: 'agent',
      }),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.config).toEqual(config);
  });

  it('passes the portal and state through to resolveCarrierRouteConfig', async () => {
    const spy = jest
      .spyOn(configLoader, 'resolveCarrierRouteConfig')
      .mockResolvedValue({ pages: [] });

    renderHook(() =>
      useCarrierRouteConfig({
        ratingServiceBaseUrl: 'http://localhost:4000',
        bundle,
        portal: 'agent',
        state: 'CA',
      }),
    );

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        portal: 'agent',
        state: 'CA',
        configKey: 'acme',
        manifestUrl: '/bundles/manifest.json',
      }),
    );
  });

  it('reports an error status when resolution fails', async () => {
    jest
      .spyOn(configLoader, 'resolveCarrierRouteConfig')
      .mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useCarrierRouteConfig({
        ratingServiceBaseUrl: 'http://localhost:4000',
        bundle,
        portal: 'customer',
      }),
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('boom');
  });

  it('does nothing while bundle is null', () => {
    const spy = jest.spyOn(configLoader, 'resolveCarrierRouteConfig');
    const { result } = renderHook(() =>
      useCarrierRouteConfig({
        ratingServiceBaseUrl: 'http://localhost:4000',
        bundle: null,
        portal: 'customer',
      }),
    );
    expect(result.current.status).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });
});
