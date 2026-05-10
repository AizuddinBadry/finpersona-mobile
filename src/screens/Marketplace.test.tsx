import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Marketplace from './Marketplace';
import { lhdnMock, marketplaceMock } from '@/mocks/seed';
import { CartProvider } from '@/contexts/CartContext';

// Signed-out: useLhdn is disabled, screen falls back to lhdnMock — same
// pattern as Lhdn.test.tsx and Insights.test.tsx.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

function renderMarketplace() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CartProvider>
        <MemoryRouter initialEntries={['/marketplace']}>
          <Marketplace />
        </MemoryRouter>
      </CartProvider>
    </QueryClientProvider>,
  );
}

describe('Marketplace', () => {
  it('renders the FINPERSONA tag and Marketplace heading', () => {
    renderMarketplace();
    expect(screen.getByText('FINPERSONA')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Marketplace' }),
    ).toBeInTheDocument();
  });

  it('shows the cart button with badge count from the mock', () => {
    renderMarketplace();
    expect(
      screen.getByRole('button', { name: /Cart, 2 items/ }),
    ).toBeInTheDocument();
  });

  it('renders the relief headroom strip with totalLeft from real LHDN cats', () => {
    renderMarketplace();
    expect(screen.getByText(/Your relief headroom/i)).toBeInTheDocument();
    // Sum of (cap - used) across lhdnMock.categories.
    const expectedTotal = lhdnMock.categories.reduce(
      (sum, c) => sum + Math.max(c.cap - c.used, 0),
      0,
    );
    const formatted = `RM ${expectedTotal.toLocaleString('en-MY')} LEFT`;
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it('renders the All pill with the total product count', () => {
    renderMarketplace();
    const allPill = screen.getByRole('tab', { name: /All/ });
    // Pill body holds the count (the rendered span).
    expect(within(allPill).getByText(String(marketplaceMock.products.length))).toBeInTheDocument();
  });

  it('renders one tab per LHDN category from the live data', () => {
    renderMarketplace();
    // 1 "All" pill + 1 per LHDN category. Accessible-name matching is brittle
    // for names with punctuation like "Medical (self & family)", so just count
    // the tabs and assert the first-word match on each.
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(lhdnMock.categories.length + 1);
    for (const c of lhdnMock.categories) {
      const firstWord = c.name.split(/[\s(]/)[0];
      expect(
        screen.getByRole('tab', { name: new RegExp(firstWord, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('filters the product grid when a category pill is tapped', async () => {
    const user = userEvent.setup();
    renderMarketplace();
    // Sports has exactly one product (Decathlon Domyos Mat) in the mock.
    expect(screen.getByText('Decathlon Domyos Mat')).toBeInTheDocument();
    expect(screen.getByText('Atomic Habits')).toBeInTheDocument();
    const sportsPill = screen.getByRole('tab', { name: /Sports equipment/ });
    await user.click(sportsPill);
    expect(screen.getByText('Decathlon Domyos Mat')).toBeInTheDocument();
    expect(screen.queryByText('Atomic Habits')).not.toBeInTheDocument();
  });

  it('renders the featured banner with dynamic "RM X left" using live sports cap', () => {
    renderMarketplace();
    const sports = lhdnMock.categories.find((c) => c.id === 'sports');
    if (sports) {
      const left = sports.cap - sports.used;
      expect(
        screen.getByText(
          new RegExp(`Sports relief — RM ${left.toLocaleString('en-MY')} left to claim`),
        ),
      ).toBeInTheDocument();
    }
    expect(screen.getByText('ENDS TODAY')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shop sports/ })).toBeInTheDocument();
  });

  it('renders all curated products from marketplaceMock by default', () => {
    renderMarketplace();
    for (const p of marketplaceMock.products) {
      expect(screen.getByText(p.name)).toBeInTheDocument();
    }
  });

  it('renders the LHDN compliance trust footer', () => {
    renderMarketplace();
    expect(screen.getByText('Curated for LHDN compliance')).toBeInTheDocument();
  });

  it('filters products by name when user types in the search input', async () => {
    const user = userEvent.setup();
    renderMarketplace();
    const search = screen.getByPlaceholderText(/Search .* claimable items/i);
    await user.type(search, 'atomic');
    expect(screen.getByText('Atomic Habits')).toBeInTheDocument();
    expect(screen.queryByText('Decathlon Domyos Mat')).not.toBeInTheDocument();
  });

  it('filters by subtitle text', async () => {
    const user = userEvent.setup();
    renderMarketplace();
    const search = screen.getByPlaceholderText(/Search .* claimable items/i);
    await user.type(search, 'yoga');
    expect(screen.getByText('Decathlon Domyos Mat')).toBeInTheDocument();
    expect(screen.queryByText('Atomic Habits')).not.toBeInTheDocument();
  });

  it('shows search-aware empty state when no items match', async () => {
    const user = userEvent.setup();
    renderMarketplace();
    const search = screen.getByPlaceholderText(/Search .* claimable items/i);
    await user.type(search, 'zzznevermatches');
    expect(
      screen.getByText(/No items match.+zzznevermatches/i),
    ).toBeInTheDocument();
  });
});
