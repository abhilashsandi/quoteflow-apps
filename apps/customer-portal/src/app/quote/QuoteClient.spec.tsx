import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useQuoteSession } from 'state';
import { QuoteClient } from './QuoteClient';

jest.mock('state', () => ({
  useQuoteSession: jest.fn(),
  useChatStream: jest.fn(() => ({
    messages: [],
    status: 'idle',
    error: null,
    sendMessage: jest.fn(),
  })),
}));
jest.mock('form-renderer', () => ({
  ConfigDrivenPage: () => <div data-testid="config-driven-page" />,
}));

const mockUseQuoteSession = useQuoteSession as jest.Mock;

const driverInfoPage = {
  key: 'driver-info',
  title: 'Driver Information',
  sections: [],
};

const driverInfoPageWithFields = {
  key: 'driver-info',
  title: 'Driver Information',
  sections: [
    {
      key: 'personal',
      title: 'Personal Information',
      fields: [
        { key: 'firstName', label: 'First name', type: 'text' as const },
        {
          key: 'ssn',
          label: 'Social Security Number',
          type: 'text' as const,
          validator: 'ssn',
        },
      ],
    },
  ],
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
    report: null,
    status: 'ready',
    error: null,
    startQuote: jest.fn(),
    setFieldValue: jest.fn(),
    submitPage: jest.fn().mockResolvedValue({ success: true }),
    pullReport: jest.fn().mockResolvedValue({ success: true }),
    requestBind: jest.fn().mockResolvedValue({ success: true }),
    getBindStatus: jest.fn().mockResolvedValue({
      status: 'pending',
      attemptCount: 0,
      lastError: null,
    }),
    ...overrides,
  };
}

