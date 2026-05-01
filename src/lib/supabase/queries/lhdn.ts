/**
 * LHDN screen query — pulls tax_categories (public, year-filtered) and the
 * user's receipts for the same tax year, then aggregates spend per category
 * to fill the LhdnMock shape Phase 2's Lhdn.tsx renders.
 *
 * The DB tax_categories.icon column holds Lucide names ('Heart', 'Smartphone')
 * which don't match the small LhdnIconName palette the screen uses. So we map
 * categories to icons / colors / mobile-friendly names client-side via
 * CATEGORY_VISUALS keyed on tax_categories.code.
 *
 * categoryToCode handles the receipt → tax_category bridge: receipts.category
 * is a free-text field (lifestyle / medical / sports / klinik / etc.), not a
 * foreign key, so we keyword-match it onto the closest tax_categories.code.
 *
 * insightCopy / insightHighlightRm stay from lhdnMock — those are AI-generated
 * fixtures and don't have a backing table yet (Phase 4 will plug in the
 * advisor pipeline).
 */
import { supabase } from '@/lib/supabase/client';
import type { CatIconName } from '@/components/CatIcon';
import type { LhdnCategory, LhdnIconName, LhdnMock, LhdnRecentTag } from '@/mocks/seed';
import { lhdnMock } from '@/mocks/seed';

export type TaxCategoryRow = {
  id: string;
  code: string;
  name: string;
  max_relief: string | number; // PostgREST returns numeric as string
  tax_year: number;
  sort_order: number | null;
};

export type ReceiptRow = {
  id: string;
  user_id: string;
  merchant_name: string;
  receipt_date: string; // ISO date
  total_amount: string | number;
  category: string | null;
  tax_year: number;
  created_at: string;
};

type Visual = { icon: LhdnIconName; color: string; displayName?: string };

// Maps tax_categories.code → screen palette. Codes not listed here are skipped
// from the categories list (they exist in the DB but the mobile screen only
// surfaces the 5 most-used reliefs; the full list lives in the web app).
const CATEGORY_VISUALS: Record<string, Visual> = {
  lifestyle: { icon: 'book', color: '#6E4CE6' },
  medical_health: { icon: 'medical', color: '#D63440', displayName: 'Medical (self & family)' },
  sports: { icon: 'pulse', color: '#1FB573', displayName: 'Sports equipment' },
  internet: { icon: 'flash', color: '#1E80B5', displayName: 'Internet subscription' },
  education: { icon: 'star', color: '#E89B2A', displayName: 'Skills & training' },
};

/**
 * Map a free-text receipts.category onto a tax_categories.code. Returns null
 * if the category doesn't fall into any of the surfaced reliefs (e.g. a
 * 'food' receipt — not a relief).
 */
export function categoryToCode(category: string | null): string | null {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c.includes('book') || c.includes('lifestyle') || c.includes('learn')) return 'lifestyle';
  if (
    c.includes('medical') ||
    c.includes('health') ||
    c.includes('clinic') ||
    c.includes('klinik') ||
    c.includes('pharma') ||
    c.includes('dental')
  ) return 'medical_health';
  if (c.includes('sport') || c.includes('gym') || c.includes('fitness')) return 'sports';
  if (c.includes('internet') || c.includes('broadband') || c.includes('unifi') || c.includes('streamyx')) return 'internet';
  if (c.includes('education') || c.includes('course') || c.includes('skill') || c.includes('training')) return 'education';
  return null;
}

/**
 * Pick a CatIcon for a recent-receipt tile. Mirrors the LHDN-leaning subset of
 * the activity categoryToIcon — keeps the recent list visually consistent.
 */
export function categoryToCatIcon(category: string | null): CatIconName {
  if (!category) return 'receipt';
  const c = category.toLowerCase();
  if (c.includes('book') || c.includes('lifestyle')) return 'book';
  if (
    c.includes('medical') ||
    c.includes('health') ||
    c.includes('clinic') ||
    c.includes('klinik') ||
    c.includes('pharma')
  ) return 'medical';
  if (c.includes('sport') || c.includes('gym')) return 'pulse';
  if (c.includes('internet') || c.includes('broadband')) return 'flash';
  if (c.includes('education') || c.includes('course')) return 'star';
  return 'receipt';
}

/**
 * Format a receipt date for the recent list. Today / Yesterday get friendly
 * labels; older dates collapse to 'MMM D' (en-GB) so the chip stays compact.
 */
export function recentDateLabel(receiptDate: string, now: Date = new Date()): string {
  const d = new Date(receiptDate);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const today = startOfDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((today - startOfDay(d)) / dayMs);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function shapeLhdn(
  taxCats: TaxCategoryRow[],
  receipts: ReceiptRow[],
  now: Date = new Date(),
): LhdnMock {
  // Sum receipts per tax_category code.
  const usedByCode = new Map<string, { used: number; items: number }>();
  for (const r of receipts) {
    const code = categoryToCode(r.category);
    if (!code) continue;
    const prev = usedByCode.get(code) ?? { used: 0, items: 0 };
    usedByCode.set(code, {
      used: prev.used + Number(r.total_amount),
      items: prev.items + 1,
    });
  }

  // Build category list in tax_categories.sort_order, but only for codes the
  // mobile screen has visuals for.
  const categories: LhdnCategory[] = [];
  for (const tc of taxCats) {
    const visual = CATEGORY_VISUALS[tc.code];
    if (!visual) continue;
    const totals = usedByCode.get(tc.code) ?? { used: 0, items: 0 };
    categories.push({
      id: tc.code,
      name: visual.displayName ?? tc.name,
      icon: visual.icon,
      cap: Number(tc.max_relief),
      used: Math.round(totals.used * 100) / 100,
      items: totals.items,
      color: visual.color,
    });
  }

  // Recent: latest 5 receipts (already sorted by caller). Round to 2dp.
  const recent: LhdnRecentTag[] = receipts.slice(0, 5).map((r) => ({
    id: r.id,
    name: r.merchant_name,
    category: r.category ?? '—',
    amount: Math.round(Number(r.total_amount) * 100) / 100,
    icon: categoryToCatIcon(r.category),
    date: recentDateLabel(r.receipt_date, now),
  }));

  return {
    taxYear: `YA ${taxCats[0]?.tax_year ?? new Date().getFullYear()}`,
    insightCopy: lhdnMock.insightCopy,
    insightHighlightRm: lhdnMock.insightHighlightRm,
    categories,
    recent,
  };
}

const DEFAULT_TAX_YEAR = 2025;

export async function fetchLhdn(userId: string, taxYear = DEFAULT_TAX_YEAR): Promise<LhdnMock> {
  const [catsRes, recRes] = await Promise.all([
    supabase
      .from('tax_categories')
      .select('id, code, name, max_relief, tax_year, sort_order')
      .eq('tax_year', taxYear)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('receipts')
      .select('id, user_id, merchant_name, receipt_date, total_amount, category, tax_year, created_at')
      .eq('user_id', userId)
      .eq('tax_year', taxYear)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (catsRes.error) throw catsRes.error;
  if (recRes.error) throw recRes.error;

  const taxCats = (catsRes.data ?? []) as TaxCategoryRow[];
  const receipts = (recRes.data ?? []) as ReceiptRow[];

  if (taxCats.length === 0) {
    // Schema not seeded for this year — fall back to mock so the screen still
    // renders something.
    return lhdnMock;
  }

  return shapeLhdn(taxCats, receipts);
}
