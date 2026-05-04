import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a chainable mock for the tax_categories chain used by
// fetchActiveTaxCategories:
//   from('tax_categories').select(cols).eq('is_active', true).eq('tax_year', n).order('sort_order', { ascending: true })
// The terminal call (order) resolves to { data, error }.
const orderMock = vi.fn();
const eqYearMock = vi.fn(() => ({ order: orderMock }));
const eqActiveMock = vi.fn(() => ({ eq: eqYearMock }));
const selectMock = vi.fn(() => ({ eq: eqActiveMock }));

const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [string])) },
}));

import { fetchActiveTaxCategories } from './lhdn';

const sampleCatRow = {
  id: 'tc1',
  code: 'lifestyle',
  name: 'Lifestyle',
  max_relief: '2500',
  tax_year: 2026,
  sort_order: 1,
};

beforeEach(() => {
  fromMock.mockClear();
  selectMock.mockClear();
  eqActiveMock.mockClear();
  eqYearMock.mockClear();
  orderMock.mockReset();
});

describe('fetchActiveTaxCategories', () => {
  it('selects active tax_categories for the given year ordered by sort_order', async () => {
    orderMock.mockResolvedValue({ data: [sampleCatRow], error: null });

    const out = await fetchActiveTaxCategories(2026);

    expect(out).toEqual([sampleCatRow]);
    expect(fromMock).toHaveBeenCalledWith('tax_categories');
    expect(selectMock).toHaveBeenCalledWith('id, code, name, max_relief, tax_year, sort_order');
    expect(eqActiveMock).toHaveBeenCalledWith('is_active', true);
    expect(eqYearMock).toHaveBeenCalledWith('tax_year', 2026);
    expect(orderMock).toHaveBeenCalledWith('sort_order', { ascending: true });
  });

  it('throws when supabase returns an error', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'tax_categories denied' } });
    await expect(fetchActiveTaxCategories(2026)).rejects.toMatchObject({
      message: 'tax_categories denied',
    });
  });
});
