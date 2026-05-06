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

// Caps at or above this threshold are treated as "no cap" (Zakat is seeded
// with max_relief = 999999 to mean fully deductible / unlimited).
export const LHDN_UNLIMITED_CAP = 100_000;

type Visual = { icon: LhdnIconName; color: string; displayName?: string };

// Maps every tax_categories.code → mobile palette. All 13 seeded codes are
// covered so shapeLhdn never silently drops a category.
const CATEGORY_VISUALS: Record<string, Visual> = {
  lifestyle:          { icon: 'book',    color: '#6E4CE6' },
  medical_health:     { icon: 'medical', color: '#D63440', displayName: 'Medical (self & family)' },
  sports:             { icon: 'pulse',   color: '#1FB573', displayName: 'Sports equipment' },
  education:          { icon: 'star',    color: '#E89B2A', displayName: 'Skills & training' },
  zakat:              { icon: 'shield',  color: '#1A7F5A' },
  childcare:          { icon: 'home2',   color: '#E8833A' },
  sspn:               { icon: 'bank',    color: '#1E80B5', displayName: 'SSPN savings' },
  insurance_epf:      { icon: 'lock',    color: '#8C5EC5', displayName: 'Insurance & EPF' },
  domestic_travel:    { icon: 'car',     color: '#D97706', displayName: 'Domestic travel' },
  ev_charging:        { icon: 'flash',   color: '#059669', displayName: 'EV charging' },
  breastfeeding:      { icon: 'medical', color: '#DB2777', displayName: 'Breastfeeding equipment' },
  disabled_equipment: { icon: 'shield',  color: '#7A7392', displayName: 'Disabled equipment' },
  uncategorized:      { icon: 'receipt', color: '#A89DC1' },
};

/**
 * Map a free-text receipts.category onto a tax_categories.code. Returns null
 * if the category doesn't fall into any of the seeded LHDN reliefs (e.g. a
 * generic 'food' receipt — not a relief).
 *
 * The seeded codes (migrations 005 + 009) are: zakat, medical_health,
 * lifestyle, education, sports, childcare, sspn, insurance_epf,
 * domestic_travel, ev_charging, breastfeeding, disabled_equipment,
 * uncategorized. Internet subscriptions are part of `lifestyle` per the seed
 * description — there is no `internet` row in the DB, so internet keywords
 * bucket into `lifestyle`.
 *
 * Two-stage matching:
 *   1. Direct code/display-name match: the backend's Claude extraction prompt
 *      asks it to return the literal tax_categories.code (e.g.
 *      'domestic_travel', 'medical_health'), so most live receipts already
 *      carry a valid code. Recognise that exact match first to avoid
 *      substring traps (`'domestic_travel'.includes('domestic travel')` is
 *      false because of the underscore; `'medical_health'` would otherwise
 *      get misrouted by the ordering of the keyword fallthrough).
 *   2. Free-text keyword fallback for legacy / human-entered values.
 *
 * Order in the keyword fallback matters: more specific keywords come first so
 * a phrase like "travel insurance" hits `insurance_epf` rather than
 * `domestic_travel`. Likewise `'transport'.includes('sport')` would otherwise
 * misclassify transport receipts — `domestic_travel` runs before `sports`.
 */
const KNOWN_CODES = new Set([
  'zakat',
  'medical_health',
  'lifestyle',
  'education',
  'sports',
  'childcare',
  'sspn',
  'insurance_epf',
  'domestic_travel',
  'ev_charging',
  'breastfeeding',
  'disabled_equipment',
  'uncategorized',
]);

