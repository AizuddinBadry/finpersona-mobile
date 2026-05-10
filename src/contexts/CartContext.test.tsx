import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import type { MarketplaceItem } from '@/mocks/seed';

const product: MarketplaceItem = {
  id: 'p1',
  name: 'Atomic Habits',
  sub: 'James Clear',
  price: 58.9,
  categoryId: 'lifestyle',
  iconName: 'book',
  tint: 'linear-gradient(135deg,#fff 0%,#000 100%)',
  description: 'desc',
  kind: 'product',
};

const service: MarketplaceItem = {
  ...product,
  id: 's1',
  name: 'Doctor consultation',
  kind: 'service',
  priceSuffix: '/ consultation',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

beforeEach(() => {
  sessionStorage.clear();
});

describe('CartContext', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.lines).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('adds a product and stacks qty on second add', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(product, 2));
    act(() => result.current.add(product, 1));
    expect(result.current.lines).toEqual([
      { kind: 'product', itemId: 'p1', qty: 3 },
    ]);
    expect(result.current.totalCount).toBe(3);
  });

  it('adds a service once and ignores duplicates', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(service));
    act(() => result.current.add(service));
    expect(result.current.lines).toEqual([
      { kind: 'service', itemId: 's1' },
    ]);
    expect(result.current.totalCount).toBe(1);
  });

  it('setQty updates a product line; qty<=0 removes', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(product, 2));
    act(() => result.current.setQty('p1', 5));
    expect(result.current.lines[0]).toMatchObject({ qty: 5 });
    act(() => result.current.setQty('p1', 0));
    expect(result.current.lines).toEqual([]);
  });

  it('remove deletes a line by itemId', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(product, 2));
    act(() => result.current.add(service));
    act(() => result.current.remove('p1'));
    expect(result.current.lines).toEqual([{ kind: 'service', itemId: 's1' }]);
  });

  it('clear empties the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(product, 1));
    act(() => result.current.clear());
    expect(result.current.lines).toEqual([]);
  });

  it('persists to sessionStorage and re-hydrates', () => {
    const { result, unmount } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(product, 2));
    unmount();
    const { result: again } = renderHook(() => useCart(), { wrapper });
    expect(again.current.lines).toEqual([
      { kind: 'product', itemId: 'p1', qty: 2 },
    ]);
  });

  it('useCart throws if used outside CartProvider', () => {
    expect(() => renderHook(() => useCart())).toThrow(/CartProvider/);
  });
});
