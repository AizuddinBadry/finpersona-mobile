import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useReceipt, useUpdateReceipt, useDeleteReceipt } from './useReceipt';
import type { ReceiptRow } from '@/lib/supabase/queries/receiptDetail';

const mockedUseAuth = vi.mocked(useAuth);

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children),
  };
}

const sampleRow: ReceiptRow = {
  id: 'r-1',
  user_id: 'user-1',
  merchant_name: 'Starbucks',
  receipt_date: '2026-05-01',
  total_amount: 12.5,
  currency: 'MYR',
  category: 'food',
  is_claimable: false,
  image_url: null,
  extracted_data: null,
  created_at: '2026-05-01T00:00:00Z',
};

beforeEach(() => {
  mockedUseAuth.mockReturnValue({
    session: null,
    user: { id: 'user-1' } as never,
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
  });
});

describe('useReceipt', () => {
  it('fetches a receipt with the right id and userId', async () => {
    const { wrapper } = makeWrapper();
    const fetchReceipt = vi.fn().mockResolvedValue(sampleRow);

    const { result } = renderHook(() => useReceipt('r-1', { fetchReceipt }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchReceipt).toHaveBeenCalledWith('r-1', 'user-1');
    expect(result.current.data).toEqual(sampleRow);
  });

  it('surfaces errors when the query rejects', async () => {
    const { wrapper } = makeWrapper();
    const fetchReceipt = vi.fn().mockRejectedValue(new Error('not found'));

    const { result } = renderHook(() => useReceipt('r-1', { fetchReceipt }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateReceipt', () => {
  it('calls updateReceipt with merged userId and invalidates all 6 keys', async () => {
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const updateReceipt = vi.fn().mockResolvedValue(sampleRow);

    const { result } = renderHook(() => useUpdateReceipt({ updateReceipt }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'r-1', merchantName: 'X' });
    });

    expect(updateReceipt).toHaveBeenCalledWith({
      id: 'r-1',
      userId: 'user-1',
      merchantName: 'X',
    });

    const keys = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: unknown[] }).queryKey,
    );
    expect(keys).toContainEqual(['activity', 'user-1']);
    expect(keys).toContainEqual(['home', 'user-1']);
    expect(keys).toContainEqual(['insights', 'user-1']);
    expect(keys).toContainEqual(['lhdn', 'user-1']);
    expect(keys).toContainEqual(['rewards', 'user-1']);
    expect(keys).toContainEqual(['receipt', 'r-1']);
  });

  it('surfaces errors when the mutation rejects', async () => {
    const { wrapper } = makeWrapper();
    const updateReceipt = vi.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useUpdateReceipt({ updateReceipt }), {
      wrapper,
    });

    await act(async () => {
      await result.current
        .mutateAsync({ id: 'r-1', merchantName: 'X' })
        .catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useDeleteReceipt', () => {
  it('calls deleteReceipt with userId and invalidates exactly 5 keys (no receipt key)', async () => {
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const deleteReceipt = vi.fn().mockResolvedValue({ id: 'r-1' });

    const { result } = renderHook(() => useDeleteReceipt({ deleteReceipt }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'r-1' });
    });

    expect(deleteReceipt).toHaveBeenCalledWith({ id: 'r-1', userId: 'user-1' });

    const keys = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: unknown[] }).queryKey,
    );
    expect(keys).toContainEqual(['activity', 'user-1']);
    expect(keys).toContainEqual(['home', 'user-1']);
    expect(keys).toContainEqual(['insights', 'user-1']);
    expect(keys).toContainEqual(['lhdn', 'user-1']);
    expect(keys).toContainEqual(['rewards', 'user-1']);
    // Caller is navigating away — receipt detail cache is left alone.
    expect(keys).not.toContainEqual(['receipt', 'r-1']);
    expect(keys).toHaveLength(5);
  });

  it('surfaces errors when the mutation rejects', async () => {
    const { wrapper } = makeWrapper();
    const deleteReceipt = vi.fn().mockRejectedValue(new Error('nope'));

    const { result } = renderHook(() => useDeleteReceipt({ deleteReceipt }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'r-1' }).catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
