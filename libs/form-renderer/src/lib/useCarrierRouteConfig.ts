'use client';

import type { RouteConfig } from 'api-client';
import { useEffect, useState } from 'react';
import { resolveCarrierRouteConfig, type Portal } from './config-loader.js';

export interface UseCarrierRouteConfigOptions {
  ratingServiceBaseUrl: string;
  /** From the quote's schema response — which manifest entry and bundle URL to resolve. */
  bundle: { manifestUrl: string; configKey: string } | null;
  portal: Portal;
  state?: string;
}

export interface UseCarrierRouteConfigResult {
  config: RouteConfig | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

/**
 * The one hook both customer-portal and agent-portal use to get the portal-correct page
 * config — same hook, same code, only `portal` differs between the two apps. That's the
 * whole point: an agent-only field change is a config override in quoteflow-rating-service,
 * never new page code here.
 */
export function useCarrierRouteConfig({
  ratingServiceBaseUrl,
  bundle,
  portal,
  state,
}: UseCarrierRouteConfigOptions): UseCarrierRouteConfigResult {
  const [result, setResult] = useState<UseCarrierRouteConfigResult>({
    config: null,
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;

    setResult((prev) => ({ ...prev, status: 'loading' }));
    resolveCarrierRouteConfig({
      ratingServiceBaseUrl,
      ...bundle,
      portal,
      state,
    })
      .then((config) => {
        if (!cancelled) setResult({ config, status: 'ready', error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setResult({
            config: null,
            status: 'error',
            error: (err as Error).message,
          });
      });

    return () => {
      cancelled = true;
    };
  }, [
    ratingServiceBaseUrl,
    bundle?.manifestUrl,
    bundle?.configKey,
    portal,
    state,
  ]);

  return result;
}
