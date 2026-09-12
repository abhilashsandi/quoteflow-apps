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
 */
export function createRatingServiceClient(
  baseUrl: string,
): RatingServiceClient {
  const url = (path: string): string => `${baseUrl.replace(/\/$/, '')}${path}`;

  return {
    createQuote(carrierCode) {
      return requestJson(url('/quotes'), {
        method: 'POST',
        body: { carrierCode },
      });
    },
    getQuoteSchema(quoteId) {
      return requestJson(url(`/quotes/${quoteId}/schemas`));
    },
    patchQuote(quoteId, ops) {
      return requestJson(url(`/quotes/${quoteId}`), {
        method: 'PATCH',
        body: ops,
      });
    },
    pullReport(quoteId) {
      return requestJson(url(`/quotes/${quoteId}/reports`), { method: 'POST' });
    },
    requestBind(quoteId) {
      return requestJson(url(`/quotes/${quoteId}/bind`), { method: 'POST' });
    },
    getBindStatus(quoteId) {
      return requestJson(url(`/quotes/${quoteId}/bind-status`));
    },
    getBundleManifest() {
      return requestJson(url('/bundles/manifest.json'));
    },
    bindEventsUrl(quoteId) {
      return url(`/quotes/${quoteId}/bind-events`);
    },
  };
}
