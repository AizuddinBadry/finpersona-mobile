/**
 * Rewards screen query — pulls user_points scalar and the latest points_transactions
 * (joined to the receipt that triggered each earn) for the recent earnings list,
 * plus a derived "receipts this week" streak count.
 *
 * Stays on rewardsMock:
 *   - tier (no tier-config table yet — Phase 4 will compute from points thresholds)
 *   - multiplier (UI fixture; the actual multiplier is applied DB-side in
 *     points_transactions.multiplier_applied)
 *   - redeem catalog (no reward_catalog table on this project — admin web app
 *     drives that and the mobile screen treats it as a curated visual fixture)
 *   - footnote copy
 *
 * 1 point = RM 0.01 redeemable (matches the Phase 1 product copy).
 */
import { supabase } from '@/lib/supabase/client';
import type { CatIconName } from '@/components/CatIcon';
import type { RewardsMock, RewardsRecent } from '@/mocks/seed';
import { rewardsMock } from '@/mocks/seed';

export type UserPointsScalarRow = {
  user_id: string;
  current_balance: string | number;
  lifetime_earned: string | number;
};

export type EarnTxnRow = {
  id: string;
  user_id: string;
  transaction_type: 'earn_receipt' | 'spend_reward' | 'admin_adjustment';
  points_amount: string | number;
  multiplier_applied: string | number | null;
  description: string | null;
  created_at: string;
  receipt_id: string | null;
  receipts: {
    id: string;
    merchant_name: string;
    category: string | null;
  } | null;
};

const RECENT_LIMIT = 4;
const POINTS_TO_RM = 0.01; // 1 pt = RM 0.01

function categoryToCatIcon(category: string | null): CatIconName {
  if (!category) return 'receipt';
  const c = category.toLowerCase();
  if (c.includes('food') || c.includes('dining')) return 'food';
  if (c.includes('coffee') || c.includes('cafe')) return 'coffee';
  if (c.includes('book') || c.includes('lifestyle')) return 'book';
  if (c.includes('shop') || c.includes('cloth')) return 'bag';
  if (c.includes('transport') || c.includes('fuel') || c.includes('petrol')) return 'car';
  if (c.includes('medical') || c.includes('health') || c.includes('clinic') || c.includes('klinik')) return 'medical';
  if (c.includes('education') || c.includes('course')) return 'star';
  return 'receipt';
}

/**
 * Build the recent earnings list. multiplier_applied > 1 → tag as bonus.
 * Falls back to "+N pts" with a generic Activity label when the receipt join
 * is null (e.g. an admin adjustment that somehow slipped through the filter).
 */
export function shapeRecent(rows: EarnTxnRow[]): RewardsRecent[] {
  return rows.slice(0, RECENT_LIMIT).map((r) => {
    const merchant = r.receipts?.merchant_name ?? r.description ?? 'Activity';
    const cat = r.receipts?.category ?? null;
    const mult = r.multiplier_applied != null ? Number(r.multiplier_applied) : 1;
    const bonus = mult > 1 ? `${Math.round(mult)}× LHDN` : undefined;
    return {
      id: r.id,
      merchant,
      pts: Math.round(Number(r.points_amount)),
      category: cat ?? 'Earned',
      icon: categoryToCatIcon(cat),
      bonus,
    };
  });
}

/**
 * Count distinct calendar days within the last 7 (inclusive of today) on
 * which the user logged at least one earn_receipt transaction. Caller passes
 * `now` so tests can pin the clock.
 */
export function receiptsThisWeek(rows: EarnTxnRow[], now: Date = new Date()): number {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const cutoff = startOfDay(now) - 6 * 24 * 60 * 60 * 1000; // last 7 days inclusive
  const days = new Set<string>();
  for (const r of rows) {
    if (r.transaction_type !== 'earn_receipt') continue;
    const t = startOfDay(new Date(r.created_at));
    if (t < cutoff) continue;
    days.add(new Date(t).toISOString().slice(0, 10));
  }
  return days.size;
}

export function shapeRewards(args: {
  points: UserPointsScalarRow | null;
  earnTxns: EarnTxnRow[];
  now?: Date;
}): RewardsMock {
  const { points, earnTxns, now = new Date() } = args;
  const balancePts = points ? Math.round(Number(points.current_balance)) : 0;

  return {
    balancePts,
    redeemableMyr: Math.round(balancePts * POINTS_TO_RM * 100) / 100,
    // Tier thresholds aren't in the schema yet — keep mock values but make
    // them feel less stale by capping progressPct at the user's relative
    // position toward `pointsToNext` if we ever wire it. For now, mock.
    tier: rewardsMock.tier,
    streak: {
      ...rewardsMock.streak,
      receiptsThisWeek: receiptsThisWeek(earnTxns, now),
    },
    multiplier: rewardsMock.multiplier,
    redeem: rewardsMock.redeem,
    recent: shapeRecent(earnTxns),
    footnote: rewardsMock.footnote,
  };
}

export async function fetchRewards(userId: string): Promise<RewardsMock> {
  const [pointsRes, txnRes] = await Promise.all([
    supabase
      .from('user_points')
      .select('user_id, current_balance, lifetime_earned')
      .eq('user_id', userId)
      .maybeSingle(),
    // Fetch the last 30 days worth of earn_receipt txns so receiptsThisWeek
    // has enough data without paginating; cap at 50 rows for safety.
    supabase
      .from('points_transactions')
      .select(
        'id, user_id, transaction_type, points_amount, multiplier_applied, description, created_at, receipt_id, receipts(id, merchant_name, category)',
      )
      .eq('user_id', userId)
      .eq('transaction_type', 'earn_receipt')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  if (pointsRes.error) throw pointsRes.error;
  if (txnRes.error) throw txnRes.error;

  return shapeRewards({
    points: (pointsRes.data ?? null) as UserPointsScalarRow | null,
    earnTxns: (txnRes.data ?? []) as unknown as EarnTxnRow[],
  });
}
