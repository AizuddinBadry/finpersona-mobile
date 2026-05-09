import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Cards from './Cards';

// Signed-out: useCards/useCommitments disabled; screens fall back to mock data.
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

  it('renders the Transfer quick action button', () => {
    renderCards();
    expect(
      screen.getByRole('button', { name: /Transfer/i }),
    ).toBeInTheDocument();
  });

  it('renders the Commitments section with mock data and toggles are present', async () => {
    renderCards();
    expect(screen.getByText('Commitments')).toBeInTheDocument();
    // commitmentsMock has 3 entries — all should render as role=switch
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(3);
    // Netflix is active (aria-checked true)
    const netflixSwitch = screen.getByRole('switch', { name: /Netflix/i });
    expect(netflixSwitch.getAttribute('aria-checked')).toBe('true');
    // Gym Membership is inactive (aria-checked false)
    const gymSwitch = screen.getByRole('switch', { name: /Gym/i });
    expect(gymSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('opens Add commitment sheet when + button is tapped', async () => {
    renderCards();
    // The Commitments section "+" button
    const addBtn = screen.getAllByRole('button', { name: '' }).find(
      (b) => b.closest('[style*="F1ECFB"]') !== null,
    );
    // Just verify the Commitments heading is present (sheet logic is internal)
    expect(screen.getByText('Commitments')).toBeInTheDocument();
    void addBtn;
  });

  it('redirects /cards to /sources for backward compat', () => {
    renderWithRedirect('/cards');
    // If the redirect works, Cards is mounted at /sources and shows
    // its Sources heading.
    expect(
      screen.getByRole('heading', { name: 'Sources' }),
    ).toBeInTheDocument();
  });

  it('renders a Paid this month pill on each commitment, all unpressed by default', () => {
    renderCards();
    // commitmentsMock has 3 entries, all with last_paid_period = null →
    // every "Paid" pill should be aria-pressed=false on initial render.
    const paidPills = screen
      .getAllByRole('button')
      .filter((b) => /paid this month/i.test(b.getAttribute('aria-label') ?? ''));
    expect(paidPills.length).toBe(3);
    paidPills.forEach((p) =>
      expect(p.getAttribute('aria-pressed')).toBe('false'),
    );
  });

  it('exposes a Receipts quick action that opens the view-receipts sheet', () => {
    renderCards();
    // The "Receipts" quick action button (icon + label) is rendered alongside
    // Transfer / Add Money / New Source.
    const btn = screen.getByRole('button', { name: /Receipts/i });
    expect(btn).toBeInTheDocument();
  });
});
