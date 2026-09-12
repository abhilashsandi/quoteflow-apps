import type {
  BundleRef,
  CarrierRef,
  FunnelStage,
  QuoteAnswers,
  RatingResult,
  RouteConfig,
} from 'api-client';
import { create } from 'zustand';

export type QuoteSessionStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface QuoteSessionData {
  quoteId: string | null;
  carrier: CarrierRef | null;
  funnelStage: FunnelStage | null;
  currentPageKey: string | null;
  schema: RouteConfig | null;
  bundle: BundleRef | null;
  answers: QuoteAnswers;
  rate: RatingResult | null;
  status: QuoteSessionStatus;
  error: string | null;
}

export const INITIAL_QUOTE_SESSION: QuoteSessionData = {
  quoteId: null,
  carrier: null,
  funnelStage: null,
  currentPageKey: null,
  schema: null,
  bundle: null,
  answers: {},
  rate: null,
  status: 'idle',
  error: null,
};

export interface QuoteSessionStore extends QuoteSessionData {
  hydrate: (data: QuoteSessionData) => void;
  patch: (partial: Partial<QuoteSessionData>) => void;
  setFieldValue: (pageKey: string, fieldKey: string, value: string) => void;
  setStatus: (status: QuoteSessionStatus, error?: string | null) => void;
  reset: () => void;
}

/**
 * A plain module-level Zustand store — safe here specifically because pages that use it are
 * always client-rendered (see the README's SSR/CSR boundary: pre-quoteId pages are
 * server-rendered, everything past that is client-only). A store like this would leak state
 * across requests if it were ever touched during SSR; it never is.
 */
export const useQuoteSessionStore = create<QuoteSessionStore>((set) => ({
  ...INITIAL_QUOTE_SESSION,
  hydrate: (data) => set(data),
  patch: (partial) => set(partial),
  setFieldValue: (pageKey, fieldKey, value) =>
    set((s) => ({
      answers: {
        ...s.answers,
        [pageKey]: { ...s.answers[pageKey], [fieldKey]: value },
      },
    })),
  setStatus: (status, error = null) => set({ status, error }),
  reset: () => set(INITIAL_QUOTE_SESSION),
}));
