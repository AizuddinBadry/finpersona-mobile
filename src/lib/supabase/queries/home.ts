/**
 * Home dashboard query — merges profile, user_points, payment_sources, recent
 * transactions, last-7-day spending receipts, current-YA LHDN totals, and the
 * current-month net flow into the HomeMock shape Phase 2's Home.tsx renders.
 *
 * Stays on `homeMock`:
 *   - insight body/cta (advisor pipeline arrives in Phase 4 — only persona is real)
 *
 * advisor_persona on the profile maps onto the AiPersona union so the AI
 * insight chip header can reflect the user's chosen persona even though the
 * body/CTA are still mock copy.
 *
 * Multi-currency: the DB only tracks MYR (payment_sources.balance), so we emit
 * a single MYR currency pill. Earlier mock-padded SGD/USD entries were removed
 * to avoid showing fake balances in production.
 */
import { supabase } from '@/lib/supabase/client';
import type { CatIconName } from '@/components/CatIcon';
import type { AiPersona, CurrencyBalance, HomeMock, RecentTxn } from '@/mocks/seed';
import { homeMock } from '@/mocks/seed';
import type { MobileTransactionRow } from './activity';
import { categoryToIcon } from './activity';
import { fetchClaimableInsights } from './insights';
import type { ClaimableInsights } from './insights';
import { computeTier } from './rewards';

export type ProfileRow = {
  id: string;
  full_name: string | null;
  advisor_persona: 'analyst' | 'coach' | 'witty' | null;
};

export type UserPointsRow = {
  user_id: string;
  current_balance: string | number;
  lifetime_earned: string | number;
};

export type PaymentSourceBalanceRow = {
  id: string;
  balance: string | number;
};

export type SpendingReceiptRow = {
  id: string;
  total_amount: string | number;
  receipt_date: string; // ISO date
};

export type MonthTxnRow = {
  amount: number;
  occurred_at: string;
};

const RECENT_LIMIT = 4;
const SPENDING_DAYS = 7;
const MYR_FLAG = '\u{1F1F2}\u{1F1FE}';

