import { describe, it, expect } from 'vitest';
import {
  greetingFor,
  initialsFor,
  personaFor,
  shapeHome,
  type PaymentSourceBalanceRow,
  type ProfileRow,
  type UserPointsRow,
} from '@/lib/supabase/queries/home';
import type { MobileTransactionRow } from '@/lib/supabase/queries/activity';

describe('greetingFor', () => {
  it('returns Good morning before noon', () => {
    expect(greetingFor(new Date('2026-05-01T07:00:00'))).toBe('Good morning');
  });
  it('returns Good afternoon between noon and 6pm', () => {
    expect(greetingFor(new Date('2026-05-01T14:00:00'))).toBe('Good afternoon');
  });
  it('returns Good evening after 6pm', () => {
    expect(greetingFor(new Date('2026-05-01T20:00:00'))).toBe('Good evening');
  });
});

describe('initialsFor', () => {
  it('uses first letter of first and last name', () => {
    expect(initialsFor('Aizuddin Yusoff')).toBe('AY');
  });
  it('uppercases lowercase names', () => {
    expect(initialsFor('siti aminah binti hassan')).toBe('SH');
  });
  it('handles single-name profiles', () => {
    expect(initialsFor('Madonna')).toBe('M');
  });
  it('falls back to ? for null / empty', () => {
    expect(initialsFor(null)).toBe('?');
    expect(initialsFor('   ')).toBe('?');
  });
});

describe('personaFor', () => {
  it('maps DB enum onto the AiPersona union', () => {
    expect(personaFor('analyst')).toBe('Analyst');
    expect(personaFor('coach')).toBe('Coach');
    expect(personaFor('witty')).toBe('Witty');
  });
  it('defaults to Coach for null', () => {
    expect(personaFor(null)).toBe('Coach');
  });
});

describe('shapeHome', () => {
  const now = new Date('2026-05-01T09:00:00');
  const profile: ProfileRow = {
    id: 'u',
    full_name: 'Aizuddin Yusoff',
    advisor_persona: 'analyst',
  };
  const points: UserPointsRow = {
    user_id: 'u',
    current_balance: '4520.00',
    lifetime_earned: '8000.00',
  };
  const sources: PaymentSourceBalanceRow[] = [
    { id: 's1', balance: '8000.50' },
    { id: 's2', balance: '4840.00' },
  ];
  const recent: MobileTransactionRow[] = [
    {
      id: 'r1',
      user_id: 'u',
      merchant: 'Mama\'s Kitchen',
      amount: -12.5,
      category: 'Food',
      occurred_at: '2026-05-01T08:00:00',
      lhdn_claimable: false,
      account_id: 's1',
      account_name: 'Maybank',
      account_type: 'bank',
      points_earned: 1,
      source: 'receipt',
    },
    {
      id: 'r2',
      user_id: 'u',
      merchant: 'Klinik Mediviron',
      amount: -85,
      category: 'Medical',
      occurred_at: '2026-04-30T08:00:00',
      lhdn_claimable: true,
      account_id: 's1',
      account_name: 'Maybank',
      account_type: 'bank',
      points_earned: 8,
      source: 'receipt',
    },
  ];

  it('uses profile name and initials, falls back gracefully', () => {
    const out = shapeHome({ profile, points, sources, recent, now });
    expect(out.user.name).toBe('Aizuddin Yusoff');
    expect(out.user.initials).toBe('AY');
  });

  it('rounds points to whole number from PostgREST string', () => {
    const out = shapeHome({ profile, points, sources, recent, now });
    expect(out.user.points).toBe(4520);
  });

  it('zero points when user_points row is missing (brand-new user)', () => {
    const out = shapeHome({ profile, points: null, sources, recent, now });
    expect(out.user.points).toBe(0);
  });

  it('sums payment_sources balances into mainMyr (string-safe)', () => {
    const out = shapeHome({ profile, points, sources, recent, now });
    expect(out.balance.mainMyr).toBe(12840.5);
  });

  it('mirrors mainMyr into the MYR currency pill, keeps SGD/USD on mock', () => {
    const out = shapeHome({ profile, points, sources, recent, now });
    expect(out.balance.currencies[0]).toMatchObject({ code: 'MYR', amount: 12840.5 });
    expect(out.balance.currencies.map((c) => c.code)).toEqual(['MYR', 'SGD', 'USD']);
  });

  it('time-of-day based greetingPrefix', () => {
    const out = shapeHome({ profile, points, sources, recent, now });
    expect(out.user.greetingPrefix).toBe('Good morning');
  });

  it('persona on insight chip reflects profile.advisor_persona', () => {
    const out = shapeHome({ profile, points, sources, recent, now });
    expect(out.insight.persona).toBe('Analyst');
  });

  it('shapes recent[] with friendly Today / Yesterday labels and lhdn flag', () => {
    const out = shapeHome({ profile, points, sources, recent, now });
    expect(out.recent).toHaveLength(2);
    expect(out.recent[0]).toMatchObject({
      name: 'Mama\'s Kitchen',
      date: 'Today',
      lhdn: false,
      icon: 'food',
    });
    expect(out.recent[1]).toMatchObject({
      name: 'Klinik Mediviron',
      date: 'Yesterday',
      lhdn: true,
      icon: 'medical',
    });
  });

  it('caps recent at 4 entries', () => {
    const big: MobileTransactionRow[] = Array.from({ length: 6 }, (_, i) => ({
      id: `t${i}`,
      user_id: 'u',
      merchant: `M${i}`,
      amount: -1,
      category: 'Food',
      occurred_at: '2026-05-01T08:00:00',
      lhdn_claimable: false,
      account_id: null,
      account_name: null,
      account_type: null,
      points_earned: 0,
      source: 'receipt',
    }));
    const out = shapeHome({ profile, points, sources, recent: big, now });
    expect(out.recent).toHaveLength(4);
  });

  it('keeps mockable fields (tier, spendingBars, monthChange) untouched', () => {
    const out = shapeHome({ profile, points, sources, recent, now });
    expect(out.tier.name).toBe('Sapphire');
    expect(out.spendingBars).toHaveLength(7);
    expect(out.balance.monthChange).toBeGreaterThan(0);
  });
});
