/**
 * Rewards screen query — pulls user_points, points_transactions (earn history),
 * and the live rewards_catalog (active vouchers/gifts from the web admin).
 *
 * Tier is computed from lifetime_earned against static thresholds (no tier-config
 * table exists — same approach as the web app).
 *
 * Stays on rewardsMock:
 *   - multiplier (UI fixture; actual multiplier lives in points_transactions.multiplier_applied)
 *   - streak.days (no streak-days audit table yet)
 *   - footnote copy
 *
 * 1 point = RM 0.01 redeemable (matches the Phase 1 product copy).
 */
import { supabase } from '@/lib/supabase/client';
import type { CatIconName } from '@/components/CatIcon';
import type { IconName } from '@/components/Icon';
import type { RewardItem, RewardsMock, RewardsRecent } from '@/mocks/seed';
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

export type RewardsCatalogRow = {
  id: string;
  reward_name: string;
  reward_description: string | null;
  points_cost: string | number;
  reward_type: string;
  reward_value: string | number | null;
  display_order: number;
};

const RECENT_LIMIT = 4;
const POINTS_TO_RM = 0.01; // 1 pt = RM 0.01

// ---------- tier computation ----------

type TierDef = {
  name: string;
  min: number;
  max: number;
  next: string;
  nextMultiplier: number;
};

const TIER_THRESHOLDS: TierDef[] = [
  { name: 'Bronze', min: 0, max: 999, next: 'Sapphire', nextMultiplier: 1.2 },
  { name: 'Sapphire', min: 1000, max: 4999, next: 'Amethyst', nextMultiplier: 1.5 },
  { name: 'Amethyst', min: 5000, max: 9999, next: 'Diamond', nextMultiplier: 2.0 },
  { name: 'Diamond', min: 10000, max: Infinity, next: 'Diamond', nextMultiplier: 2.0 },
];

export function computeTier(lifetimeEarned: number): RewardsMock['tier'] {
  const t =
    TIER_THRESHOLDS.find((d) => lifetimeEarned <= d.max) ??
    TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1]!;
  const isDiamond = t.max === Infinity;
  const range = isDiamond ? 1 : t.max - t.min + 1;
  const progressPct = isDiamond
    ? 100
    : Math.max(0, Math.min(100, Math.round(((lifetimeEarned - t.min) / range) * 100)));
  const pointsToNext = isDiamond ? 0 : Math.max(0, t.max + 1 - lifetimeEarned);
  return {
    name: t.name,
    next: t.next,
    progressPct,
    pointsToNext,
    nextMultiplier: t.nextMultiplier,
  };
}

// ---------- catalog shaping ----------

const REWARD_TYPE_ICON: Record<string, IconName> = {
  voucher: 'gift',
  gift: 'gift',
  cash: 'bank',
  donation: 'pulse',
  other: 'star',
};

const REWARD_TYPE_COLOR: Record<string, string> = {
  voucher: '#6E4CE6',
  gift: '#F59E0B',
  cash: '#10B981',
  donation: '#EF4444',
  other: '#6E4CE6',
};

export function shapeCatalogItem(row: RewardsCatalogRow): RewardItem {
  const pts = Math.round(Number(row.points_cost));
  const sub = row.reward_value
    ? `RM ${Number(row.reward_value).toFixed(0)} value`
    : (row.reward_description ?? undefined);
  return {
    id: row.id,
    name: row.reward_name,
    pts,
    brandColor: REWARD_TYPE_COLOR[row.reward_type] ?? '#6E4CE6',
    icon: REWARD_TYPE_ICON[row.reward_type] ?? 'star',
    sub,
  };
}

// ---------- category → CatIcon ----------

function categoryToCatIcon(category: string | null): CatIconName {
  if (!category) return 'receipt';
  const c = category.toLowerCase();
  if (c.includes('food') || c.includes('dining')) return 'food';
  if (c.includes('coffee') || c.includes('cafe')) return 'coffee';
  if (c.includes('book') || c.includes('lifestyle')) return 'book';
  if (c.includes('shop') || c.includes('cloth')) return 'bag';
  if (c.includes('transport') || c.includes('fuel') || c.includes('petrol')) return 'car';
  if (c.includes('medical') || c.includes('health') || c.includes('clinic') || c.includes('klinik')) return 'medical';
  if (c.includes('education') || c.includes('course')) return 'book';
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
  catalog?: RewardsCatalogRow[];
  now?: Date;
}): RewardsMock {
  const { points, earnTxns, catalog = [], now = new Date() } = args;
  const balancePts = points ? Math.round(Number(points.current_balance)) : 0;
  const lifetimeEarned = points ? Math.round(Number(points.lifetime_earned)) : 0;

  return {
    balancePts,
    redeemableMyr: Math.round(balancePts * POINTS_TO_RM * 100) / 100,
    tier: computeTier(lifetimeEarned),
    streak: {
      ...rewardsMock.streak,
      receiptsThisWeek: receiptsThisWeek(earnTxns, now),
    },
    multiplier: rewardsMock.multiplier,
    redeem: catalog.length > 0 ? catalog.map(shapeCatalogItem) : rewardsMock.redeem,
    recent: shapeRecent(earnTxns),
    footnote: rewardsMock.footnote,
  };
}

export async function fetchRewards(userId: string): Promise<RewardsMock> {
  const [pointsRes, txnRes, catalogRes] = await Promise.all([
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
    supabase
      .from('rewards_catalog')
      .select('id, reward_name, reward_description, points_cost, reward_type, reward_value, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
  ]);
  if (pointsRes.error) throw pointsRes.error;
  if (txnRes.error) throw txnRes.error;
  if (catalogRes.error) throw catalogRes.error;

  return shapeRewards({
    points: (pointsRes.data ?? null) as UserPointsScalarRow | null,
    earnTxns: (txnRes.data ?? []) as unknown as EarnTxnRow[],
    catalog: (catalogRes.data ?? []) as RewardsCatalogRow[],
  });
}

/**
 * Atomically claim a reward via the `claim_reward` Postgres RPC.
 * The function validates balance, deducts points, creates a reward_claims row,
 * and decrements stock_quantity — all in a single DB transaction.
 * Throws with a human-readable message on failure.
 */
export async function claimReward(userId: string, rewardId: string): Promise<void> {
  const { error } = await supabase.rpc('claim_reward', {
    p_user_id: userId,
    p_reward_id: rewardId,
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.toLowerCase().includes('insufficient')) throw new Error('Insufficient points to redeem this reward.');
    if (msg.toLowerCase().includes('stock') || msg.toLowerCase().includes('out of')) throw new Error('This reward is out of stock.');
    throw new Error('Could not complete redemption. Please try again.');
  }
}
