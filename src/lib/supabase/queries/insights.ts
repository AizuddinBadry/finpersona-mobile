/**
 * Insights screen query — aggregates receipts month-over-month into the
 * InsightsMock shape Phase 2's Insights.tsx renders. Only the Month period
 * is wired live; Week/Year still toggle UI only and fall back to the same
 * Month aggregation for now (Phase 4 will add range-aware queries).
 *
 * Chart paths are now derived from real cumulative daily spend data via
 * buildChartPaths. The mock bezier fallback is only used as a loading
 * placeholder before the first fetch resolves.
 */
import { supabase } from '@/lib/supabase/client';
import type {
  ClaimableCategory,
  ClaimableIconName,
  ClaimableInsights,
  InsightsCategory,
  InsightsMock,
} from '@/mocks/seed';
import { insightsMock } from '@/mocks/seed';
import {
  categoryToCode,
  fetchActiveTaxCategories,
} from '@/lib/supabase/queries/lhdn';

// Re-export so callers can import these from the query module if they prefer
// (matches how InsightsCategory / InsightsMock are co-located).
export type { ClaimableCategory, ClaimableIconName, ClaimableInsights };

/**
 * Caps at or above this threshold are treated as "unlimited" (e.g. zakat is
 * seeded with max_relief = 999999 to mean "no cap"). Unlimited reliefs are
 * excluded from the headline `totalCap` / `headroom` math and from the donut
 * weighting so they don't drown out finite-cap segments. The Insights screen
 * also reads this to decide whether to render the cap on a row.
 */
export const UNLIMITED_CAP_THRESHOLD = 100_000;
export const isUnlimitedCap = (cap: number) => cap >= UNLIMITED_CAP_THRESHOLD;

export type InsightsReceiptRow = {
  id: string;
  user_id: string;
  total_amount: string | number;
  category: string | null;
  receipt_date: string;
};

export type ReceiptListItem = {
  id: string;
  merchant_name: string;
  total_amount: number;
  category: string | null;
  receipt_date: string;
};

const CATEGORY_RECEIPT_LIMIT = 10;
export const RECEIPTS_PAGE_SIZE = 10;

// Category → display label + color. Expanded to cover more common keywords so
// more receipts bucket correctly instead of falling through to null.
const CATEGORY_VISUALS: Record<string, { label: string; color: string }> = {
  food: { label: 'Dining', color: '#D97636' },
  dining: { label: 'Dining', color: '#D97636' },
  restaurant: { label: 'Dining', color: '#D97636' },
  makan: { label: 'Dining', color: '#D97636' },
  nasi: { label: 'Dining', color: '#D97636' },
  mamak: { label: 'Dining', color: '#D97636' },
  grocery: { label: 'Groceries', color: '#16A34A' },
  groceries: { label: 'Groceries', color: '#16A34A' },
  supermarket: { label: 'Groceries', color: '#16A34A' },
  market: { label: 'Groceries', color: '#16A34A' },
  transport: { label: 'Transport', color: '#1E80B5' },
  fuel: { label: 'Transport', color: '#1E80B5' },
  petrol: { label: 'Transport', color: '#1E80B5' },
  parking: { label: 'Transport', color: '#1E80B5' },
  grab: { label: 'Transport', color: '#1E80B5' },
  ride: { label: 'Transport', color: '#1E80B5' },
  taxi: { label: 'Transport', color: '#1E80B5' },
  shopping: { label: 'Shopping', color: '#6E4CE6' },
  apparel: { label: 'Shopping', color: '#6E4CE6' },
  cloth: { label: 'Shopping', color: '#6E4CE6' },
  fashion: { label: 'Shopping', color: '#6E4CE6' },
  retail: { label: 'Shopping', color: '#6E4CE6' },
  bills: { label: 'Bills', color: '#1FB573' },
  utilities: { label: 'Bills', color: '#1FB573' },
  utility: { label: 'Bills', color: '#1FB573' },
  electric: { label: 'Bills', color: '#1FB573' },
  water: { label: 'Bills', color: '#1FB573' },
  telco: { label: 'Bills', color: '#1FB573' },
  phone: { label: 'Bills', color: '#1FB573' },
  internet: { label: 'Bills', color: '#1FB573' },
  coffee: { label: 'Coffee', color: '#956B3F' },
  cafe: { label: 'Coffee', color: '#956B3F' },
  entertainment: { label: 'Entertainment', color: '#B45309' },
  movie: { label: 'Entertainment', color: '#B45309' },
  cinema: { label: 'Entertainment', color: '#B45309' },
  game: { label: 'Entertainment', color: '#B45309' },
  streaming: { label: 'Entertainment', color: '#B45309' },
  medical: { label: 'Medical', color: '#D63440' },
  health: { label: 'Medical', color: '#D63440' },
  clinic: { label: 'Medical', color: '#D63440' },
  pharmacy: { label: 'Medical', color: '#D63440' },
  lifestyle: { label: 'Lifestyle', color: '#5837C9' },
  books: { label: 'Lifestyle', color: '#5837C9' },
  sport: { label: 'Lifestyle', color: '#5837C9' },
  gym: { label: 'Lifestyle', color: '#5837C9' },
  education: { label: 'Education', color: '#0EA5E9' },
  course: { label: 'Education', color: '#0EA5E9' },
  tuition: { label: 'Education', color: '#0EA5E9' },
  travel: { label: 'Travel', color: '#3F7CC8' },
  hotel: { label: 'Travel', color: '#3F7CC8' },
  flight: { label: 'Travel', color: '#3F7CC8' },
  accommodation: { label: 'Travel', color: '#3F7CC8' },
};

