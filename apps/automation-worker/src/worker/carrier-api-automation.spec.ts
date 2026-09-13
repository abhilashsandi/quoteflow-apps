import { runCarrierApiBind } from './carrier-api-automation.js';

describe('runCarrierApiBind', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('POSTs to /v1/bind with a bearer token and the quoteId', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ policyNumber: 'VNTG-ABC123-XYZ' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await runCarrierApiBind(
      { quoteId: 'q1', carrierCode: 'vantage' },
      { apiBaseUrl: 'http://localhost:4300', apiKey: 'test-key' },
    );

    expect(result).toEqual({ policyNumber: 'VNTG-ABC123-XYZ' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4300/v1/bind',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        body: JSON.stringify({ quoteId: 'q1' }),
      }),
    );
  });

  it('throws with the response body when the API responds non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('carrier_unavailable'),
    }) as unknown as typeof fetch;

    await expect(
      runCarrierApiBind(
        { quoteId: 'q1', carrierCode: 'vantage' },
        { apiBaseUrl: 'http://x', apiKey: 'k' },
      ),
    ).rejects.toThrow(/503/);
  });

  it('throws when the API returns no policyNumber', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    await expect(
      runCarrierApiBind(
        { quoteId: 'q1', carrierCode: 'vantage' },
        { apiBaseUrl: 'http://x', apiKey: 'k' },
      ),
    ).rejects.toThrow(/no policyNumber/i);
  });
});
