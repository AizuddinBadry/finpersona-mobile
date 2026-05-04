import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Activity from './Activity';

// Signed-out: useActivity is disabled, screen falls back to activityMock.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...mod, useNavigate: () => navigate };
});

function renderActivity() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/activity']}>
        <Activity />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Activity', () => {
  it('renders the Activity title', () => {
    renderActivity();
    expect(
      screen.getByRole('heading', { name: 'Activity' }),
    ).toBeInTheDocument();
  });

  it('renders the All filter chip as active by default', () => {
    renderActivity();
    const all = screen.getByRole('button', { name: 'All' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders at least 5 transaction names', () => {
    renderActivity();
    const names = [
      "Mama's Kitchen",
      'Kinokuniya KLCC',
      'Common Man Coffee',
      'Salary · Maybank',
      'Klinik Mediviron',
    ];
    for (const name of names) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('toggles active state when LHDN chip is tapped', async () => {
    renderActivity();
    const all = screen.getByRole('button', { name: 'All' });
    const lhdn = screen.getByRole('button', { name: /^LHDN$/ });

    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(lhdn).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(lhdn);

    expect(lhdn).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
  });

  it('navigates to /receipts/:id when a receipt row is tapped', async () => {
    navigate.mockClear();
    renderActivity();

    // First receipt row in the mock is "Mama's Kitchen" (id: 'a1').
    const row = screen.getByRole('button', {
      name: /View receipt Mama's Kitchen/i,
    });
    await userEvent.click(row);

    expect(navigate).toHaveBeenCalledWith('/receipts/a1');
  });
});
