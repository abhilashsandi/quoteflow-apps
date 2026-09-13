import { render, screen } from '@testing-library/react';
import QuoteComparePage from './page';

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

const ACME_SCHEMA_BODY = {
  quoteId: 'acme-1',
  funnelStage: 'rc1',
  carrier: { code: 'acme', name: 'Acme Insurance' },
  schema: { pages: [] },
  bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
  answers: {},
  rate: { premium: 600, currency: 'USD', ratedAt: 'now' },
};
const VANTAGE_SCHEMA_BODY = {
  quoteId: 'vantage-1',
  funnelStage: 'rc1',
  carrier: { code: 'vantage', name: 'Vantage Direct' },
  schema: { pages: [] },
  bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'vantage' },
  answers: {},
  rate: { premium: 550, currency: 'USD', ratedAt: 'now' },
};

describe('QuoteComparePage', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows both carriers with their price and a Choose link into the resume flow', async () => {
    mockFetchSequence(
      { status: 200, body: ACME_SCHEMA_BODY },
      { status: 200, body: VANTAGE_SCHEMA_BODY },
    );

    render(
      await QuoteComparePage({
        searchParams: Promise.resolve({ acme: 'acme-1', vantage: 'vantage-1' }),
      }),
    );

    expect(screen.getByText('Acme Insurance')).toBeInTheDocument();
    expect(screen.getByText(/\$600\.00/)).toBeInTheDocument();
    expect(screen.getByText('Vantage Direct')).toBeInTheDocument();
    expect(screen.getByText(/\$550\.00/)).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Choose Vantage Direct' }),
    ).toHaveAttribute('href', '/quote?resume=vantage-1');
  });

  it('marks the cheaper carrier as best price', async () => {
    mockFetchSequence(
      { status: 200, body: ACME_SCHEMA_BODY },
      { status: 200, body: VANTAGE_SCHEMA_BODY },
    );

    render(
      await QuoteComparePage({
        searchParams: Promise.resolve({ acme: 'acme-1', vantage: 'vantage-1' }),
      }),
    );

    expect(screen.getByText('Best price')).toBeInTheDocument();
  });

  it('shows a fallback with a link back to /quote/start when neither quote can be found', async () => {
    mockFetchSequence(
      { status: 404, body: { error: 'quote_not_found' } },
      { status: 404, body: { error: 'quote_not_found' } },
    );

    render(
      await QuoteComparePage({
        searchParams: Promise.resolve({
          acme: 'missing-1',
          vantage: 'missing-2',
        }),
      }),
    );

    expect(screen.getByText(/couldn.t find that quote/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /get a quote/i })).toHaveAttribute(
      'href',
      '/quote/start',
    );
  });
});
