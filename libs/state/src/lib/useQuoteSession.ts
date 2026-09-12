'use client';

import {
  createRatingServiceClient,
  type ApiError,
  type JsonPatchOp,
  type QuoteSchemaResponse,
} from 'api-client';
import { useCallback, useEffect, useRef } from 'react';
import {
  type QuoteSessionData,
  type QuoteSessionStore,
  useQuoteSessionStore,
} from './quote-session.store.js';
import {
  loadFromSessionStorage,
  saveToSessionStorage,
} from './session-storage.js';

/** Picks just the persistable data fields off the store — the store's action functions
 * aren't part of QuoteSessionData and must never end up in sessionStorage's JSON. */
function selectSessionData(store: QuoteSessionStore): QuoteSessionData {
  const {
    quoteId,
    carrier,
    funnelStage,
    currentPageKey,
    schema,
    bundle,
    answers,
    rate,
    status,
    error,
  } = store;
  return {
    quoteId,
    carrier,
    funnelStage,
    currentPageKey,
    schema,
    bundle,
    answers,
    rate,
    status,
    error,
  };
}

function fromSchemaResponse(
  data: QuoteSchemaResponse,
  currentPageKey: string | null,
): QuoteSessionData {
  return {
    quoteId: data.quoteId,
    carrier: data.carrier,
    funnelStage: data.funnelStage,
    currentPageKey: currentPageKey ?? data.schema.pages[0]?.key ?? null,
    schema: data.schema,
    bundle: data.bundle,
    answers: data.answers,
    rate: null,
    status: 'ready',
    error: null,
  };
}

export interface SubmitPageResult {
  success: boolean;
  /** Present on failure — the raw upstream error, so the caller can decide how to show it (e.g. map a field_* code to the offending field via error.details). */
  error?: ApiError;
}

export interface UseQuoteSessionOptions {
  /** bff-gateway's origin — the browser talks to bff-gateway, never quoteflow-rating-service directly. */
  bffGatewayBaseUrl: string;
  /** Present on a resume link: a quoteId with no guarantee this tab's sessionStorage has it. */
  resumeQuoteId?: string;
}

/**
 * The single integration point for the read/write-through pattern: sessionStorage is the
 * source of truth for this tab (every field change writes there immediately, see
 * session-storage.ts); every page advance also PATCHes to bff-gateway (the durable copy, for
 * resuming later or a customer<->agent handoff); on a resume link with empty sessionStorage,
 * this hydrates from bff-gateway first. Page components only ever touch this hook — never
 * sessionStorage or the API client directly.
 */
export function useQuoteSession({
  bffGatewayBaseUrl,
  resumeQuoteId,
}: UseQuoteSessionOptions) {
  const session = useQuoteSessionStore();
  const clientRef = useRef(createRatingServiceClient(bffGatewayBaseUrl));

  useEffect(() => {
    if (!resumeQuoteId || session.quoteId === resumeQuoteId) return;

    const cached = loadFromSessionStorage(resumeQuoteId);
    if (cached) {
      session.hydrate(cached);
      return;
    }

    session.setStatus('loading');
    clientRef.current.getQuoteSchema(resumeQuoteId).then((result) => {
      if (!result.success) {
        session.setStatus('error', result.error.code);
        return;
      }
      const next = fromSchemaResponse(result.data, null);
      session.hydrate(next);
      saveToSessionStorage(result.data.quoteId, next);
    });
    // Intentionally only re-runs when resumeQuoteId changes — session.quoteId in the guard
    // above (not the dep array) avoids re-hydrating on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeQuoteId]);

  const startQuote = useCallback(async (carrierCode: string): Promise<void> => {
    session.setStatus('loading');
    const created = await clientRef.current.createQuote(carrierCode);
    if (!created.success) {
      session.setStatus('error', created.error.code);
      return;
    }
    const schemaResult = await clientRef.current.getQuoteSchema(
      created.data.quoteId,
    );
    if (!schemaResult.success) {
      session.setStatus('error', schemaResult.error.code);
      return;
    }
    const next = fromSchemaResponse(
      schemaResult.data,
      created.data.currentPageKey,
    );
    session.hydrate(next);
    saveToSessionStorage(schemaResult.data.quoteId, next);
  }, []);

  const setFieldValue = useCallback(
    (pageKey: string, fieldKey: string, value: string): void => {
      session.setFieldValue(pageKey, fieldKey, value);
      const data = selectSessionData(useQuoteSessionStore.getState());
      if (data.quoteId) saveToSessionStorage(data.quoteId, data);
    },
    [],
  );

  const submitPage = useCallback(
    async (pageKey: string): Promise<SubmitPageResult> => {
      const { quoteId, answers } = useQuoteSessionStore.getState();
      if (!quoteId) return { success: false };

      const pageAnswers = answers[pageKey] ?? {};
      const ops: JsonPatchOp[] = Object.entries(pageAnswers).map(
        ([fieldKey, value]) => ({
          op: 'add',
          path: `/${pageKey}/${fieldKey}`,
          value,
        }),
      );
      if (ops.length === 0) return { success: true };

      const result = await clientRef.current.patchQuote(quoteId, ops);
      if (!result.success) return { success: false, error: result.error };

      session.patch({
        funnelStage: result.data.funnelStage,
        answers: result.data.answers,
        rate: result.data.rate,
      });
      saveToSessionStorage(
        quoteId,
        selectSessionData(useQuoteSessionStore.getState()),
      );
      return { success: true };
    },
    [],
  );

  const pullReport = useCallback(async (): Promise<SubmitPageResult> => {
    const { quoteId } = useQuoteSessionStore.getState();
    if (!quoteId) return { success: false };

    const result = await clientRef.current.pullReport(quoteId);
    if (!result.success) return { success: false, error: result.error };

    session.patch({
      funnelStage: result.data.funnelStage,
      rate: result.data.rate,
    });
    saveToSessionStorage(
      quoteId,
      selectSessionData(useQuoteSessionStore.getState()),
    );
    return { success: true };
  }, []);

  return { ...session, startQuote, setFieldValue, submitPage, pullReport };
}
