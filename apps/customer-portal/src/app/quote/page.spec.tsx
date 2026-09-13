import { render, screen } from '@testing-library/react';
import QuotePage from './page';

jest.mock('./QuoteClient', () => ({
  QuoteClient: ({ resumeQuoteId }: { resumeQuoteId?: string }) => (
    <div data-testid="quote-client">{resumeQuoteId ?? 'no-resume'}</div>
  ),
}));

describe('QuotePage (Server Component wrapper)', () => {
  it('awaits searchParams and forwards resume as a plain prop to QuoteClient', async () => {
    render(
      await QuotePage({ searchParams: Promise.resolve({ resume: 'q2' }) }),
    );
    expect(screen.getByTestId('quote-client')).toHaveTextContent('q2');
  });

  it('forwards undefined when there is no resume param', async () => {
    render(await QuotePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('quote-client')).toHaveTextContent('no-resume');
  });
});