export function categoryToCode(category: string | null): string | null {
  if (!category) return null;
  const c = category.toLowerCase().trim();

  // Stage 1: receipts whose category is already a literal code (the common
  // case — backend Claude extraction returns codes verbatim).
  // Accept both 'domestic_travel' and 'domestic travel' / 'domestic-travel'
  // by normalising separators to underscore before the set lookup.
  const normalised = c.replace(/[\s-]+/g, '_');
  if (KNOWN_CODES.has(normalised)) {
    // 'uncategorized' is in the DB but isn't a real relief — surface as null
    // so it routes to the Other claimable trailer instead.
    return normalised === 'uncategorized' ? null : normalised;
  }

  // Stage 2: free-text keyword fallback.

  // Zakat — religious obligation, fully deductible.
  if (c.includes('zakat') || c.includes('fitrah')) return 'zakat';

  // Insurance & EPF — runs before travel/sports so 'travel insurance' /
  // 'sports insurance' bucket as insurance, not as the activity.
  if (
    c.includes('insurance') ||
    c.includes('epf') ||
    c.includes('kwsp') ||
    c.includes('takaful') ||
    c.includes('life policy')
  ) return 'insurance_epf';

  // Medical & health.
  if (
    c.includes('medical') ||
    c.includes('health') ||
    c.includes('clinic') ||
    c.includes('klinik') ||
    c.includes('pharma') ||
    c.includes('dental') ||
    c.includes('hospital')
  ) return 'medical_health';

  // SSPN — child education savings.
  if (c.includes('sspn')) return 'sspn';

  // Childcare / kindergarten / daycare.
  if (
    c.includes('childcare') ||
    c.includes('child care') ||
    c.includes('daycare') ||
    c.includes('kindergarten') ||
    c.includes('tadika') ||
    c.includes('nursery')
  ) return 'childcare';

  // Breastfeeding — runs before generic 'baby' / lifestyle.
  if (
    c.includes('breast') ||
    c.includes('lactation') ||
    c.includes('breastfeeding')
  ) return 'breastfeeding';

  // Disabled equipment — wheelchair, hearing aid, etc.
  if (
    c.includes('disabled') ||
    c.includes('disability') ||
    c.includes('wheelchair') ||
    c.includes('hearing aid')
  ) return 'disabled_equipment';

  // EV charging — runs before lifestyle so 'EV charger' doesn't fall through
  // to a generic electronics bucket.
  if (
    c.includes('ev charg') ||
    c.includes('ev-charg') ||
    c.includes('electric vehicle charg') ||
    c.includes('charging station')
  ) return 'ev_charging';

  // Domestic travel — runs BEFORE sports because 'transport'.includes('sport')
  // would otherwise misclassify transport receipts.
  if (
    c.includes('hotel') ||
    c.includes('homestay') ||
    c.includes('domestic travel') ||
    c.includes('domestic tourism') ||
    c.includes('accommodation') ||
    c.includes('resort') ||
    c.includes('transport')
  ) return 'domestic_travel';

  // Sports & fitness.
  if (
    c.includes('sport') ||
    c.includes('gym') ||
    c.includes('fitness')
  ) return 'sports';

  // Education / skills training.
  if (
    c.includes('education') ||
    c.includes('course') ||
    c.includes('skill') ||
    c.includes('training') ||
    c.includes('tuition')
  ) return 'education';

  // Lifestyle — books, electronics, internet subscriptions (DB has no
  // separate `internet` code; the lifestyle row covers them per its seed
  // description). Must run AFTER all the more-specific buckets above.
  if (
    c.includes('book') ||
    c.includes('lifestyle') ||
    c.includes('learn') ||
    c.includes('internet') ||
    c.includes('broadband') ||
    c.includes('unifi') ||
    c.includes('streamyx') ||
    c.includes('smartphone') ||
    c.includes('tablet') ||
    c.includes('computer') ||
    c.includes('laptop')
  ) return 'lifestyle';

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
  // mobile screen has visuals for. Cap is stored as 0 when the DB value
  // signals "unlimited" (≥ LHDN_UNLIMITED_CAP, e.g. Zakat = 999999).
  const categories: LhdnCategory[] = [];
  for (const tc of taxCats) {
    const visual = CATEGORY_VISUALS[tc.code];
    if (!visual) continue;
    const rawCap = Number(tc.max_relief);
    const totals = usedByCode.get(tc.code) ?? { used: 0, items: 0 };
    categories.push({
      id: tc.code,
      name: visual.displayName ?? tc.name,
      icon: visual.icon,
      cap: rawCap >= LHDN_UNLIMITED_CAP ? 0 : rawCap,
      used: Math.round(totals.used * 100) / 100,
      items: totals.items,
      color: visual.color,
    });
  }

  // Dynamic insight: find the capped category with the highest fill ratio
  // that still has headroom, so we can show how close the user is to
  // maximising that relief.
  const capped = categories.filter((c) => c.cap > 0);
  const withHeadroom = capped
    .filter((c) => c.used < c.cap)
    .sort((a, b) => b.used / b.cap - a.used / a.cap);

  let insightCopy: string;
  let insightHighlightRm: number;

  if (withHeadroom.length > 0) {
    const closest = withHeadroom[0];
    const remaining = Math.round((closest.cap - closest.used) * 100) / 100;
    insightHighlightRm = remaining;
    insightCopy = `left to fulfil your ${closest.name} relief`;
  } else if (capped.length > 0) {
    // All capped categories are maxed out.
    const count = capped.filter((c) => c.used >= c.cap).length;
    insightHighlightRm = capped.reduce((s, c) => s + c.cap, 0);
    insightCopy = `Great job! You've maxed out ${count} relief${count > 1 ? 's' : ''}`;
  } else {
    // No capped categories with any activity — show total available headroom.
    insightHighlightRm = capped.reduce((s, c) => s + c.cap, 0);
    insightCopy = `available in tax relief — start adding receipts`;
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
    insightCopy,
    insightHighlightRm,
    categories,
    recent,
  };
}