describe('QuoteClient', () => {
  afterEach(() => jest.clearAllMocks());

  it('starts a quote on mount when idle', () => {
    const session = baseSession({ status: 'idle' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);
    expect(session.startQuote).toHaveBeenCalledWith('acme');
  });

  it('does not auto-start a fresh quote when a resumeQuoteId is present', () => {
    const session = baseSession({ status: 'idle' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient resumeQuoteId="q2" />);
    expect(session.startQuote).not.toHaveBeenCalled();
    expect(mockUseQuoteSession).toHaveBeenCalledWith(
      expect.objectContaining({ resumeQuoteId: 'q2' }),
    );
  });

  it('shows the resumed carrier name in the quote card header', () => {
    mockUseQuoteSession.mockReturnValue(
      baseSession({ carrier: { code: 'vantage', name: 'Vantage Direct' } }),
    );
    render(<QuoteClient resumeQuoteId="q2" />);
    expect(
      screen.getByRole('heading', { name: 'Your Vantage Direct quote' }),
    ).toBeInTheDocument();
  });

  it('shows a loading state without rendering the form', () => {
    mockUseQuoteSession.mockReturnValue(baseSession({ status: 'loading' }));
    render(<QuoteClient />);
    expect(screen.getByText(/setting up your quote/i)).toBeInTheDocument();
    expect(screen.queryByTestId('config-driven-page')).not.toBeInTheDocument();
  });

  it('shows the upstream error message on error', () => {
    mockUseQuoteSession.mockReturnValue(
      baseSession({ status: 'error', error: 'carrier_not_found' }),
    );
    render(<QuoteClient />);
    expect(screen.getByText(/carrier_not_found/)).toBeInTheDocument();
  });

  it('renders the config-driven page and a placeholder price when ready with no rate yet', () => {
    mockUseQuoteSession.mockReturnValue(baseSession());
    render(<QuoteClient />);
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
    render(<QuoteClient />);
    expect(screen.getByText('$600.00 / mo')).toBeInTheDocument();
  });

  it('Continue at the schema stage calls submitPage for the current page', async () => {
    const session = baseSession();
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(session.submitPage).toHaveBeenCalledWith('driver-info'),
    );
  });

  it('Continue at the rc1 stage calls pullReport instead of submitPage', async () => {
    const session = baseSession({ funnelStage: 'rc1' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(session.pullReport).toHaveBeenCalled());
    expect(session.submitPage).not.toHaveBeenCalled();
  });

  it('shows the same editable config-driven page at rc1 as at schema, not a read-only view', () => {
    mockUseQuoteSession.mockReturnValue(
      baseSession({
        funnelStage: 'rc1',
        schema: { pages: [driverInfoPageWithFields] },
        answers: {
          'driver-info': { firstName: 'Jane', ssn: '123-45-6789' },
        },
      }),
    );
    render(<QuoteClient />);

    expect(screen.getByTestId('config-driven-page')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue' }),
    ).toBeInTheDocument();
  });

  it('shows "Purchase policy" at rc2 and calls requestBind when clicked', async () => {
    const session = baseSession({ funnelStage: 'rc2' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);
    fireEvent.click(screen.getByRole('button', { name: 'Purchase policy' }));
    await waitFor(() => expect(session.requestBind).toHaveBeenCalled());
  });

  it('shows the driving record results at rc2 instead of re-rendering the form', () => {
    mockUseQuoteSession.mockReturnValue(
      baseSession({
        funnelStage: 'rc2',
        report: {
          reportType: 'mvr',
          violations: ['speeding_2024'],
          pulledAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    );
    render(<QuoteClient />);

    expect(screen.getByText('Driving record')).toBeInTheDocument();
    expect(screen.getByText('speeding 2024')).toBeInTheDocument();
    expect(screen.queryByTestId('config-driven-page')).not.toBeInTheDocument();
  });

  it('shows a pulling placeholder at rc2 before the report has loaded', () => {
    mockUseQuoteSession.mockReturnValue(baseSession({ funnelStage: 'rc2' }));
    render(<QuoteClient />);
    expect(
      screen.getByText(/pulling your driving record/i),
    ).toBeInTheDocument();
  });

  it('shows a clean-record message at rc2 when there are no violations', () => {
    mockUseQuoteSession.mockReturnValue(
      baseSession({
        funnelStage: 'rc2',
        report: { reportType: 'mvr', violations: [], pulledAt: 'now' },
      }),
    );
    render(<QuoteClient />);

    expect(screen.getByText(/no violations found/i)).toBeInTheDocument();
  });

  it('clicking a completed sidebar step shows and edits it without changing the real stage', async () => {
    const session = baseSession({
      funnelStage: 'rc2',
      report: { reportType: 'mvr', violations: [], pulledAt: 'now' },
    });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);

    expect(screen.getByText('Driving record')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Your Quote' }));

    expect(screen.getByTestId('config-driven-page')).toBeInTheDocument();
    expect(screen.queryByText('Driving record')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Update quote' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Back to current step' }),
    ).toBeInTheDocument();
    // The live-stage action is gone while reviewing a past step.
    expect(
      screen.queryByRole('button', { name: 'Purchase policy' }),
    ).not.toBeInTheDocument();
  });

  it('"Update quote" re-submits the current page and snaps back to the live step on success', async () => {
    const session = baseSession({ funnelStage: 'rc2' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Your Quote' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update quote' }));

    await waitFor(() =>
      expect(session.submitPage).toHaveBeenCalledWith('driver-info'),
    );
    await waitFor(() =>
      expect(screen.getByText('Driving record')).toBeInTheDocument(),
    );
  });

  it('"Update quote" re-pulls the report too when the quote is already at rc2, so the price stays consistent with the shown violations', async () => {
    const session = baseSession({
      funnelStage: 'rc2',
      report: {
        reportType: 'mvr',
        violations: ['speeding_2024'],
        pulledAt: 'now',
      },
    });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Your Quote' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update quote' }));

    await waitFor(() => expect(session.submitPage).toHaveBeenCalled());
    expect(session.pullReport).toHaveBeenCalled();
  });

  it('"Update quote" does not re-pull the report when the quote is only at rc1', async () => {
    const session = baseSession({ funnelStage: 'rc1' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Personal Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update quote' }));

    await waitFor(() => expect(session.submitPage).toHaveBeenCalled());
    expect(session.pullReport).not.toHaveBeenCalled();
  });

  it('"Update quote" keeps the form open and shows the field error on failure', async () => {
    const session = baseSession({
      funnelStage: 'rc2',
      submitPage: jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'field_validator_failed',
          details: { fieldKey: 'ssn', message: 'Invalid SSN prefix' },
        },
      }),
    });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Your Quote' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update quote' }));

    await waitFor(() => expect(session.submitPage).toHaveBeenCalled());
    // Still showing the (editable) form, not bounced back to Driving Record.
    expect(screen.getByTestId('config-driven-page')).toBeInTheDocument();
    expect(screen.queryByText('Driving record')).not.toBeInTheDocument();
  });

  it('"Back to current step" returns to the live step without submitting anything', () => {
    const session = baseSession({
      funnelStage: 'rc2',
      report: { reportType: 'mvr', violations: [], pulledAt: 'now' },
    });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Your Quote' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to current step' }),
    );

    expect(screen.getByText('Driving record')).toBeInTheDocument();
    expect(session.submitPage).not.toHaveBeenCalled();
  });

  it('does not let the user click back into an earlier step once bind has started', () => {
    mockUseQuoteSession.mockReturnValue(baseSession({ funnelStage: 'bind' }));
    render(<QuoteClient />);
    expect(screen.queryByRole('button', { name: 'Your Quote' })).toBeNull();
  });

  it('shows the bind-progress card and polls status once funnelStage is bind', async () => {
    const session = baseSession({ funnelStage: 'bind' });
    mockUseQuoteSession.mockReturnValue(session);
    render(<QuoteClient />);
    expect(screen.getByText(/finalizing your policy/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /continue|purchase/i }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(session.getBindStatus).toHaveBeenCalled());
    expect(await screen.findByText('pending')).toBeInTheDocument();
  });
});
