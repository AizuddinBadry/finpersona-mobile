import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  monthRange,
  shapeInsights,
  type InsightsReceiptRow,
  type ClaimableInsights,
} from '@/lib/supabase/queries/insights';
import { claimableInsightsMock } from '@/mocks/seed';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useClaimableInsights } from './useInsights';

const mockedUseAuth = vi.mocked(useAuth);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function r(id: string, amount: string | number, category: string | null): InsightsReceiptRow {
  return {
    id,
    user_id: 'u',
    total_amount: amount,
    category,
    receipt_date: '2026-04-15',
  };
}

describe('monthRange', () => {
  it('returns ISO bounds for the current and previous month', () => {
    const out = monthRange(new Date('2026-05-15T10:00:00'));
    expect(out.monthStart).toBe('2026-05-01');
    expect(out.monthEnd).toBe('2026-06-01');
    expect(out.prevStart).toBe('2026-04-01');
    expect(out.prevEnd).toBe('2026-05-01');
    expect(out.monthLabel).toBe('May');
    expect(out.prevLabel).toBe('April');
  });

  it('handles the January wrap-around', () => {
    const out = monthRange(new Date('2026-01-15T10:00:00'));
    expect(out.prevStart).toBe('2025-12-01');
    expect(out.prevEnd).toBe('2026-01-01');
    expect(out.prevLabel).toBe('December');
  });
});

describe('shapeInsights', () => {
  it('totals current and previous months and computes deltaPct', () => {
    const current = [r('c1', '1000', 'Food'), r('c2', '500', 'Transport')];
    const previous = [r('p1', '2000', 'Food')];
    const out = shapeInsights({
      current,
      previous,
      monthLabel: 'April',
      prevLabel: 'March',
    });
    expect(out.totalRm).toBe(1500);
    expect(out.prevTotalRm).toBe(2000);
    expect(out.deltaPct).toBe(-25); // (1500 - 2000) / 2000 = -25%
  });

  it('returns deltaPct=0 when previous month is empty (no division by zero)', () => {
    const out = shapeInsights({
      current: [r('c1', '500', 'Food')],
      previous: [],
      monthLabel: 'April',
      prevLabel: 'March',
    });
    expect(out.deltaPct).toBe(0);
  });

  it('coerces PostgREST string numerics safely', () => {
    const current = [r('c1', '142.18', 'Food')];
    const out = shapeInsights({
      current,
      previous: [],
      monthLabel: 'April',
      prevLabel: 'March',
    });
    expect(out.totalRm).toBe(142);
  });

  it('aggregates and sorts categories desc by amount, top 5', () => {
    const current = [
      r('c1', '300', 'Food'),
      r('c2', '300', 'Dining'), // same bucket as Food
      r('c3', '500', 'Transport'),
      r('c4', '200', 'Shopping'),
      r('c5', '100', 'Bills'),
      r('c6', '50', 'Coffee'),
      r('c7', '30', 'Books'),
    ];
    const out = shapeInsights({
      current,
      previous: [],
      monthLabel: 'April',
      prevLabel: 'March',
    });
    expect(out.categories).toHaveLength(5);
    expect(out.categories[0]).toMatchObject({ label: 'Dining', amount: 600, pct: 100 });
    expect(out.categories[1]).toMatchObject({ label: 'Transport', amount: 500 });
    // Lifestyle (Books, 30) drops off the top 5 since Coffee (50) outranks it.
    const labels = out.categories.map((c) => c.label);
    expect(labels).not.toContain('Lifestyle');
  });

  it('falls back to mock categories when none of the current rows match a known bucket', () => {
    const current = [r('c1', '100', 'Random')]; // no bucket match
    const out = shapeInsights({
      current,
      previous: [],
      monthLabel: 'April',
      prevLabel: 'March',
    });
    expect(out.categories.length).toBeGreaterThan(0);
    expect(out.categories.map((c) => c.label)).toContain('Dining');
  });

  it('keeps chart geometry / forecast / axis on mock', () => {
    const out = shapeInsights({
      current: [],
      previous: [],
      monthLabel: 'April',
      prevLabel: 'March',
    });
    expect(out.pathCurrent.startsWith('M')).toBe(true);
    expect(out.axis).toHaveLength(5);
    expect(out.forecast.period).toBe('May');
  });

  it('uses provided month/prev labels', () => {
    const out = shapeInsights({
      current: [],
      previous: [],
      monthLabel: 'April',
      prevLabel: 'March',
    });
    expect(out.monthLabel).toBe('April');
    expect(out.prevLabel).toBe('March');
  });
});

describe('useClaimableInsights', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
    mockedUseAuth.mockReturnValue({
      session: null,
      user: { id: 'user-1' } as never,
      isLoading: false,
      isAuthenticated: true,
      signOut: vi.fn(),
    });
  });

  const fixture: ClaimableInsights = {
    totalCap: 100,
    totalClaimed: 25,
    headroom: 75,
    categoryCount: 1,
    categories: [
      {
        code: 'lifestyle',
        name: 'Lifestyle',
        cap: 100,
        claimed: 25,
        pct: 0.25,
        color: '#6E4CE6',
        icon: 'book',
      },
    ],
  };

  it('returns the fetched data on success', async () => {
    const fetchClaimableInsights = vi.fn().mockResolvedValue(fixture);

    const { result } = renderHook(
      () => useClaimableInsights({ fetchClaimableInsights }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fixture);
    expect(fetchClaimableInsights).toHaveBeenCalledWith(
      'user-1',
      expect.any(Number),
    );
  });

  it('falls back to claimableInsightsMock when the query rejects', async () => {
    const fetchClaimableInsights = vi
      .fn()
      .mockRejectedValue(new Error('boom'));

    const { result } = renderHook(
      () => useClaimableInsights({ fetchClaimableInsights }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(claimableInsightsMock);
  });

  it('is disabled (queryFn not called) when no user is authenticated', async () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signOut: vi.fn(),
    });
    const fetchClaimableInsights = vi.fn().mockResolvedValue(fixture);

    const { result } = renderHook(
      () => useClaimableInsights({ fetchClaimableInsights }),
      { wrapper: makeWrapper() },
    );

    // Give react-query a tick. Disabled queries stay in 'pending' fetchStatus 'idle'.
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchClaimableInsights).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