const DEFAULT_TAX_YEAR = 2025;

/**
 * Read the active tax_categories rows for a given assessment year. Shared by
 * fetchLhdn and the insights-claimable query so the two callers stay in sync
 * on the column list and filter shape.
 */
export async function fetchActiveTaxCategories(taxYear: number): Promise<TaxCategoryRow[]> {
  const { data, error } = await supabase
    .from('tax_categories')
    .select('id, code, name, max_relief, tax_year, sort_order')
    .eq('is_active', true)
    .eq('tax_year', taxYear)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaxCategoryRow[];
}

export async function fetchLhdn(userId: string, taxYear = DEFAULT_TAX_YEAR): Promise<LhdnMock> {
  const [taxCats, recRes] = await Promise.all([
    fetchActiveTaxCategories(taxYear),
    supabase
      .from('receipts')
      .select('id, user_id, merchant_name, receipt_date, total_amount, category, tax_year, created_at')
      .eq('user_id', userId)
      .eq('tax_year', taxYear)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (recRes.error) throw recRes.error;

  const receipts = (recRes.data ?? []) as ReceiptRow[];

  if (taxCats.length === 0) {
    // Schema not seeded for this year — fall back to mock so the screen still
    // renders something.
    return lhdnMock;
  }

  return shapeLhdn(taxCats, receipts);
}

/**
 * Fetch all receipts for a given tax year that map to `code`, client-side
 * filtered via categoryToCode. Returns them sorted newest-first.
 *
 * Client-side filter is necessary because receipts.category is free-text (not
 * a FK), so the DB can't index on a derived code value.
 */
export async function fetchCategoryReceipts(
  userId: string,
  taxYear: number,
  code: string,
): Promise<ReceiptRow[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('id, user_id, merchant_name, receipt_date, total_amount, category, tax_year, created_at')
    .eq('user_id', userId)
    .eq('tax_year', taxYear)
    .order('receipt_date', { ascending: false })
    .limit(500);
  if (error) throw error;
  return ((data ?? []) as ReceiptRow[]).filter(
    (r) => categoryToCode(r.category) === code,
  );
}
