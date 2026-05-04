/**
 * Insights screen query — aggregates receipts month-over-month into the
 * InsightsMock shape Phase 2's Insights.tsx renders. Only the Month period
 * is wired live; Week/Year still toggle UI only and fall back to the same
 * Month aggregation for now (Phase 4 will add range-aware queries).
 *
 * Stays on insightsMock:
 *   - bezier path strings (chart shape — no time-series data layer yet to
 *     re-derive these from)
 *   - axis labels (need point-bucket math to regenerate)
 *   - forecast (AI output — not stored anywhere yet)
 */
import { supabase } from '@/lib/supabase/client';
import type {
  ClaimableCategory,
  ClaimableIconName,
  ClaimableInsights,
  InsightsCategory,
  InsightsMock,
} from '@/mocks/seed';
import { claimableInsightsMock, insightsMock } from '@/mocks/seed';
import {
  categoryToCode,
  fetchActiveTaxCategories,
} from '@/lib/supabase/queries/lhdn';

// Re-export so callers can import these from the query module if they prefer
// (matches how InsightsCategory / InsightsMock are co-located).
export type { ClaimableCategory, ClaimableIconName, ClaimableInsights };

export type InsightsReceiptRow = {
  id: string;
  user_id: string;
  total_amount: string | number;
  category: string | null;
  receipt_date: string;
};

// Category → display label + color. Falls back to a neutral purple when an
// unknown category surfaces (e.g. user-defined free-text).
const CATEGORY_VISUALS: Record<string, { label: string; color: string }> = {
  food: { label: 'Dining', color: '#D97636' },
  dining: { label: 'Dining', color: '#D97636' },
  restaurant: { label: 'Dining', color: '#D97636' },
  transport: { label: 'Transport', color: '#1E80B5' },
  fuel: { label: 'Transport', color: '#1E80B5' },
  shopping: { label: 'Shopping', color: '#6E4CE6' },
  apparel: { label: 'Shopping', color: '#6E4CE6' },
  bills: { label: 'Bills', color: '#1FB573' },
  utilities: { label: 'Bills', color: '#1FB573' },
  utility: { label: 'Bills', color: '#1FB573' },
  coffee: { label: 'Coffee', color: '#956B3F' },
  cafe: { label: 'Coffee', color: '#956B3F' },
  medical: { label: 'Medical', color: '#D63440' },
  health: { label: 'Medical', color: '#D63440' },
  lifestyle: { label: 'Lifestyle', color: '#5837C9' },
  books: { label: 'Lifestyle', color: '#5837C9' },
};

/**
 * Map a free-text receipts.category onto a stable bucket id + label + color.
 * Returns null when the category should be hidden from the breakdown
 * (e.g. truly unknown — keeps the chart focused on the top 5 known buckets).
 */
function bucketFor(category: string | null): { id: string; label: string; color: string } | null {
  if (!category) return null;
  const c = category.toLowerCase();
  // Direct keyword match first.
  for (const key of Object.keys(CATEGORY_VISUALS)) {
    if (c.includes(key)) {
      const v = CATEGORY_VISUALS[key];
      return { id: v.label.toLowerCase(), label: v.label, color: v.color };
    }
  }
  return null;
}

export function monthRange(now: Date = new Date()): {
  monthStart: string;
  monthEnd: string;
  prevStart: string;
  prevEnd: string;
  monthLabel: string;
  prevLabel: string;
} {
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 1);
  const prevStart = new Date(y, m - 1, 1);
  const prevEnd = monthStart;
  // Format in local time — toISOString() would shift to UTC and break the
  // 1st-of-month boundary for users west of UTC.
  const fmt = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };
  const labelFmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long' });
  return {
    monthStart: fmt(monthStart),
    monthEnd: fmt(monthEnd),
    prevStart: fmt(prevStart),
    prevEnd: fmt(prevEnd),
    monthLabel: labelFmt(monthStart),
    prevLabel: labelFmt(prevStart),
  };
}

