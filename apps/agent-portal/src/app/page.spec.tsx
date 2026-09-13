import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('links to /quote to start the config-driven flow', () => {
    render(<HomePage />);
    const link = screen.getByRole('link', { name: /start quote/i });
    expect(link).toHaveAttribute('href', '/quote');
  });

  it('frames the flow for an agent', () => {
    render(<HomePage />);
    expect(
      screen.getAllByText(/start a quote for your customer/i).length,
    ).toBeGreaterThan(0);
  });
});
