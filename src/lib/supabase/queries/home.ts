/**
 * Home dashboard query — merges profile, user_points, payment_sources, and the
 * top recent transactions into the HomeMock shape Phase 2's Home.tsx renders.
 *
 * Several fields stay on `homeMock` because the schema doesn't yet back them:
 *   - tier, insight body/cta, spendingTotal/Bars/Axis, lhdn (covered by 3-C),
 *     balance.monthChange, balance.currencies (only MYR exists in the DB).
 *
 * advisor_persona on the profile maps onto the AiPersona union so the AI
 * insight chip header can reflect the user's chosen persona even though the
 * body/CTA are still mock copy.
 */
import { supabase } from '@/lib/supabase/client';
import type { CatIconName } from '@/components/CatIcon';
import type { AiPersona, HomeMock, RecentTxn } from '@/mocks/seed';
import { homeMock } from '@/mocks/seed';
import type { MobileTransactionRow } from './activity';
import { categoryToIcon } from './activity';

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

const RECENT_LIMIT = 4;

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

export function shapeHome(args: {
  profile: ProfileRow | null;
  points: UserPointsRow | null;
  sources: PaymentSourceBalanceRow[];
  recent: MobileTransactionRow[];
  now?: Date;
}): HomeMock {
  const { profile, points, sources, recent, now = new Date() } = args;

  const fullName = profile?.full_name ?? homeMock.user.name;
  const mainMyr = sources.reduce((s, r) => s + Number(r.balance), 0);

  return {
    user: {
      greetingPrefix: greetingFor(now),
      name: fullName,
      initials: initialsFor(profile?.full_name ?? null),
      points: points ? Math.round(Number(points.current_balance)) : 0,
    },
    balance: {
      mainMyr: Math.round(mainMyr * 100) / 100,
      // Month change and non-MYR balances aren't backed by the schema yet.
      monthChange: homeMock.balance.monthChange,
      currencies: [
        { ...homeMock.balance.currencies[0], amount: Math.round(mainMyr * 100) / 100 },
        ...homeMock.balance.currencies.slice(1),
      ],
    },
    // Tier, insight body/CTA, and the spending/lhdn mini-cards stay on mock —
    // no backing tables yet (Phase 4 wires the advisor and analytics).
    tier: homeMock.tier,
    insight: {
      ...homeMock.insight,
      persona: personaFor(profile?.advisor_persona ?? null),
    },
    spendingTotal: homeMock.spendingTotal,
    spendingBars: homeMock.spendingBars,
    spendingAxis: homeMock.spendingAxis,
    lhdn: homeMock.lhdn,
    recent: shapeRecent(recent, now),
  };
}

export async function fetchHome(userId: string): Promise<HomeMock> {
  const [profileRes, pointsRes, sourcesRes, recentRes] = await Promise.all([
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
  ]);
  if (profileRes.error) throw profileRes.error;
  if (pointsRes.error) throw pointsRes.error;
  if (sourcesRes.error) throw sourcesRes.error;
  if (recentRes.error) throw recentRes.error;

  return shapeHome({
    profile: (profileRes.data ?? null) as ProfileRow | null,
    points: (pointsRes.data ?? null) as UserPointsRow | null,
    sources: (sourcesRes.data ?? []) as PaymentSourceBalanceRow[],
    recent: (recentRes.data ?? []) as MobileTransactionRow[],
  });
}