export function greetingFor(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function initialsFor(fullName: string | null): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

export function personaFor(advisor: ProfileRow['advisor_persona']): AiPersona {
  if (advisor === 'analyst') return 'Analyst';
  if (advisor === 'witty') return 'Witty';
  return 'Coach';
}

function friendlyDay(occurredAt: string, now: Date = new Date()): string {
  const d = new Date(occurredAt);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function shapeRecent(rows: MobileTransactionRow[], now: Date = new Date()): RecentTxn[] {
  return rows.slice(0, RECENT_LIMIT).map((r) => ({
    id: r.id,
    icon: categoryToIcon(r.category) as CatIconName,
    name: r.merchant,
    category: r.category ?? '—',
    amount: r.amount,
    date: friendlyDay(r.occurred_at, now),
    lhdn: r.lhdn_claimable,
  }));
}

/**
 * Local-date YYYY-MM-DD. Used for bucketing receipts by day — toISOString
 * would shift to UTC and cross the date boundary for users west of UTC.
 */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Inclusive 7-day window ending today. Returns the [start, end] dates and the
 * 7 date keys (oldest → newest) used to bucket receipts and emit bar heights.
 */
export function spendingWindow(now: Date = new Date()): {
  startDate: string;
  endDate: string;
  dayKeys: string[];
  dayDates: Date[];
} {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDates: Date[] = [];
  for (let i = SPENDING_DAYS - 1; i >= 0; i--) {
    dayDates.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
  }
  const dayKeys = dayDates.map(ymd);
  return {
    startDate: dayKeys[0]!,
    endDate: dayKeys[dayKeys.length - 1]!,
    dayKeys,
    dayDates,
  };
}

/**
 * Sum receipt totals into 7 daily buckets, emit bar heights normalised to the
 * largest bucket (0-100), and pick 3 axis labels (first / middle / last).
 * If every bucket is zero, bars stay at zero — the chart renders an empty row.
 */
export function shapeSpending(
  rows: SpendingReceiptRow[],
  now: Date = new Date(),
): { spendingTotal: number; spendingBars: number[]; spendingAxis: string[] } {
  const { dayKeys, dayDates } = spendingWindow(now);
  const totals = new Map<string, number>(dayKeys.map((k) => [k, 0]));
  for (const r of rows) {
    if (!totals.has(r.receipt_date)) continue;
    totals.set(r.receipt_date, totals.get(r.receipt_date)! + Number(r.total_amount));
  }
  const dailyAmounts = dayKeys.map((k) => totals.get(k) ?? 0);
  const max = dailyAmounts.reduce((m, v) => Math.max(m, v), 0);
  const spendingBars = dailyAmounts.map((v) =>
    max > 0 ? Math.round((v / max) * 100) : 0,
  );
  const spendingTotal = Math.round(dailyAmounts.reduce((s, v) => s + v, 0));
  const spendingAxis = [
    DAY_NAMES[dayDates[0]!.getDay()]!,
    DAY_NAMES[dayDates[Math.floor((SPENDING_DAYS - 1) / 2)]!.getDay()]!,
    DAY_NAMES[dayDates[SPENDING_DAYS - 1]!.getDay()]!,
  ];
  return { spendingTotal, spendingBars, spendingAxis };
}

/**
 * Project a `ClaimableInsights` (the same payload Insights/Claimable renders)
 * onto the `{ used, cap }` shape the Home mini-donut wants. Reusing the
 * Insights computation guarantees both screens agree on the percentage —
 * earlier divergent math made Home show 35% while Insights showed ~12%.
 */
export function shapeLhdnHome(insights: ClaimableInsights): { used: number; cap: number } {
  return {
    used: Math.round(insights.totalClaimed * 100) / 100,
    cap: Math.round(insights.totalCap * 100) / 100,
  };
}

/**
 * Net flow this calendar month from v_mobile_transactions. Amounts are already
 * signed (outflows negative, inflows positive) so we can sum directly.
 */
export function monthChangeFor(rows: MonthTxnRow[]): number {
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  return Math.round(total * 100) / 100;
}

export type AiInsightRow = { body: string; cta: string } | null;

export function shapeHome(args: {
  profile: ProfileRow | null;
  points: UserPointsRow | null;
  sources: PaymentSourceBalanceRow[];
  recent: MobileTransactionRow[];
  spending: SpendingReceiptRow[];
  claimableInsights: ClaimableInsights;
  monthTxns: MonthTxnRow[];
  aiInsight?: AiInsightRow;
  now?: Date;
}): HomeMock {
  const {
    profile,
    points,
    sources,
    recent,
    spending,
    claimableInsights,
    monthTxns,
    aiInsight = null,
    now = new Date(),
  } = args;

  const fullName = profile?.full_name ?? homeMock.user.name;
  const mainMyr = sources.reduce((s, r) => s + Number(r.balance), 0);
  const roundedMainMyr = Math.round(mainMyr * 100) / 100;

  const spendingShape = shapeSpending(spending, now);
  const lhdnTotals = shapeLhdnHome(claimableInsights);
  const monthChange = monthChangeFor(monthTxns);

  // MYR-only — DB doesn't track foreign-currency balances.
  const currencies: CurrencyBalance[] = [
    { code: 'MYR', amount: roundedMainMyr, flag: MYR_FLAG },
  ];

  return {
    user: {
      greetingPrefix: greetingFor(now),
      name: fullName,
      initials: initialsFor(profile?.full_name ?? null),
      points: points ? Math.round(Number(points.current_balance)) : 0,
    },
    balance: {
      mainMyr: roundedMainMyr,
      monthChange,
      currencies,
    },
    tier: (() => {
      const lifetimeEarned = points ? Math.round(Number(points.lifetime_earned)) : 0;
      const t = computeTier(lifetimeEarned);
      return {
        name: t.name,
        progressPct: t.progressPct,
        nextTier: t.next,
        nextTierGap: t.pointsToNext,
        multiplier: t.nextMultiplier,
      };
    })(),
    insight: {
      persona: personaFor(profile?.advisor_persona ?? null),
      body: aiInsight?.body ?? homeMock.insight.body,
      cta: aiInsight?.cta ?? homeMock.insight.cta,
    },
    spendingTotal: spendingShape.spendingTotal,
    spendingBars: spendingShape.spendingBars,
    spendingAxis: spendingShape.spendingAxis,
    lhdn: lhdnTotals,
    recent: shapeRecent(recent, now),
  };
}

function currentTaxYear(now: Date = new Date()): number {
  return now.getFullYear();
}

function monthBounds(now: Date = new Date()): { startIso: string; endIso: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function fetchHome(userId: string, now: Date = new Date()): Promise<HomeMock> {
  const { startDate: spendStart, endDate: spendEnd } = spendingWindow(now);
  const taxYear = currentTaxYear(now);
  const { startIso: monthStart, endIso: monthEnd } = monthBounds(now);

  const [
    profileRes,
    pointsRes,
    sourcesRes,
    recentRes,
    spendingRes,
    claimableInsights,
    monthTxnRes,
    aiInsightRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, advisor_persona')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_points')
      .select('user_id, current_balance, lifetime_earned')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('payment_sources')
      .select('id, balance')
      .eq('user_id', userId),
    supabase
      .from('v_mobile_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from('receipts')
      .select('id, total_amount, receipt_date')
      .eq('user_id', userId)
      .gte('receipt_date', spendStart)
      .lte('receipt_date', spendEnd),
    // Reuse the same payload Insights/Claimable renders so the Home donut and
    // the Insights screen always agree on totalCap / totalClaimed.
    fetchClaimableInsights(userId, taxYear),
    supabase
      .from('v_mobile_transactions')
      .select('amount, occurred_at')
      .eq('user_id', userId)
      .gte('occurred_at', monthStart)
      .lt('occurred_at', monthEnd),
    supabase
      .from('ai_insights')
      .select('body, cta')
      .eq('user_id', userId)
      .order('week_of', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (pointsRes.error) throw pointsRes.error;
  if (sourcesRes.error) throw sourcesRes.error;
  if (recentRes.error) throw recentRes.error;
  if (spendingRes.error) throw spendingRes.error;
  if (monthTxnRes.error) throw monthTxnRes.error;

  return shapeHome({
    profile: (profileRes.data ?? null) as ProfileRow | null,
    points: (pointsRes.data ?? null) as UserPointsRow | null,
    sources: (sourcesRes.data ?? []) as PaymentSourceBalanceRow[],
    recent: (recentRes.data ?? []) as MobileTransactionRow[],
    spending: (spendingRes.data ?? []) as SpendingReceiptRow[],
    claimableInsights,
    monthTxns: (monthTxnRes.data ?? []) as MonthTxnRow[],
    aiInsight: (aiInsightRes.data ?? null) as AiInsightRow,
    now,
  });
}
