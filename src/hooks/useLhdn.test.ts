import { describe, it, expect } from 'vitest';
import {
  categoryToCode,
  categoryToCatIcon,
  recentDateLabel,
  shapeLhdn,
  type ReceiptRow,
  type TaxCategoryRow,
} from '@/lib/supabase/queries/lhdn';

const cats: TaxCategoryRow[] = [
  { id: 'c1', code: 'lifestyle', name: 'Lifestyle', max_relief: '2500.00', tax_year: 2025, sort_order: 1 },
  { id: 'c2', code: 'medical_health', name: 'Medical & Health', max_relief: '10000.00', tax_year: 2025, sort_order: 2 },
  { id: 'c3', code: 'sports', name: 'Sports Equipment', max_relief: '500.00', tax_year: 2025, sort_order: 3 },
  { id: 'c4', code: 'sspn', name: 'SSPN', max_relief: '8000.00', tax_year: 2025, sort_order: 6 },
];

describe('categoryToCode', () => {
  it('maps Malaysian klinik onto medical_health', () => {
    expect(categoryToCode('Klinik Mediviron visit')).toBe('medical_health');
  });
  it('maps book / lifestyle onto lifestyle', () => {
    expect(categoryToCode('Books')).toBe('lifestyle');
    expect(categoryToCode('Lifestyle')).toBe('lifestyle');
  });
  it('maps fitness onto sports', () => {
    expect(categoryToCode('Gym membership')).toBe('sports');
  });
  it('returns null for non-relief categories', () => {
    expect(categoryToCode('Food')).toBeNull();
    expect(categoryToCode(null)).toBeNull();
  });
});

describe('categoryToCatIcon', () => {
  it('falls back to receipt for unknown', () => {
    expect(categoryToCatIcon('Food')).toBe('receipt');
    expect(categoryToCatIcon(null)).toBe('receipt');
  });
  it('matches medical', () => {
    expect(categoryToCatIcon('klinik')).toBe('medical');
  });
});

describe('recentDateLabel', () => {
  const now = new Date('2026-05-01T10:00:00');
  it('returns Today for same-day receipt', () => {
    expect(recentDateLabel('2026-05-01T08:00:00', now)).toBe('Today');
  });
  it('returns Yesterday for 1 day ago', () => {
    expect(recentDateLabel('2026-04-30T08:00:00', now)).toBe('Yesterday');
  });
  it('returns DD MMM for older dates', () => {
    expect(recentDateLabel('2026-04-22T08:00:00', now)).toBe('22 Apr');
  });
});

describe('shapeLhdn', () => {
  it('only surfaces categories with mobile visuals (skips sspn)', () => {
    const out = shapeLhdn(cats, [], new Date('2026-05-01'));
    const ids = out.categories.map((c) => c.id);
    expect(ids).toEqual(['lifestyle', 'medical_health', 'sports']);
    expect(ids).not.toContain('sspn');
  });

  it('aggregates receipt amounts and counts per category', () => {
    const receipts: ReceiptRow[] = [
      { id: 'r1', user_id: 'u', merchant_name: 'Kinokuniya', receipt_date: '2026-05-01', total_amount: '142.00', category: 'Lifestyle', tax_year: 2025, created_at: '2026-05-01T10:00' },
      { id: 'r2', user_id: 'u', merchant_name: 'Klinik Mediviron', receipt_date: '2026-04-30', total_amount: '85.00', category: 'Medical', tax_year: 2025, created_at: '2026-04-30T10:00' },
      { id: 'r3', user_id: 'u', merchant_name: 'Decathlon', receipt_date: '2026-04-22', total_amount: '350.00', category: 'Sports', tax_year: 2025, created_at: '2026-04-22T10:00' },
      { id: 'r4', user_id: 'u', merchant_name: 'Mama\'s Kitchen', receipt_date: '2026-04-30', total_amount: '40.00', category: 'Food', tax_year: 2025, created_at: '2026-04-30T11:00' },
    ];
    const out = shapeLhdn(cats, receipts, new Date('2026-05-01'));
    const lifestyle = out.categories.find((c) => c.id === 'lifestyle')!;
    const medical = out.categories.find((c) => c.id === 'medical_health')!;
    const sports = out.categories.find((c) => c.id === 'sports')!;
    expect(lifestyle).toMatchObject({ used: 142, items: 1, cap: 2500 });
    expect(medical).toMatchObject({ used: 85, items: 1, cap: 10000 });
    expect(sports).toMatchObject({ used: 350, items: 1, cap: 500 });
    // Food receipt should NOT bump any relief.
    const totalUsed = lifestyle.used + medical.used + sports.used;
    expect(totalUsed).toBe(577);
  });

  it('builds recent list (max 5) with formatted date and CatIcon', () => {
    const receipts: ReceiptRow[] = Array.from({ length: 6 }, (_, i) => ({
      id: `r${i}`,
      user_id: 'u',
      merchant_name: `M${i}`,
      receipt_date: '2026-05-01',
      total_amount: '10.00',
      category: 'Lifestyle',
      tax_year: 2025,
      created_at: '2026-05-01T10:00',
    }));
    const out = shapeLhdn(cats, receipts, new Date('2026-05-01'));
    expect(out.recent).toHaveLength(5);
    expect(out.recent[0]).toMatchObject({ name: 'M0', date: 'Today', icon: 'book', amount: 10 });
  });

  it('coerces PostgREST string numerics for cap, max_relief, total_amount', () => {
    const receipts: ReceiptRow[] = [
      { id: 'r1', user_id: 'u', merchant_name: 'X', receipt_date: '2026-05-01', total_amount: '142.18' as unknown as string, category: 'Lifestyle', tax_year: 2025, created_at: '2026-05-01T10:00' },
    ];
    const out = shapeLhdn(cats, receipts, new Date('2026-05-01'));
    expect(out.categories[0].cap).toBe(2500); // number, not '2500.00'
    expect(out.categories[0].used).toBe(142.18);
  });

  it('uses tax_year from first category for taxYear label', () => {
    const out = shapeLhdn(cats, [], new Date('2026-05-01'));
    expect(out.taxYear).toBe('YA 2025');
  });

  it('preserves insight copy from mock fallback', () => {
    const out = shapeLhdn(cats, [], new Date('2026-05-01'));
    expect(out.insightCopy).toContain('unclaimed receipts');
    expect(typeof out.insightHighlightRm).toBe('number');
  });
});