export function shapeInsights(args: {
  current: InsightsReceiptRow[];
  previous: InsightsReceiptRow[];
  monthLabel: string;
  prevLabel: string;
}): InsightsMock {
  const { current, previous, monthLabel, prevLabel } = args;

  const sum = (rs: InsightsReceiptRow[]) =>
    rs.reduce((s, r) => s + Number(r.total_amount), 0);

  const totalRm = Math.round(sum(current));
  const prevTotalRm = Math.round(sum(previous));
  const deltaPct = prevTotalRm > 0
    ? Math.round(((totalRm - prevTotalRm) / prevTotalRm) * 100)
    : 0;

  // Aggregate current-month spend per visual bucket.
  const buckets = new Map<string, { label: string; color: string; amount: number }>();
  for (const r of current) {
    const b = bucketFor(r.category);
    if (!b) continue;
    const prev = buckets.get(b.id) ?? { label: b.label, color: b.color, amount: 0 };
    prev.amount += Number(r.total_amount);
    buckets.set(b.id, prev);
  }

  // Top 5 buckets by amount; pct is relative to the largest.
  const sorted = [...buckets.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5);
  const max = sorted[0]?.[1].amount ?? 0;
  const categories: InsightsCategory[] = sorted.map(([id, v]) => ({
    id,
    label: v.label,
    amount: Math.round(v.amount),
    pct: max > 0 ? Math.round((v.amount / max) * 100) : 0,
    color: v.color,
  }));

  return {
    period: 'Month',
    monthLabel,
    totalRm,
    deltaPct,
    prevTotalRm,
    prevLabel,
    // Chart geometry stays on the mock — no time-series engine yet.
    axis: insightsMock.axis,
    pathCurrent: insightsMock.pathCurrent,
    pathPrevious: insightsMock.pathPrevious,
    areaCurrent: insightsMock.areaCurrent,
    areaPrevious: insightsMock.areaPrevious,
    categories: categories.length > 0 ? categories : insightsMock.categories,
    forecast: insightsMock.forecast,
  };
}

// ─── Claimable insights ──────────────────────────────────────────────────────
//
// Powers the new Claimable tab on /insights. Aggregates is_claimable receipts
// in the current tax year against the active tax_categories caps so the donut
// can render headroom + per-category utilization. Receipts that don't bucket
// via categoryToCode (free-text → tax_categories.code) end up in a synthetic
// "Other claimable" row so the totals stay honest.

// Maps tax_categories.code → donut color + icon. Codes not present here fall
// back to a neutral purple receipt — same shape as lhdn.ts's CATEGORY_VISUALS,
// but a separate table because the Claimable donut wants a brighter palette
// than the LHDN screen tiles.
const CLAIMABLE_VISUALS: Record<string, { color: string; icon: ClaimableIconName }> = {
  lifestyle: { color: '#D97636', icon: 'book' },
  medical_health: { color: '#1F8B7E', icon: 'medical' },
  sports: { color: '#3F7CC8', icon: 'pulse' },
  internet: { color: '#5837C9', icon: 'flash' },
  education: { color: '#7C3AED', icon: 'star' },
};

function visualFor(code: string): { color: string; icon: ClaimableIconName } {
  return CLAIMABLE_VISUALS[code] ?? { color: '#6B5BFF', icon: 'receipt' };
}

type ClaimableReceiptRow = {
  id: string;
  total_amount: string | number;
  category: string | null;
  receipt_date: string;
};

