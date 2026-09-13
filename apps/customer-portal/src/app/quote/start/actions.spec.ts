import { submitGaq } from './actions';

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

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

function gaqFormData(overrides: Record<string, string> = {}): FormData {
  const values: Record<string, string> = {
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-01-01',
    ssn: '123-45-6789',
    phone: '555-0100',
    maritalStatus: 'single',
    vin: '1HGCM82633A004352',
    make: 'Honda',
    model: 'Accord',
    year: '2022',
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

async function expectRedirect(promise: Promise<void>): Promise<string> {
  await expect(promise).rejects.toThrow(/^REDIRECT:/);
  try {
    await promise;
  } catch (err) {
    return (err as Error).message.replace('REDIRECT:', '');
  }
  throw new Error('unreachable');
}

describe('submitGaq', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates and patches both carriers, then redirects to the compare page', async () => {
    const mockFetch = mockFetchSequence(
      {
        status: 201,
        body: {
          quoteId: 'acme-1',
          funnelStage: 'schema',
          currentPageKey: 'driver-info',
        },
      },
      {
        status: 201,
        body: {
          quoteId: 'vantage-1',
          funnelStage: 'schema',
          currentPageKey: 'driver-info',
        },
      },
      {
        status: 200,
        body: {
          quoteId: 'acme-1',
          funnelStage: 'rc1',
          answers: {},
          rate: { premium: 600, currency: 'USD', ratedAt: 'now' },
        },
      },
      {
        status: 200,
        body: {
          quoteId: 'vantage-1',
          funnelStage: 'rc1',
          answers: {},
          rate: { premium: 550, currency: 'USD', ratedAt: 'now' },
        },
      },
    );

    const url = await expectRedirect(submitGaq(gaqFormData()));

    expect(url).toBe('/quote/compare?acme=acme-1&vantage=vantage-1');

    const acmePatchCall = mockFetch.mock.calls[2];
    const acmeOps = JSON.parse(acmePatchCall[1].body);
    expect(acmeOps).toEqual([
      { op: 'add', path: '/driver-info/firstName', value: 'Jane' },
      { op: 'add', path: '/driver-info/lastName', value: 'Doe' },
      { op: 'add', path: '/driver-info/dob', value: '1990-01-01' },
      { op: 'add', path: '/driver-info/ssn', value: '123-45-6789' },
      { op: 'add', path: '/driver-info/phone', value: '555-0100' },
      { op: 'add', path: '/driver-info/maritalStatus', value: 'single' },
    ]);

    const vantagePatchCall = mockFetch.mock.calls[3];
    const vantageOps = JSON.parse(vantagePatchCall[1].body);
    expect(vantageOps).toEqual([
      ...acmeOps,
      { op: 'add', path: '/vehicle-info/vin', value: '1HGCM82633A004352' },
      { op: 'add', path: '/vehicle-info/make', value: 'Honda' },
      { op: 'add', path: '/vehicle-info/model', value: 'Accord' },
      { op: 'add', path: '/vehicle-info/year', value: '2022' },
    ]);
  });

  it('redirects back to /quote/start with a field-scoped message when Acme rejects a field', async () => {
    mockFetchSequence(
      {
        status: 201,
        body: {
          quoteId: 'acme-1',
          funnelStage: 'schema',
          currentPageKey: 'driver-info',
        },
      },
      {
        status: 201,
        body: {
          quoteId: 'vantage-1',
          funnelStage: 'schema',
          currentPageKey: 'driver-info',
        },
      },
      {
        status: 400,
        body: {
          error: 'field_validator_failed',
          details: {
            pageKey: 'driver-info',
            fieldKey: 'ssn',
            message: 'Invalid SSN prefix',
          },
        },
      },
    );

    const url = await expectRedirect(submitGaq(gaqFormData()));

    expect(url).toContain('/quote/start?');
    expect(url).toContain('field=ssn');
    expect(decodeURIComponent(url)).toContain(
      'Acme Insurance: Invalid SSN prefix',
    );
  });

  it('redirects back to /quote/start with a field-scoped message when Vantage rejects a field (e.g. bad VIN)', async () => {
    mockFetchSequence(
      {
        status: 201,
        body: {
          quoteId: 'acme-1',
          funnelStage: 'schema',
          currentPageKey: 'driver-info',
        },
      },
      {
        status: 201,
        body: {
          quoteId: 'vantage-1',
          funnelStage: 'schema',
          currentPageKey: 'driver-info',
        },
      },
      {
        status: 200,
        body: {
          quoteId: 'acme-1',
          funnelStage: 'rc1',
          answers: {},
          rate: { premium: 600, currency: 'USD', ratedAt: 'now' },
        },
      },
      {
        status: 400,
        body: {
          error: 'field_validator_failed',
          details: {
            pageKey: 'vehicle-info',
            fieldKey: 'vin',
            message: 'Invalid VIN',
          },
        },
      },
    );

    const url = await expectRedirect(
      submitGaq(gaqFormData({ vin: 'not-a-vin' })),
    );

    expect(url).toContain('field=vin');
    expect(decodeURIComponent(url)).toContain('Vantage Direct: Invalid VIN');
  });
});
