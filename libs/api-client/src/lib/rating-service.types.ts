// Mirrors quoteflow-rating-service's response shapes. Deliberately duplicated rather than
// shared via a package: the two repos talk only over HTTP, never a shared codebase, so this
// client owns its own view of the contract (see quoteflow-rating-service's README for the
// source of truth).

export type FunnelStage = 'schema' | 'rc1' | 'rc2' | 'bind';
export type CarrierJobStatus =
  'pending' | 'running' | 'succeeded' | 'failed' | 'dead_lettered';

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  required?: boolean;
  validator?: string;
  options?: { label: string; value: string }[];
}

export interface SectionConfig {
  key: string;
  title: string;
  fields: FieldConfig[];
}

export interface PageConfig {
  key: string;
  title: string;
  sections: SectionConfig[];
}

export interface RouteConfig {
  pages: PageConfig[];
}

export interface RatingResult {
  premium: number;
  currency: 'USD';
  ratedAt: string;
}

export interface MvrReport {
  reportType: 'mvr';
  violations: string[];
  pulledAt: string;
}

export interface BundleManifest {
  configs: Record<string, string>;
  validators: string | null;
}

export type QuoteAnswers = Record<string, Record<string, unknown>>;
export interface CarrierRef {
  code: string;
  name: string;
}
export interface BundleRef {
  manifestUrl: string;
  configKey: string;
}

export interface JsonPatchOp {
  op: 'add' | 'replace' | 'remove' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

export interface CreateQuoteResponse {
  quoteId: string;
  funnelStage: FunnelStage;
  currentPageKey: string | null;
}

export interface QuoteSchemaResponse {
  quoteId: string;
  funnelStage: FunnelStage;
  carrier: CarrierRef;
  schema: RouteConfig;
  bundle: BundleRef;
  /** The quote's saved answers — lets a resume link (sessionStorage empty, quoteId known) hydrate without a second endpoint. */
  answers: QuoteAnswers;
  /** Recomputed from stored answers on every call — null until the quote leaves the `schema` stage. */
  rate: RatingResult | null;
}

export interface PatchQuoteResponse {
  quoteId: string;
  funnelStage: FunnelStage;
  answers: QuoteAnswers;
  rate: RatingResult;
}

export interface PullReportResponse {
  quoteId: string;
  funnelStage: FunnelStage;
  report: MvrReport;
  rate: RatingResult;
}

export interface RequestBindResponse {
  jobId: string;
  quoteId: string;
  status: CarrierJobStatus;
  attemptCount: number;
}

export interface BindStatusResponse {
  jobId: string;
  quoteId: string;
  status: CarrierJobStatus;
  attemptCount: number;
  lastError: string | null;
  updatedAt: string;
}
