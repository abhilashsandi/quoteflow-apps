import { requestJson } from './http.js';
import type { ApiError, Result } from './result.js';
import type {
  BindStatusResponse,
  BundleManifest,
  CreateQuoteResponse,
  JsonPatchOp,
  PatchQuoteResponse,
  PullReportResponse,
  QuoteSchemaResponse,
  RequestBindResponse,
} from './rating-service.types.js';

export interface RatingServiceClient {
  createQuote(
    carrierCode: string,
  ): Promise<Result<CreateQuoteResponse, ApiError>>;
  getQuoteSchema(
    quoteId: string,
  ): Promise<Result<QuoteSchemaResponse, ApiError>>;
  patchQuote(
    quoteId: string,
    ops: JsonPatchOp[],
  ): Promise<Result<PatchQuoteResponse, ApiError>>;
  pullReport(quoteId: string): Promise<Result<PullReportResponse, ApiError>>;
  requestBind(quoteId: string): Promise<Result<RequestBindResponse, ApiError>>;
  getBindStatus(quoteId: string): Promise<Result<BindStatusResponse, ApiError>>;
  getBundleManifest(): Promise<Result<BundleManifest, ApiError>>;
  bindEventsUrl(quoteId: string): string;
}

/**
 * baseUrl is quoteflow-rating-service's own origin (RATING_SERVICE_URL) when called
 * server-side, or bff-gateway's proxy origin when called from the browser — the client
 * doesn't care which, it just hits relative-to-baseUrl paths that match Repo 1's routes.
 *
 * defaultHeaders is for bff-gateway's case specifically: Node's fetch never sends an Origin
 * header, but Repo 1's CORS policy on /quotes requires one (deliberately — see its
 * middleware-ordering docs). bff-gateway passes its own origin here to identify itself as a
 * trusted caller rather than Repo 1 loosening that policy for everyone.
 */
export function createRatingServiceClient(
  baseUrl: string,
  defaultHeaders?: Record<string, string>,
): RatingServiceClient {
  const url = (path: string): string => `${baseUrl.replace(/\/$/, '')}${path}`;
  const withDefaults = (
    headers?: Record<string, string>,
  ): Record<string, string> | undefined =>
    defaultHeaders || headers ? { ...defaultHeaders, ...headers } : undefined;

  return {
    createQuote(carrierCode) {
      return requestJson(url('/quotes'), {
        method: 'POST',
        body: { carrierCode },
        headers: withDefaults(),
      });
    },
    getQuoteSchema(quoteId) {
      return requestJson(url(`/quotes/${quoteId}/schemas`), {
        headers: withDefaults(),
      });
    },
    patchQuote(quoteId, ops) {
      return requestJson(url(`/quotes/${quoteId}`), {
        method: 'PATCH',
        body: ops,
        headers: withDefaults(),
      });
    },
    pullReport(quoteId) {
      return requestJson(url(`/quotes/${quoteId}/reports`), {
        method: 'POST',
        headers: withDefaults(),
      });
    },
    requestBind(quoteId) {
      return requestJson(url(`/quotes/${quoteId}/bind`), {
        method: 'POST',
        headers: withDefaults(),
      });
    },
    getBindStatus(quoteId) {
      return requestJson(url(`/quotes/${quoteId}/bind-status`), {
        headers: withDefaults(),
      });
    },
    getBundleManifest() {
      return requestJson(url('/bundles/manifest.json'), {
        headers: withDefaults(),
      });
    },
    bindEventsUrl(quoteId) {
      return url(`/quotes/${quoteId}/bind-events`);
    },
  };
}
