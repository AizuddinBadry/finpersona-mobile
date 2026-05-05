import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chain mocked: from('payment_sources').select(cols).eq('user_id', uid)
//   .order('is_default', { ascending: false }).order('created_at', { ascending: true })
// The terminal .order() resolves to { data, error }.
const orderCreatedMock = vi.fn();
const orderDefaultMock = vi.fn(() => ({ order: orderCreatedMock }));
const eqMock = vi.fn(() => ({ order: orderDefaultMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [string])) },
}));

import { fetchPaymentSources } from './sources';

beforeEach(() => {
  fromMock.mockClear();
  selectMock.mockClear();
  eqMock.mockClear();
  orderDefaultMock.mockClear();
  orderCreatedMock.mockReset();
});

describe('fetchPaymentSources', () => {
  it('queries payment_sources scoped by user_id with the right columns and ordering', async () => {
    orderCreatedMock.mockResolvedValue({ data: [], error: null });

    await fetchPaymentSources('user-1');

    expect(fromMock).toHaveBeenCalledWith('payment_sources');
    expect(selectMock).toHaveBeenCalledWith(
      'id, name, source_type, balance, is_default, created_at',
    );
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(orderDefaultMock).toHaveBeenCalledWith('is_default', { ascending: false });
    expect(orderCreatedMock).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('returns rows reshaped with synthesized last4 and currency', async () => {
    orderCreatedMock.mockResolvedValue({
      data: [
        {
          id: 's1',
          name: 'Maybank Savings',
          source_type: 'bank',
          balance: '1234.56',
          is_default: true,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 's2',
          name: 'Cash Wallet',
          source_type: 'cash',
          balance: '50',
          is_default: false,
          created_at: '2026-02-01T00:00:00Z',
        },
      ],
      error: null,
    });

    const out = await fetchPaymentSources('user-1');

    expect(out).toEqual([
      {
        id: 's1',
        name: 'Maybank Savings',
        last4: '••••',
        balance: 1234.56,
        currency: 'MYR',
        source_type: 'bank',
        is_default: true,
      },
      {
        id: 's2',
        name: 'Cash Wallet',
        last4: '••••',
        balance: 50,
        currency: 'MYR',
        source_type: 'cash',
        is_default: false,
      },
    ]);
  });

  it('preserves the order returned by supabase (default first, then created_at asc)', async () => {
    orderCreatedMock.mockResolvedValue({
      data: [
        {
          id: 'default',
          name: 'Default',
          source_type: 'bank',
          balance: '0',
          is_default: true,
          created_at: '2026-03-01T00:00:00Z',
        },
        {
          id: 'older',
          name: 'Older',
          source_type: 'cash',
          balance: '0',
          is_default: false,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'newer',
          name: 'Newer',
          source_type: 'cash',
          balance: '0',
          is_default: false,
          created_at: '2026-02-01T00:00:00Z',
        },
      ],
      error: null,
    });

    const out = await fetchPaymentSources('user-1');
    expect(out.map((s) => s.id)).toEqual(['default', 'older', 'newer']);
  });

  it('returns an empty array when supabase returns null data', async () => {
    orderCreatedMock.mockResolvedValue({ data: null, error: null });
    const out = await fetchPaymentSources('user-1');
    expect(out).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    orderCreatedMock.mockResolvedValue({
      data: null,
      error: { message: 'rls denied' },
    });
    await expect(fetchPaymentSources('user-1')).rejects.toMatchObject({
      message: 'rls denied',
    });
  });
});
