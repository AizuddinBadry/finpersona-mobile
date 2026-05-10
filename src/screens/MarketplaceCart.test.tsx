import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from '@/contexts/CartContext';
import MarketplaceCart from './MarketplaceCart';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

/**
 * Pre-populate sessionStorage so `CartProvider`'s lazy initializer hydrates
 * with one product (qty=2) and one service. Cleaner than seeding via a hook
 * inside a wrapper component (which would have to call `add` during render).
 */
function seedCart(): void {
  sessionStorage.setItem(
    'finpersona.cart.v1',
    JSON.stringify({
      lines: [
        { kind: 'product', itemId: 'p1', qty: 2 },
        { kind: 'service', itemId: 's1' },
      ],
    }),
  );
}

function renderCart({ seed = false } = {}) {
  if (seed) seedCart();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CartProvider>
        <MemoryRouter initialEntries={['/marketplace/cart']}>
          <Routes>
            <Route path="/marketplace/cart" element={<MarketplaceCart />} />
            <Route
              path="/marketplace"
              element={<div data-testid="mp">mp</div>}
            />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => sessionStorage.clear());

describe('MarketplaceCart', () => {
  it('shows empty state when cart is empty', () => {
    renderCart();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('groups items by relief category', () => {
    renderCart({ seed: true });
    // Atomic Habits is in 'lifestyle'; Doctor consultation is in 'medical'.
    expect(screen.getAllByRole('heading').some((h) => /lifestyle/i.test(h.textContent ?? ''))).toBe(true);
    expect(screen.getAllByRole('heading').some((h) => /medical/i.test(h.textContent ?? ''))).toBe(true);
  });

  it('product row shows stepper; qty=1 then minus removes the line', async () => {
    renderCart({ seed: true });
    const dec = screen.getAllByRole('button', { name: /decrease quantity/i })[0];
    await userEvent.click(dec); // qty 2 -> 1
    await userEvent.click(dec); // qty 1 -> remove
    expect(screen.queryByText('Atomic Habits')).not.toBeInTheDocument();
  });

  it('service row shows the Schedule after checkout tag and no stepper', () => {
    renderCart({ seed: true });
    expect(screen.getByText(/schedule after checkout/i)).toBeInTheDocument();
    // The service row name is "Doctor consultation".
    const row = screen.getByText('Doctor consultation').closest('div');
    expect(row?.querySelector('[aria-label="Decrease quantity"]')).toBeNull();
  });

  it('Checkout clears cart, navigates to /marketplace, and shows toast', async () => {
    renderCart({ seed: true });
    await userEvent.click(screen.getByRole('button', { name: /^checkout$/i }));
    expect(screen.getByText(/order placed/i)).toBeInTheDocument();
    expect(screen.getByTestId('mp')).toBeInTheDocument();
    expect(sessionStorage.getItem('finpersona.cart.v1')).toMatch(/"lines":\s*\[\]/);
  });
});
