import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('links to /quote to start the config-driven flow', () => {
    render(<HomePage />);
    const link = screen.getByRole('link', { name: /get a quote/i });
    expect(link).toHaveAttribute('href', '/quote');
  });

  it('names the fictional carrier', () => {
    render(<HomePage />);
    expect(screen.getAllByText(/acme insurance/i).length).toBeGreaterThan(0);
  });
});
