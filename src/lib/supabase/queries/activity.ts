/**
 * Activity screen query — pulls denormalized rows from `v_mobile_transactions`
 * (migration 039) and reshapes them into the ActivityMock shape that
 * Phase 2's Activity.tsx already knows how to render. RLS on the underlying
 * tables scopes rows to the authenticated user, so we still pass userId
 * defensively for the query key.
 */
import { supabase } from '@/lib/supabase/client';
import type { CatIconName } from '@/components/CatIcon';
import type { ActivityMock, ActivityTxn } from '@/mocks/seed';

export type MobileTransactionRow = {
  id: string;
  user_id: string;
  merchant: string;
  amount: number; // already negated for outflows in the view
  category: string | null;
  occurred_at: string; // ISO timestamp
  lhdn_claimable: boolean;
  account_id: string | null;
  account_name: string | null;
  account_type: string | null;
  points_earned: number | null;
  source: 'receipt' | 'manual';
};

const TXN_LIMIT = 60;

/**
 * Map free-text category names from the receipts table onto the small
 * CatIcon palette. Unknown categories fall back to 'receipt' (neutral
 * amber tile) so the UI never blows up on a new category.
 */
export function categoryToIcon(category: string | null): CatIconName {
  if (!category) return 'receipt';
  const c = category.toLowerCase();
  if (c.includes('food') || c.includes('dining') || c.includes('restaurant')) return 'food';
  if (c.includes('coffee') || c.includes('cafe')) return 'coffee';
  if (c.includes('shop') || c.includes('cloth') || c.includes('apparel')) return 'bag';
  if (c.includes('transport') || c.includes('fuel') || c.includes('petrol') || c.includes('parking')) return 'car';
  if (c.includes('home') || c.includes('rent') || c.includes('utilit')) return 'home2';
  if (
    c.includes('medical') ||
    c.includes('health') ||
    c.includes('clinic') ||
    c.includes('klinik') ||
    c.includes('pharma')
  ) return 'medical';
  if (c.includes('book') || c.includes('education') || c.includes('learn')) return 'book';
  if (c.includes('income') || c.includes('salary') || c.includes('transfer')) return 'transfer';
  if (c.includes('bank') || c.includes('saving')) return 'bank';
  if (c.includes('gift') || c.includes('donation')) return 'gift';
  return 'receipt';
}

/**
 * Bucket key for grouping rows in the Activity list. Today / Yesterday get
 * friendly labels; older rows fall back to the ISO date so the screen still
 * groups them correctly.
 */
export function dayBucket(occurredAt: string, now: Date = new Date()): { key: string; label: string } {
  const d = new Date(occurredAt);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const today = startOfDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((today - startOfDay(d)) / dayMs);
  if (diffDays === 0) return { key: 'today', label: 'Today' };
  if (diffDays === 1) return { key: 'yesterday', label: 'Yesterday' };
  const iso = d.toISOString().slice(0, 10);
  // e.g. 'Sat 26 Apr'
  const label = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return { key: iso, label };
}

function timeOf(occurredAt: string): string {
  const d = new Date(occurredAt);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function shapeActivity(rows: MobileTransactionRow[], now: Date = new Date()): ActivityMock {
  const txns: ActivityTxn[] = [];
  const groupMap = new Map<string, { label: string; firstOccurredAt: string }>();
  let totalIn = 0;
  let totalOut = 0;
  let totalLhdn = 0;

  for (const r of rows) {
    const { key, label } = dayBucket(r.occurred_at, now);
    if (!groupMap.has(key)) groupMap.set(key, { label, firstOccurredAt: r.occurred_at });
    txns.push({
      id: r.id,
      icon: categoryToIcon(r.category),
      name: r.merchant,
      category: r.category ?? '—',
      amount: r.amount,
      time: timeOf(r.occurred_at),
      day: key,
      lhdn: r.lhdn_claimable,
    });
    if (r.amount > 0) totalIn += r.amount;
    else totalOut += r.amount;
    if (r.lhdn_claimable) totalLhdn += Math.abs(r.amount);
  }

  // Preserve insertion order — rows came back ordered by occurred_at desc,
  // so the map already has today first.
  const groups = Array.from(groupMap, ([key, v]) => ({ key, label: v.label }));

  return {
    summary: {
      in: Math.round(totalIn * 100) / 100,
      out: Math.round(totalOut * 100) / 100,
      lhdn: Math.round(totalLhdn * 100) / 100,
    },
    transactions: txns,
    groups,
  };
}

export async function fetchActivity(userId: string): Promise<ActivityMock> {
  const { data, error } = await supabase
    .from('v_mobile_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(TXN_LIMIT);
  if (error) throw error;
  return shapeActivity((data ?? []) as MobileTransactionRow[]);
}
