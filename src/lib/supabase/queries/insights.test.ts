import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  monthRange,
  shapeInsights,
  type InsightsReceiptRow,
} from '@/lib/supabase/queries/insights';

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

// ─── fetchClaimableInsights ──────────────────────────────────────────────────
//
// Mocks the `tax_categories` fetch (via lhdn.ts) and the `receipts` fetch
// (via supabase.from('receipts')) independently so we can exercise the
// bucketing / sort / Other-claimable / filter logic with realistic fixtures.

const fetchActiveTaxCategoriesMock = vi.fn();

vi.mock('@/lib/supabase/queries/lhdn', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/supabase/queries/lhdn')>(
      '@/lib/supabase/queries/lhdn',
    );
  return {
    ...actual,
    fetchActiveTaxCategories: (...args: unknown[]) =>
      fetchActiveTaxCategoriesMock(...args),
  };
});

// Receipts query chain:
//   from('receipts').select(cols).eq('user_id', uid).eq('is_claimable', true)
//     .gte('receipt_date', start).lte('receipt_date', end)
// The terminal call (lte) resolves to { data, error }.
const lteRecMock = vi.fn();
const gteRecMock = vi.fn(() => ({ lte: lteRecMock }));
const eqClaimableMock = vi.fn(() => ({ gte: gteRecMock }));
const eqUserMock = vi.fn(() => ({ eq: eqClaimableMock }));
const selectRecMock = vi.fn(() => ({ eq: eqUserMock }));
const fromMock = vi.fn((table: string) => {
  if (table === 'receipts') return { select: selectRecMock };
  // Insights's own per-month fetchInsights also touches 'receipts', but the
  // claimable tests never call fetchInsights, so falling through here is fine.
  throw new Error(`Unexpected supabase.from('${table}') in test`);
});

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [string])) },
}));

import { fetchClaimableInsights } from '@/lib/supabase/queries/insights';

const taxCats2026 = [
  { id: 'tc1', code: 'lifestyle', name: 'Lifestyle', max_relief: '2500', tax_year: 2026, sort_order: 1 },
  { id: 'tc2', code: 'medical_health', name: 'Medical & Health', max_relief: '10000', tax_year: 2026, sort_order: 2 },
  { id: 'tc3', code: 'sports', name: 'Sports Equipment', max_relief: '500', tax_year: 2026, sort_order: 3 },
  { id: 'tc4', code: 'internet', name: 'Internet subscription', max_relief: '2500', tax_year: 2026, sort_order: 4 },
];

beforeEach(() => {
  fetchActiveTaxCategoriesMock.mockReset();
  fromMock.mockClear();
  selectRecMock.mockClear();
  eqUserMock.mockClear();
  eqClaimableMock.mockClear();
  gteRecMock.mockClear();
  lteRecMock.mockReset();
});