export async function fetchClaimableInsights(
  userId: string,
  taxYear: number,
): Promise<ClaimableInsights> {
  const start = `${taxYear}-01-01`;
  const end = `${taxYear}-12-31`;

  const [categoryRows, recRes] = await Promise.all([
    fetchActiveTaxCategories(taxYear),
    supabase
      .from('receipts')
      .select('id, total_amount, category, receipt_date')
      .eq('user_id', userId)
      .eq('is_claimable', true)
      .gte('receipt_date', start)
      .lte('receipt_date', end),
  ]);
  if (recRes.error) throw recRes.error;

  if (categoryRows.length === 0) {
    // tax_categories not seeded for this year (e.g. mid-rollover before the
    // new YA is populated) — fall back to mock so the donut still renders
    // demo data instead of an empty fallback ring. Mirrors fetchLhdn.
    return claimableInsightsMock;
  }

  const receipts = (recRes.data ?? []) as ClaimableReceiptRow[];

  // Bucket receipts by tax_categories.code; receipts that don't bucket fall
  // into the synthetic Other claimable row so totals stay honest.
  const validCodes = new Set(categoryRows.map((c) => c.code));
  const claimedByCode = new Map<string, number>();
  let otherClaimed = 0;
  for (const r of receipts) {
    const code = categoryToCode(r.category);
    const amount = Number(r.total_amount);
    if (code && validCodes.has(code)) {
      claimedByCode.set(code, (claimedByCode.get(code) ?? 0) + amount);
    } else {
      otherClaimed += amount;
    }
  }

  // Build cap-list-derived entries, then sort by pct desc.
  const capEntries: ClaimableCategory[] = categoryRows.map((row) => {
    const cap = Number(row.max_relief);
    const claimed = claimedByCode.get(row.code) ?? 0;
    const pct = cap > 0 ? Math.min(claimed / cap, 1) : 0;
    const visual = visualFor(row.code);
    return {
      code: row.code,
      name: row.name,
      cap,
      claimed,
      pct,
      color: visual.color,
      icon: visual.icon,
    };
  });
  capEntries.sort((a, b) => b.pct - a.pct);

  // Append the Other claimable trailer ONLY if it has spend — and always
  // last, never sorted into the middle (the donut depends on this).
  const categories: ClaimableCategory[] = [...capEntries];
  if (otherClaimed > 0) {
    categories.push({
      code: 'other-claimable',
      name: 'Other claimable',
      cap: 0,
      claimed: otherClaimed,
      pct: 0,
      color: '#A0A0B6',
      icon: 'receipt',
    });
  }

  // totalCap excludes Other (cap 0 anyway); totalClaimed includes everything.
  const totalCap = capEntries.reduce((s, c) => s + c.cap, 0);
  const totalClaimed = categories.reduce((s, c) => s + c.claimed, 0);
  const headroom = Math.max(totalCap - totalClaimed, 0);
  // categoryCount: only entries with headroom > 0 — fully-utilized rows
  // and the cap-0 Other trailer don't count toward "still claimable" UI.
  const categoryCount = categories.filter((c) => c.cap - c.claimed > 0).length;

  return {
    totalCap,
    totalClaimed,
    headroom,
    categoryCount,
    categories,
  };
}

export async function fetchInsights(userId: string, now: Date = new Date()): Promise<InsightsMock> {
  const range = monthRange(now);
  const [curRes, prevRes] = await Promise.all([
    supabase
      .from('receipts')
      .select('id, user_id, total_amount, category, receipt_date')
      .eq('user_id', userId)
      .gte('receipt_date', range.monthStart)
      .lt('receipt_date', range.monthEnd),
    supabase
      .from('receipts')
      .select('id, user_id, total_amount, category, receipt_date')
      .eq('user_id', userId)
      .gte('receipt_date', range.prevStart)
      .lt('receipt_date', range.prevEnd),
  ]);
  if (curRes.error) throw curRes.error;
  if (prevRes.error) throw prevRes.error;

  return shapeInsights({
    current: (curRes.data ?? []) as InsightsReceiptRow[],
    previous: (prevRes.data ?? []) as InsightsReceiptRow[],
    monthLabel: range.monthLabel,
    prevLabel: range.prevLabel,
  });
}
