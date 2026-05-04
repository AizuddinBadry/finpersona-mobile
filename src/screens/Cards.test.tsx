import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Cards from './Cards';

// Signed-out: useCards is disabled, screen falls back to cardsMock.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

function renderCards() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/sources']}>
        <Cards />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderWithRedirect(initialPath: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/sources" element={<Cards />} />
          <Route
            path="/cards"
            element={<Navigate to="/sources" replace />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Cards', () => {
  it('renders the Sources heading', () => {
    renderCards();
    expect(
      screen.getByRole('heading', { name: 'Sources' }),
    ).toBeInTheDocument();
  });

  it('renders the primary card with PRIMARY badge', () => {
    renderCards();
    expect(screen.getByText('PRIMARY')).toBeInTheDocument();
    expect(screen.getAllByText(/Maybank Visa/)[0]).toBeInTheDocument();
  });

  it('renders the Transfer button on Move money form', () => {
    renderCards();
    expect(
      screen.getByRole('button', { name: 'Transfer' }),
    ).toBeInTheDocument();
  });

  it('toggles auto-deduct rule when switch is tapped', async () => {
    renderCards();
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(3);
    const first = switches[0];
    const initial = first.getAttribute('aria-checked');
    await userEvent.click(first);
    expect(first.getAttribute('aria-checked')).not.toBe(initial);
  });

  it('redirects /cards to /sources for backward compat', () => {
    renderWithRedirect('/cards');
    // If the redirect works, Cards is mounted at /sources and shows
    // its Sources heading.
    expect(
      screen.getByRole('heading', { name: 'Sources' }),
    ).toBeInTheDocument();
  });
});