describe('fetchClaimableInsights', () => {
  it('aggregates claimed amounts per category from receipts (lifestyle/medical/internet)', async () => {
    fetchActiveTaxCategoriesMock.mockResolvedValue(taxCats2026);
    lteRecMock.mockResolvedValue({
      data: [
        { id: 'r1', total_amount: '142', category: 'Lifestyle', receipt_date: '2026-04-01' },
        { id: 'r2', total_amount: '85', category: 'Klinik Mediviron visit', receipt_date: '2026-04-10' },
        { id: 'r3', total_amount: '100', category: 'Internet broadband', receipt_date: '2026-05-01' },
      ],
      error: null,
    });

    const out = await fetchClaimableInsights('u1', 2026);

    const byCode = Object.fromEntries(out.categories.map((c) => [c.code, c]));
    expect(byCode.lifestyle.claimed).toBe(142);
    expect(byCode.medical_health.claimed).toBe(85);
    expect(byCode.internet.claimed).toBe(100);
    expect(byCode.sports.claimed).toBe(0);
  });

  it('appends an "Other claimable" bucket (cap: 0) at the END when receipts do not bucket', async () => {
    fetchActiveTaxCategoriesMock.mockResolvedValue(taxCats2026);
    lteRecMock.mockResolvedValue({
      data: [
        { id: 'r1', total_amount: '100', category: 'Lifestyle', receipt_date: '2026-04-01' },
        { id: 'r2', total_amount: '50', category: 'Mystery', receipt_date: '2026-04-02' },
        { id: 'r3', total_amount: '25', category: null, receipt_date: '2026-04-03' },
      ],
      error: null,
    });

    const out = await fetchClaimableInsights('u1', 2026);

    const last = out.categories[out.categories.length - 1];
    expect(last.code).toBe('other-claimable');
    expect(last.cap).toBe(0);
    expect(last.claimed).toBe(75); // 50 + 25
    expect(last.pct).toBe(0);
    // Only one Other entry.
    expect(out.categories.filter((c) => c.code === 'other-claimable')).toHaveLength(1);
  });

  it('omits the "Other claimable" bucket when every receipt buckets cleanly', async () => {
    fetchActiveTaxCategoriesMock.mockResolvedValue(taxCats2026);
    lteRecMock.mockResolvedValue({
      data: [
        { id: 'r1', total_amount: '100', category: 'Lifestyle', receipt_date: '2026-04-01' },
        { id: 'r2', total_amount: '50', category: 'Klinik', receipt_date: '2026-04-02' },
      ],
      error: null,
    });

    const out = await fetchClaimableInsights('u1', 2026);

    expect(out.categories.find((c) => c.code === 'other-claimable')).toBeUndefined();
  });

  it('sorts non-Other categories by pct descending', async () => {
    fetchActiveTaxCategoriesMock.mockResolvedValue(taxCats2026);
    lteRecMock.mockResolvedValue({
      data: [
        // sports: 350 / 500 = 0.70  (highest)
        { id: 'r1', total_amount: '350', category: 'Sports', receipt_date: '2026-04-01' },
        // lifestyle: 1250 / 2500 = 0.50
        { id: 'r2', total_amount: '1250', category: 'Lifestyle', receipt_date: '2026-04-02' },
        // internet: 250 / 2500 = 0.10
        { id: 'r3', total_amount: '250', category: 'Internet', receipt_date: '2026-04-03' },
        // medical_health: 0 / 10000 = 0
        // Plus an Other bucket so we can prove it's appended LAST not sorted in.
        { id: 'r4', total_amount: '40', category: 'Mystery', receipt_date: '2026-04-04' },
      ],
      error: null,
    });

    const out = await fetchClaimableInsights('u1', 2026);

    // Strip the Other-claimable trailer and check the cap-list order.
    const codes = out.categories
      .filter((c) => c.code !== 'other-claimable')
      .map((c) => c.code);
    expect(codes).toEqual(['sports', 'lifestyle', 'internet', 'medical_health']);
    // Other claimable trailer present and last.
    expect(out.categories[out.categories.length - 1].code).toBe('other-claimable');
  });

  it('queries receipts with is_claimable=true and the tax-year date window', async () => {
    fetchActiveTaxCategoriesMock.mockResolvedValue(taxCats2026);
    lteRecMock.mockResolvedValue({ data: [], error: null });

    await fetchClaimableInsights('user-xyz', 2026);

    expect(fromMock).toHaveBeenCalledWith('receipts');
    expect(selectRecMock).toHaveBeenCalledWith(
      'id, total_amount, category, receipt_date',
    );
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-xyz');
    expect(eqClaimableMock).toHaveBeenCalledWith('is_claimable', true);
    expect(gteRecMock).toHaveBeenCalledWith('receipt_date', '2026-01-01');
    expect(lteRecMock).toHaveBeenCalledWith('receipt_date', '2026-12-31');
  });

  it('throws when supabase returns an error on the receipts call', async () => {
    fetchActiveTaxCategoriesMock.mockResolvedValue(taxCats2026);
    lteRecMock.mockResolvedValue({
      data: null,
      error: { message: 'receipts denied' },
    });

    await expect(fetchClaimableInsights('u1', 2026)).rejects.toMatchObject({
      message: 'receipts denied',
    });
  });

  it('counts only categories with headroom > 0 in categoryCount (skips fully-utilized)', async () => {
    fetchActiveTaxCategoriesMock.mockResolvedValue(taxCats2026);
    lteRecMock.mockResolvedValue({
      data: [
        // sports fully utilized: 500 / 500 → headroom 0, NOT counted.
        { id: 'r1', total_amount: '500', category: 'Sports', receipt_date: '2026-04-01' },
        // lifestyle partly: 100 / 2500 → headroom 2400, counted.
        { id: 'r2', total_amount: '100', category: 'Lifestyle', receipt_date: '2026-04-02' },
        // medical_health: 0 / 10000 → headroom 10000, counted.
        // internet: 0 / 2500 → headroom 2500, counted.
        // Other claimable: cap 0 → headroom 0, NOT counted.
        { id: 'r3', total_amount: '20', category: 'Mystery', receipt_date: '2026-04-03' },
      ],
      error: null,
    });

    const out = await fetchClaimableInsights('u1', 2026);

    expect(out.categoryCount).toBe(3);
  });

  it('totals are internally consistent (totalCap excludes Other; headroom clamped >= 0)', async () => {
    fetchActiveTaxCategoriesMock.mockResolvedValue(taxCats2026);
    lteRecMock.mockResolvedValue({
      data: [
        // Over-claim sports by a lot: pct should clamp to 1, headroom not negative.
        { id: 'r1', total_amount: '5000', category: 'Sports', receipt_date: '2026-04-01' },
        { id: 'r2', total_amount: '60', category: 'Mystery', receipt_date: '2026-04-02' },
      ],
      error: null,
    });

    const out = await fetchClaimableInsights('u1', 2026);

    // totalCap = 2500 + 10000 + 500 + 2500 = 15500 (Other excluded)
    expect(out.totalCap).toBe(15500);
    // totalClaimed includes Other.
    expect(out.totalClaimed).toBe(5060);
    // headroom = max(15500 - 5060, 0) = 10440
    expect(out.headroom).toBe(10440);
    // sports pct clamped to 1.
    const sports = out.categories.find((c) => c.code === 'sports');
    expect(sports?.pct).toBe(1);
  });
});