/**
 * Map a free-text receipts.category onto a stable bucket id + label + color.
 * Returns null when the category doesn't match any known keyword.
 */
function bucketFor(category: string | null): { id: string; label: string; color: string } | null {
  if (!category) return null;
  const c = category.toLowerCase();
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

// SVG canvas constants for the spending chart.
const CHART_W = 320;
const CHART_H = 130;
const CHART_PAD_Y = 12;
const CHART_SAMPLES = 8; // number of evenly-spaced data points to plot

/**
 * Build smooth SVG cubic-bezier path strings from raw receipt rows.
 * Groups receipts by calendar day, computes cumulative spend, samples into
 * CHART_SAMPLES points and generates the path + area fill strings.
 */
export function buildChartPaths(
  current: InsightsReceiptRow[],
  previous: InsightsReceiptRow[],
  monthStart: string,
  prevMonthStart: string,
): Pick<InsightsMock, 'pathCurrent' | 'pathPrevious' | 'areaCurrent' | 'areaPrevious' | 'axis'> {
  const daysInMonth = (start: string) => {
    const y = +start.slice(0, 4);
    const m = +start.slice(5, 7) - 1;
    return new Date(y, m + 1, 0).getDate();
  };

  const cumulative = (rows: InsightsReceiptRow[], start: string): number[] => {
    const days = daysInMonth(start);
    const daily = new Array<number>(days).fill(0);
    for (const r of rows) {
      const d = new Date(r.receipt_date).getDate() - 1; // 0-indexed
      if (d >= 0 && d < days) daily[d] += Number(r.total_amount);
    }
    let acc = 0;
    return daily.map((v) => (acc += v));
  };

  const curCum = cumulative(current, monthStart);
  const prevCum = cumulative(previous, prevMonthStart);

  // Sample CHART_SAMPLES evenly-spaced indices.
  const sample = (arr: number[]): number[] => {
    if (arr.length === 0) return new Array(CHART_SAMPLES).fill(0);
    const result: number[] = [];
    for (let i = 0; i < CHART_SAMPLES; i++) {
      const idx = Math.round((i / (CHART_SAMPLES - 1)) * (arr.length - 1));
      result.push(arr[idx]);
    }
    return result;
  };

  const curPts = sample(curCum);
  const prevPts = sample(prevCum);
  const maxVal = Math.max(...curPts, ...prevPts, 1);

  const toX = (i: number) => (i / (CHART_SAMPLES - 1)) * CHART_W;
  const toY = (v: number) =>
    CHART_H - CHART_PAD_Y - ((v / maxVal) * (CHART_H - 2 * CHART_PAD_Y));

  // Generate a smooth cubic bezier through the sampled points.
  const makePath = (pts: number[]): string => {
    const coords = pts.map((v, i) => ({ x: toX(i), y: toY(v) }));
    let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const cp1x = coords[i - 1].x + (coords[i].x - coords[i - 1].x) / 3;
      const cp2x = coords[i].x - (coords[i].x - coords[i - 1].x) / 3;
      d += ` C${cp1x.toFixed(1)},${coords[i - 1].y.toFixed(1)} ${cp2x.toFixed(1)},${coords[i].y.toFixed(1)} ${coords[i].x.toFixed(1)},${coords[i].y.toFixed(1)}`;
    }
    return d;
  };

  const pathCurrent = makePath(curPts);
  const pathPrevious = makePath(prevPts);
  const areaCurrent = `${pathCurrent} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const areaPrevious = `${pathPrevious} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;

  // Axis: derive ~5 evenly-spaced day labels from monthStart.
  const year = +monthStart.slice(0, 4);
  const month = +monthStart.slice(5, 7) - 1;
  const totalDays = daysInMonth(monthStart);
  const axisIndices = [0, Math.round(totalDays * 0.25), Math.round(totalDays * 0.5), Math.round(totalDays * 0.75), totalDays - 1];
  const axis = axisIndices.map((d) => {
    const date = new Date(year, month, d + 1);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  });

  return { pathCurrent, pathPrevious, areaCurrent, areaPrevious, axis };
}

