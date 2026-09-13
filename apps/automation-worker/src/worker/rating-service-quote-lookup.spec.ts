import { createRatingServiceQuoteLookup } from './rating-service-quote-lookup.js';

describe('createRatingServiceQuoteLookup', () => {
  afterEach(() => jest.restoreAllMocks());

  it('fetches the internal quote route and returns driver-info as applicant details', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          quoteId: 'quote-1',
          carrierCode: 'acme',
          answers: {
            'driver-info': {
              firstName: 'Jane',
              lastName: 'Doe',
              dob: '1990-01-01',
            },
          },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const lookup = createRatingServiceQuoteLookup('http://localhost:4000');
    const details = await lookup.getApplicantDetails('quote-1');

    expect(details).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1990-01-01',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/internal/quotes/quote-1',
    );
  });

  it('throws when the response is not ok', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

    const lookup = createRatingServiceQuoteLookup('http://localhost:4000');
    await expect(lookup.getApplicantDetails('quote-1')).rejects.toThrow(/404/);
  });

  it('throws when driver-info is missing a required field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          quoteId: 'quote-1',
          carrierCode: 'acme',
          answers: { 'driver-info': { firstName: 'Jane' } },
        }),
    }) as unknown as typeof fetch;

    const lookup = createRatingServiceQuoteLookup('http://localhost:4000');
    await expect(lookup.getApplicantDetails('quote-1')).rejects.toThrow(
      /missing driver-info/i,
    );
  });
});
