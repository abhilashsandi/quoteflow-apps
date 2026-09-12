import type { BundleManifest } from 'api-client';
import { useCallback, useRef } from 'react';
import {
  loadValidatorsModule,
  type ValidationResult,
} from './validator-loader.js';

function resolveUrl(base: string, path: string): string {
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}

/**
 * Pattern 2, the execution half: fetches quoteflow-rating-service's bundles/manifest.json
 * (cached for the component's lifetime), dynamic-imports the current validators bundle from
 * it, and runs a named validator by calling the exported function directly — no server round
 * trip once the bundle is loaded. `validate()` is safe to call repeatedly on blur; every step
 * (manifest fetch, module import) is cached, so only the first call per field pays for it.
 */
export function useValidatorRunner(ratingServiceBaseUrl: string | undefined) {
  const manifestCacheRef = useRef<{
    baseUrl: string;
    promise: Promise<BundleManifest>;
  } | null>(null);

  const validate = useCallback(
    async (validatorName: string, value: string): Promise<ValidationResult> => {
      if (!ratingServiceBaseUrl) return { valid: true };

      if (manifestCacheRef.current?.baseUrl !== ratingServiceBaseUrl) {
        manifestCacheRef.current = {
          baseUrl: ratingServiceBaseUrl,
          promise: fetch(
            resolveUrl(ratingServiceBaseUrl, '/bundles/manifest.json'),
          ).then((res) => res.json() as Promise<BundleManifest>),
        };
      }
      const manifest = await manifestCacheRef.current.promise;
      if (!manifest.validators) return { valid: true };

      const mod = await loadValidatorsModule(
        resolveUrl(ratingServiceBaseUrl, manifest.validators),
      );
      const fn = mod.validators[validatorName];
      return fn ? fn(value) : { valid: true };
    },
    [ratingServiceBaseUrl],
  );

  return { validate };
}
