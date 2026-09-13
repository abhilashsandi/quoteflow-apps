import type { BundleManifest, PageConfig, RouteConfig } from 'api-client';
import { createModuleLoader, type ModuleImporter } from './module-loader.js';

export type Portal = 'agent' | 'customer';

/**
 * Every carrier's compiled config bundle exports `get<CarrierCode>AutoQuoteConfig(portal,
 * state?)`. This sample only ever wires up Acme, so the naming convention isn't exercised
 * across carriers — a real multi-carrier setup would need a registry or a fixed export name
 * per bundle (e.g. always `getRouteConfig`) rather than string-templating the carrier code in.
 */
export type ConfigModule = Record<
  string,
  (portal: Portal, state?: string) => RouteConfig
>;

const configLoader = createModuleLoader<ConfigModule>();

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveUrl(base: string, path: string): string {
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}

export interface ResolveCarrierConfigOptions {
  ratingServiceBaseUrl: string;
  manifestUrl: string;
  configKey: string;
  portal: Portal;
  state?: string;
  importer?: ModuleImporter<ConfigModule>;
}

/**
 * Pattern 1's browser-side payoff: fetches the manifest, dynamic-imports the current config
 * bundle, and calls its exported resolver directly — this is what actually applies the
 * Base -> Portal -> State override chain (hiding fields, swapping options/validators) for the
 * portal the app is running as. The GET /quotes/:quoteId/schemas JSON is always the
 * customer/no-state baseline; this is what agent-portal needs instead to see its own
 * overrides (see quoteflow-rating-service's routeConfigs for the actual override rules).
 */
export async function resolveCarrierRouteConfig(
  options: ResolveCarrierConfigOptions,
): Promise<RouteConfig> {
  const {
    ratingServiceBaseUrl,
    manifestUrl,
    configKey,
    portal,
    state,
    importer,
  } = options;

  const manifestRes = await fetch(
    resolveUrl(ratingServiceBaseUrl, manifestUrl),
  );
  const manifest = (await manifestRes.json()) as BundleManifest;
  const bundleUrl = manifest.configs[configKey];
  if (!bundleUrl)
    throw new Error(`No published config bundle for carrier "${configKey}"`);

  const mod = await configLoader.load(
    resolveUrl(ratingServiceBaseUrl, bundleUrl),
    importer,
  );
  const getConfig = mod[`get${capitalize(configKey)}AutoQuoteConfig`];
  if (!getConfig)
    throw new Error(
      `Config bundle for "${configKey}" has no get${capitalize(configKey)}AutoQuoteConfig export`,
    );

  return getConfig(portal, state);
}

export function clearConfigModuleCache(): void {
  configLoader.clear();
}

export type { PageConfig, RouteConfig };
