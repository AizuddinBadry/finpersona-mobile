import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from '@/contexts/CartContext';
import MarketplaceItemDetail from './MarketplaceItem';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CartProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/marketplace/items/:itemId"
              element={<MarketplaceItemDetail />}
            />
            <Route
              path="/marketplace/cart"
              element={<div data-testid="cart">cart-page</div>}
            />
            <Route path="/marketplace" element={<div data-testid="mp">mp</div>} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => sessionStorage.clear());

describe('MarketplaceItemDetail', () => {
  it('shows not-found fallback for an unknown id', () => {
    renderAt('/marketplace/items/does-not-exist');
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('renders a product with quantity stepper and Add to cart CTA', () => {
    renderAt('/marketplace/items/p1');
    expect(screen.getByText('Atomic Habits')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add to cart$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
  });

  it("renders a service with What's included bullets and Book consultation CTA", () => {
    renderAt('/marketplace/items/s1');
    expect(screen.getByText("What's included")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^book consultation$/i })).toBeInTheDocument();
    // No quantity stepper for services.
    expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument();
  });

  it('Add to cart navigates to /marketplace/cart and persists the line', async () => {
    renderAt('/marketplace/items/p1');
    const inc = screen.getByRole('button', { name: /increase quantity/i });
    await userEvent.click(inc); // qty 2
    await userEvent.click(screen.getByRole('button', { name: /^add to cart$/i }));
    expect(screen.getByTestId('cart')).toBeInTheDocument();
    const raw = sessionStorage.getItem('finpersona.cart.v1');
    expect(raw).toMatch(/"itemId":"p1"/);
    expect(raw).toMatch(/"qty":2/);
  });

  it('flips the CTA when item is already in cart', async () => {
    renderAt('/marketplace/items/p1');
    await userEvent.click(screen.getByRole('button', { name: /^add to cart$/i }));
    // Re-render at the same id.
    renderAt('/marketplace/items/p1');
    expect(screen.getByRole('button', { name: /in cart — view/i })).toBeInTheDocument();
  });
});