export function shapeInsights(args: {
  current: InsightsReceiptRow[];
  previous: InsightsReceiptRow[];
  monthLabel: string;
  prevLabel: string;
  monthStart?: string;
  prevMonthStart?: string;
}): InsightsMock {
  const range = monthRange();
  const {
    current,
    previous,
    monthLabel,
    prevLabel,
    monthStart = range.monthStart,
    prevMonthStart = range.prevStart,
  } = args;

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

  // Build real chart paths from the receipt data.
  const chartPaths = buildChartPaths(current, previous, monthStart, prevMonthStart);

  return {
    period: 'Month',
    monthLabel,
    totalRm,
    deltaPct,
    prevTotalRm,
    prevLabel,
    ...chartPaths,
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

// Maps tax_categories.code → donut color + icon. Covers every code present in
// the DB seed (migrations 005 + 009) so non-LHDN-tile reliefs (zakat, sspn,
// insurance_epf, domestic_travel, ev_charging, childcare, breastfeeding,
// disabled_equipment, uncategorized) still render with a distinct icon and
// colour instead of all collapsing onto the same purple receipt fallback.
//
// `internet` is intentionally NOT here — the DB has no such code; internet
// subscriptions live under `lifestyle` per the seed description, so receipts
// matching internet/broadband/unifi/streamyx are bucketed there.
const CLAIMABLE_VISUALS: Record<string, { color: string; icon: ClaimableIconName }> = {
  zakat: { color: '#E89B2A', icon: 'gift' },
  medical_health: { color: '#D63440', icon: 'medical' },
  lifestyle: { color: '#6E4CE6', icon: 'book' },
  education: { color: '#1E80B5', icon: 'star' },
  sports: { color: '#1FB573', icon: 'pulse' },
  childcare: { color: '#D97636', icon: 'home2' },
  sspn: { color: '#5837C9', icon: 'bank' },
  insurance_epf: { color: '#1F8B7E', icon: 'shield' },
  domestic_travel: { color: '#3F7CC8', icon: 'car' },
  ev_charging: { color: '#7C3AED', icon: 'flash' },
  breastfeeding: { color: '#DB6CA7', icon: 'gift' },
  disabled_equipment: { color: '#956B3F', icon: 'shield' },
  uncategorized: { color: '#A0A0B6', icon: 'receipt' },
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

  // Real-data only: if tax_categories isn't seeded for this year we render an
  // empty ClaimableInsights (totals zero, categories empty) rather than mock
  // demo data — mock fallbacks were masking real data issues in production.
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

  // totalCap excludes Other (cap 0) AND unlimited reliefs (e.g. zakat at
  // 999999) — including those would inflate the headline headroom by ~1M and
  // drown out every other segment in the donut. Unlimited claimed amounts
  // still flow into totalClaimed since the user has indeed claimed that money.
  const totalCap = capEntries
    .filter((c) => !isUnlimitedCap(c.cap))
    .reduce((s, c) => s + c.cap, 0);
  const totalClaimed = categories.reduce((s, c) => s + c.claimed, 0);
  const headroom = Math.max(totalCap - totalClaimed, 0);
  // categoryCount: entries with finite cap and headroom > 0. Fully-utilized
  // rows, the cap-0 Other trailer, and unlimited reliefs all drop out — the
  // metric tracks "still has measurable headroom".
  const categoryCount = categories.filter(
    (c) => !isUnlimitedCap(c.cap) && c.cap - c.claimed > 0,
  ).length;

  return {
    totalCap,
    totalClaimed,
    headroom,
    categoryCount,
    categories,
  };
}

/**
 * Fetch claimable receipts for a specific LHDN category code. Client-side
 * filters via categoryToCode since receipts.category is free-text, not a FK.
 * 'other-claimable' matches receipts that don't map to any known code.
 */
export async function fetchReceiptsForCode(
  userId: string,
  taxYear: number,
  code: string,
): Promise<ReceiptListItem[]> {
  const start = `${taxYear}-01-01`;
  const end = `${taxYear}-12-31`;
  const { data, error } = await supabase
    .from('receipts')
    .select('id, merchant_name, total_amount, category, receipt_date')
    .eq('user_id', userId)
    .eq('is_claimable', true)
    .gte('receipt_date', start)
    .lte('receipt_date', end)
    .order('receipt_date', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ReceiptListItem[];
  if (code === 'other-claimable') {
    return rows.filter((r) => categoryToCode(r.category) === null).slice(0, CATEGORY_RECEIPT_LIMIT);
  }
  return rows.filter((r) => categoryToCode(r.category) === code).slice(0, CATEGORY_RECEIPT_LIMIT);
}

/**
 * Paginated list of claimable receipts for the tax year, with optional
 * merchant_name search. Sorted receipt_date descending.
 */
export async function fetchClaimableReceiptsPage(
  userId: string,
  taxYear: number,
  page: number,
  search = '',
  pageSize = RECEIPTS_PAGE_SIZE,
): Promise<{ rows: ReceiptListItem[]; totalCount: number }> {
  const start = `${taxYear}-01-01`;
  const end = `${taxYear}-12-31`;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from('receipts')
    .select('id, merchant_name, total_amount, category, receipt_date', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_claimable', true)
    .gte('receipt_date', start)
    .lte('receipt_date', end)
    .order('receipt_date', { ascending: false })
    .range(from, to);
  if (search.trim()) {
    query = query.ilike('merchant_name', `%${search.trim()}%`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: (data ?? []) as ReceiptListItem[],
    totalCount: count ?? 0,
  };
}

/**
 * Paginated list of ALL receipts for the current month (no is_claimable
 * filter), with optional merchant_name search. Used by the All spend tab.
 */
export async function fetchAllReceiptsPage(
  userId: string,
  monthStart: string,
  monthEnd: string,
  page: number,
  search = '',
  pageSize = RECEIPTS_PAGE_SIZE,
): Promise<{ rows: ReceiptListItem[]; totalCount: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from('receipts')
    .select('id, merchant_name, total_amount, category, receipt_date', { count: 'exact' })
    .eq('user_id', userId)
    .gte('receipt_date', monthStart)
    .lt('receipt_date', monthEnd)
    .order('receipt_date', { ascending: false })
    .range(from, to);
  if (search.trim()) {
    query = query.ilike('merchant_name', `%${search.trim()}%`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: (data ?? []) as ReceiptListItem[],
    totalCount: count ?? 0,
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
    monthStart: range.monthStart,
    prevMonthStart: range.prevStart,
  });
}
