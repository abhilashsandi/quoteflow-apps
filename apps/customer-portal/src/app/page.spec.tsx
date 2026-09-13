import { render, screen } from '@testing-library/react';
import { getFlags } from '../lib/flags';
import HomePage from './page';

jest.mock('../lib/flags', () => ({ getFlags: jest.fn() }));

const mockGetFlags = getFlags as jest.Mock;

describe('HomePage', () => {
  beforeEach(() => {
    mockGetFlags.mockResolvedValue({ showSavingsBadge: false });
  });

  it('links to /quote to start the config-driven flow', async () => {
    render(await HomePage());
    const link = screen.getByRole('link', { name: /get a quote/i });
    expect(link).toHaveAttribute('href', '/quote');
  });

  it('names the fictional carrier', async () => {
    render(await HomePage());
    expect(screen.getAllByText(/acme insurance/i).length).toBeGreaterThan(0);
  });

  it('hides the savings badge when the flag is off', async () => {
    mockGetFlags.mockResolvedValue({ showSavingsBadge: false });
    render(await HomePage());
    expect(screen.queryByText(/save up to 15%/i)).not.toBeInTheDocument();
  });

  it('shows the savings badge when the flag is on', async () => {
    mockGetFlags.mockResolvedValue({ showSavingsBadge: true });
    render(await HomePage());
    expect(screen.getByText(/save up to 15%/i)).toBeInTheDocument();
  });
});
