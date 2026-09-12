import { createRatingServiceClient } from './rating-service-client.js';

function mockFetchOnce(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as typeof fetch;
}

describe('createRatingServiceClient', () => {
  const client = createRatingServiceClient('http://localhost:4000');

  afterEach(() => jest.restoreAllMocks());

  it('createQuote returns ok Result on success', async () => {
    mockFetchOnce(201, {
      quoteId: 'q1',
      funnelStage: 'schema',
      currentPageKey: 'driver-info',
    });
    const result = await client.createQuote('acme');
    expect(result).toEqual({
      success: true,
      data: {
        quoteId: 'q1',
        funnelStage: 'schema',
        currentPageKey: 'driver-info',
      },
    });
  });

  it('returns an err Result (never throws) on a 4xx response', async () => {
    mockFetchOnce(404, {
      error: 'carrier_not_found',
      details: { carrierCode: 'nope' },
    });
    const result = await client.createQuote('nope');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual({
        status: 404,
        code: 'carrier_not_found',
        details: { carrierCode: 'nope' },
      });
    }
  });

  it('returns an err Result on a network failure', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const result = await client.getQuoteSchema('q1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('network_error');
    }
  });

  it('patchQuote sends the JSON Patch ops as the request body', async () => {
    mockFetchOnce(200, {
      quoteId: 'q1',
      funnelStage: 'rc1',
      answers: {},
      rate: { premium: 600, currency: 'USD', ratedAt: 'now' },
    });
    await client.patchQuote('q1', [
      { op: 'add', path: '/driver-info/firstName', value: 'Jane' },
    ]);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual([
      { op: 'add', path: '/driver-info/firstName', value: 'Jane' },
    ]);
  });

  it('bindEventsUrl builds the SSE endpoint URL without making a request', () => {
    expect(client.bindEventsUrl('q1')).toBe(
      'http://localhost:4000/quotes/q1/bind-events',
    );
  });
});
