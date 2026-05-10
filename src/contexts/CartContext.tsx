/* eslint-disable react-refresh/only-export-components --
 * Provider + hook co-located by convention. Splitting `useCart` into a
 * sibling file would cost discoverability for a marginal HMR benefit.
 */
/**
 * CartContext — Marketplace cart state, persisted to sessionStorage.
 *
 * Two line shapes — products carry qty; services are singletons (no qty).
 * Persisted under 'finpersona.cart.v1' so a future schema change can bump
 * the suffix without crashing tabs that still hold an old payload.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { MarketplaceItem } from '@/mocks/seed';

export type CartLine =
  | { kind: 'product'; itemId: string; qty: number }
  | { kind: 'service'; itemId: string };

type CartState = { lines: CartLine[] };

type CartAction =
  | { type: 'ADD_PRODUCT'; itemId: string; qty: number }
  | { type: 'ADD_SERVICE'; itemId: string }
  | { type: 'SET_QTY'; itemId: string; qty: number }
  | { type: 'REMOVE'; itemId: string }
  | { type: 'CLEAR' };

const STORAGE_KEY = 'finpersona.cart.v1';

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const existing = state.lines.find(
        (l) => l.kind === 'product' && l.itemId === action.itemId,
      );
      if (existing && existing.kind === 'product') {
        return {
          lines: state.lines.map((l) =>
            l.kind === 'product' && l.itemId === action.itemId
              ? { ...l, qty: l.qty + action.qty }
              : l,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          { kind: 'product', itemId: action.itemId, qty: action.qty },
        ],
      };
    }
    case 'ADD_SERVICE': {
      if (state.lines.some((l) => l.itemId === action.itemId)) return state;
      return {
        lines: [...state.lines, { kind: 'service', itemId: action.itemId }],
      };
    }
    case 'SET_QTY': {
      if (action.qty <= 0) {
        return {
          lines: state.lines.filter(
            (l) => !(l.kind === 'product' && l.itemId === action.itemId),
          ),
        };
      }
      return {
        lines: state.lines.map((l) =>
          l.kind === 'product' && l.itemId === action.itemId
            ? { ...l, qty: action.qty }
            : l,
        ),
      };
    }
    case 'REMOVE':
      return { lines: state.lines.filter((l) => l.itemId !== action.itemId) };
    case 'CLEAR':
      return { lines: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  lines: CartLine[];
  totalCount: number;
  add: (item: MarketplaceItem, qty?: number) => void;
  setQty: (itemId: string, qty: number) => void;
  remove: (itemId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readInitial(): CartState {
  if (typeof window === 'undefined') return { lines: [] };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [] };
    const parsed = JSON.parse(raw) as { lines?: CartLine[] };
    if (!Array.isArray(parsed.lines)) return { lines: [] };
    return { lines: parsed.lines };
  } catch {
    return { lines: [] };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, readInitial);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode / quota exceeded — silently no-op.
    }
  }, [state]);

  const value = useMemo<CartContextValue>(() => {
    const totalCount = state.lines.reduce(
      (sum, l) => (l.kind === 'product' ? sum + l.qty : sum + 1),
      0,
    );
    return {
      lines: state.lines,
      totalCount,
      add: (item, qty = 1) => {
        if (item.kind === 'service') {
          dispatch({ type: 'ADD_SERVICE', itemId: item.id });
        } else {
          dispatch({ type: 'ADD_PRODUCT', itemId: item.id, qty });
        }
      },
      setQty: (itemId, qty) => dispatch({ type: 'SET_QTY', itemId, qty }),
      remove: (itemId) => dispatch({ type: 'REMOVE', itemId }),
      clear: () => dispatch({ type: 'CLEAR' }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
