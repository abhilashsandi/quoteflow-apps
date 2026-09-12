import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useQuoteSession } from 'state';
import QuotePage from './page';

jest.mock('state', () => ({ useQuoteSession: jest.fn() }));
jest.mock('form-renderer', () => ({
  ConfigDrivenPage: () => <div data-testid="config-driven-page" />,
}));

const mockUseQuoteSession = useQuoteSession as jest.Mock;

const driverInfoPage = {
  key: 'driver-info',
  title: 'Driver Information',
  sections: [],
};

function baseSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    quoteId: 'q1',
    carrier: { code: 'acme', name: 'Acme' },
    funnelStage: 'schema',
    currentPageKey: 'driver-info',
    schema: { pages: [driverInfoPage] },
    bundle: { manifestUrl: '/bundles/manifest.json', configKey: 'acme' },
    answers: {},
    rate: null,
    status: 'ready',
    error: null,
    startQuote: jest.fn(),
    setFieldValue: jest.fn(),
    submitPage: jest.fn().mockResolvedValue({ success: true }),
    pullReport: jest.fn().mockResolvedValue({ success: true }),
    requestBind: jest.fn().mockResolvedValue({ success: true }),
    getBindStatus: jest
      .fn()
      .mockResolvedValue({
        status: 'pending',
        attemptCount: 0,
        lastError: null,
      }),
    ...overrides,
  };
}

describe('QuotePage', () => {
  afterEach(() => jest.clearAllMocks());

  it('starts a quote on mount when idle', () => {
    const session = baseSession({ status: 'idle' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuotePage />);
    expect(session.startQuote).toHaveBeenCalledWith('acme');
  });

  it('shows a loading state without rendering the form', () => {
    mockUseQuoteSession.mockReturnValue(baseSession({ status: 'loading' }));
    render(<QuotePage />);
    expect(screen.getByText(/setting up your quote/i)).toBeInTheDocument();
    expect(screen.queryByTestId('config-driven-page')).not.toBeInTheDocument();
  });

  it('shows the upstream error message on error', () => {
    mockUseQuoteSession.mockReturnValue(
      baseSession({ status: 'error', error: 'carrier_not_found' }),
    );
    render(<QuotePage />);
    expect(screen.getByText(/carrier_not_found/)).toBeInTheDocument();
  });

  it('renders the config-driven page and a placeholder price when ready with no rate yet', () => {
    mockUseQuoteSession.mockReturnValue(baseSession());
    render(<QuotePage />);
    expect(screen.getByTestId('config-driven-page')).toBeInTheDocument();
    expect(
      screen.getByText(/fill in your info to see a price/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue' }),
    ).toBeInTheDocument();
  });

  it('shows the computed premium once a rate exists', () => {
    mockUseQuoteSession.mockReturnValue(
      baseSession({ rate: { premium: 600, currency: 'USD', ratedAt: 'now' } }),
    );
    render(<QuotePage />);
    expect(screen.getByText('$600.00 / mo')).toBeInTheDocument();
  });

  it('Continue at the schema stage calls submitPage for the current page', async () => {
    const session = baseSession();
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuotePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(session.submitPage).toHaveBeenCalledWith('driver-info'),
    );
  });

  it('Continue at the rc1 stage calls pullReport instead of submitPage', async () => {
    const session = baseSession({ funnelStage: 'rc1' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuotePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(session.pullReport).toHaveBeenCalled());
    expect(session.submitPage).not.toHaveBeenCalled();
  });

  it('shows "Purchase policy" at rc2 and calls requestBind when clicked', async () => {
    const session = baseSession({ funnelStage: 'rc2' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuotePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Purchase policy' }));
    await waitFor(() => expect(session.requestBind).toHaveBeenCalled());
  });

  it('shows the bind-progress card and polls status once funnelStage is bind', async () => {
    const session = baseSession({ funnelStage: 'bind' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuotePage />);
    expect(screen.getByText(/finalizing your policy/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /continue|purchase/i }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(session.getBindStatus).toHaveBeenCalled());
    expect(await screen.findByText('pending')).toBeInTheDocument();
  });
});
