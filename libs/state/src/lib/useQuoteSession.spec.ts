import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuoteSessionStore } from './quote-session.store.js';
import { useQuoteSession } from './useQuoteSession.js';

const BASE_URL = 'http://localhost:4100';

function mockFetchSequence(
  ...responses: Array<{ status: number; body: unknown }>
): jest.Mock {
  const mockFetch = jest.fn();
  for (const { status, body } of responses) {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  }
  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

describe('useQuoteSession', () => {
  beforeEach(() => {
    useQuoteSessionStore.getState().reset();
    window.sessionStorage.clear();
  });

  it('startQuote creates the quote, fetches its schema, and hydrates the store', async () => {
    mockFetchSequence(
      {
        status: 201,
        body: {
          quoteId: 'q1',
          funnelStage: 'schema',
          currentPageKey: 'driver-info',
        },
      },
      {
        status: 200,
        body: {
          quoteId: 'q1',
          funnelStage: 'schema',
          carrier: { code: 'acme', name: 'Acme Insurance' },
          schema: {
            pages: [{ key: 'driver-info', title: 'Driver Info', sections: [] }],
          },
          bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
          answers: { 'driver-info': {} },
        },
      },
    );

    const { result } = renderHook(() =>
      useQuoteSession({ bffGatewayBaseUrl: BASE_URL }),
    );
    await act(() => result.current.startQuote('acme'));

    expect(result.current.quoteId).toBe('q1');
    expect(result.current.status).toBe('ready');
    expect(result.current.carrier).toEqual({
      code: 'acme',
      name: 'Acme Insurance',
    });
    expect(
      JSON.parse(window.sessionStorage.getItem('quoteflow:quote:q1') ?? '{}')
        .quoteId,
    ).toBe('q1');
  });

  it('startQuote sets status to error and does not touch sessionStorage on failure', async () => {
    mockFetchSequence({ status: 404, body: { error: 'carrier_not_found' } });

    const { result } = renderHook(() =>
      useQuoteSession({ bffGatewayBaseUrl: BASE_URL }),
    );
    await act(() => result.current.startQuote('nope'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('carrier_not_found');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('setFieldValue updates answers immutably and writes through to sessionStorage immediately', async () => {
    useQuoteSessionStore.getState().hydrate({
      quoteId: 'q1',
      carrier: { code: 'acme', name: 'Acme' },
      funnelStage: 'schema',
      currentPageKey: 'driver-info',
      schema: { pages: [] },
      bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
      answers: { 'driver-info': {} },
      rate: null,
      status: 'ready',
      error: null,
    });

    const { result } = renderHook(() =>
      useQuoteSession({ bffGatewayBaseUrl: BASE_URL }),
    );
    act(() => result.current.setFieldValue('driver-info', 'firstName', 'Jane'));

    expect(result.current.answers['driver-info']?.firstName).toBe('Jane');
    const stored = JSON.parse(
      window.sessionStorage.getItem('quoteflow:quote:q1') ?? '{}',
    );
    expect(stored.answers['driver-info'].firstName).toBe('Jane');
  });

  it('submitPage builds JSON Patch ops from the page answers and applies the PATCH response', async () => {
    useQuoteSessionStore.getState().hydrate({
      quoteId: 'q1',
      carrier: { code: 'acme', name: 'Acme' },
      funnelStage: 'schema',
      currentPageKey: 'driver-info',
      schema: { pages: [] },
      bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
      answers: { 'driver-info': { firstName: 'Jane' } },
      rate: null,
      status: 'ready',
      error: null,
    });
    const mockFetch = mockFetchSequence({
      status: 200,
      body: {
        quoteId: 'q1',
        funnelStage: 'rc1',
        answers: { 'driver-info': { firstName: 'Jane' } },
        rate: { premium: 600, currency: 'USD', ratedAt: 'now' },
      },
    });

    const { result } = renderHook(() =>
      useQuoteSession({ bffGatewayBaseUrl: BASE_URL }),
    );
    const outcome = await act(() => result.current.submitPage('driver-info'));

    expect(outcome).toEqual({ success: true });
    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual([
      { op: 'add', path: '/driver-info/firstName', value: 'Jane' },
    ]);
    expect(result.current.funnelStage).toBe('rc1');
    expect(result.current.rate).toEqual({
      premium: 600,
      currency: 'USD',
      ratedAt: 'now',
    });
  });

  it('submitPage is a no-op (no request) when the page has no answers yet', async () => {
    useQuoteSessionStore.getState().hydrate({
      quoteId: 'q1',
      carrier: { code: 'acme', name: 'Acme' },
      funnelStage: 'schema',
      currentPageKey: 'driver-info',
      schema: { pages: [] },
      bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
      answers: {},
      rate: null,
      status: 'ready',
      error: null,
    });
    const mockFetch = mockFetchSequence();

    const { result } = renderHook(() =>
      useQuoteSession({ bffGatewayBaseUrl: BASE_URL }),
    );
    const outcome = await act(() => result.current.submitPage('driver-info'));

    expect(outcome).toEqual({ success: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('submitPage returns the upstream error rather than throwing', async () => {
    useQuoteSessionStore.getState().hydrate({
      quoteId: 'q1',
      carrier: { code: 'acme', name: 'Acme' },
      funnelStage: 'schema',
      currentPageKey: 'driver-info',
      schema: { pages: [] },
      bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
      answers: { 'driver-info': { ssn: '000-45-6789' } },
      rate: null,
      status: 'ready',
      error: null,
    });
    mockFetchSequence({
      status: 400,
      body: {
        error: 'field_validator_failed',
        details: { fieldKey: 'ssn', message: 'Invalid SSN prefix' },
      },
    });

    const { result } = renderHook(() =>
      useQuoteSession({ bffGatewayBaseUrl: BASE_URL }),
    );
    const outcome = await act(() => result.current.submitPage('driver-info'));

    expect(outcome.success).toBe(false);
    expect(outcome.error?.code).toBe('field_validator_failed');
  });

  it('resume: hydrates from sessionStorage without any network call when a cached session exists', async () => {
    window.sessionStorage.setItem(
      'quoteflow:quote:q1',
      JSON.stringify({
        quoteId: 'q1',
        carrier: { code: 'acme', name: 'Acme' },
        funnelStage: 'rc1',
        currentPageKey: 'driver-info',
        schema: { pages: [] },
        bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
        answers: { 'driver-info': { firstName: 'Jane' } },
        rate: null,
        status: 'ready',
        error: null,
      }),
    );
    const mockFetch = mockFetchSequence();

    const { result } = renderHook(() =>
      useQuoteSession({ bffGatewayBaseUrl: BASE_URL, resumeQuoteId: 'q1' }),
    );

    await waitFor(() => expect(result.current.quoteId).toBe('q1'));
    expect(result.current.answers['driver-info']?.firstName).toBe('Jane');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resume: falls back to fetching from bff-gateway when sessionStorage has no cached session', async () => {
    mockFetchSequence({
      status: 200,
      body: {
        quoteId: 'q1',
        funnelStage: 'rc1',
        carrier: { code: 'acme', name: 'Acme' },
        schema: {
          pages: [{ key: 'driver-info', title: 'Driver Info', sections: [] }],
        },
        bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
        answers: { 'driver-info': { firstName: 'Jane' } },
      },
    });

    const { result } = renderHook(() =>
      useQuoteSession({ bffGatewayBaseUrl: BASE_URL, resumeQuoteId: 'q1' }),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.answers['driver-info']?.firstName).toBe('Jane');
    expect(
      JSON.parse(window.sessionStorage.getItem('quoteflow:quote:q1') ?? '{}')
        .funnelStage,
    ).toBe('rc1');
  });
});
