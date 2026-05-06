import { describe, it, expect } from 'vitest';
import {
  greetingFor,
  initialsFor,
  monthChangeFor,
  personaFor,
  shapeHome,
  shapeLhdnHome,
  shapeSpending,
  spendingWindow,
  type MonthTxnRow,
  type PaymentSourceBalanceRow,
  type ProfileRow,
  type SpendingReceiptRow,
  type UserPointsRow,
} from '@/lib/supabase/queries/home';
import type { ClaimableInsights } from '@/lib/supabase/queries/insights';
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

describe('spendingWindow', () => {
  it('returns 7 inclusive days ending today', () => {
    const out = spendingWindow(new Date('2026-05-07T10:00:00'));
    expect(out.dayKeys).toHaveLength(7);
    expect(out.startDate).toBe('2026-05-01');
    expect(out.endDate).toBe('2026-05-07');
  });
});

describe('shapeSpending', () => {
  const now = new Date('2026-05-07T10:00:00'); // Thursday
  // Window: Fri 5/1, Sat 5/2, Sun 5/3, Mon 5/4, Tue 5/5, Wed 5/6, Thu 5/7

  it('buckets receipts by receipt_date and totals them', () => {
    const rows: SpendingReceiptRow[] = [
      { id: '1', total_amount: '50', receipt_date: '2026-05-01' },
      { id: '2', total_amount: '25', receipt_date: '2026-05-01' },
      { id: '3', total_amount: '100', receipt_date: '2026-05-07' }, // today
    ];
    const out = shapeSpending(rows, now);
    expect(out.spendingTotal).toBe(175);
    // Bars are normalised to the largest bucket. 100 (today) is max → 100; 75 (5/1) → 75.
    expect(out.spendingBars).toEqual([75, 0, 0, 0, 0, 0, 100]);
  });

  it('emits 7 zero bars and zero total when no receipts in window', () => {
    const out = shapeSpending([], now);
    expect(out.spendingTotal).toBe(0);
    expect(out.spendingBars).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('axis labels reflect first / middle / last weekday names', () => {
    const out = shapeSpending([], now);
    // Window: Fri, Sat, Sun, Mon, Tue, Wed, Thu → axis = [Fri, Mon, Thu]
    expect(out.spendingAxis).toEqual(['Fri', 'Mon', 'Thu']);
  });

  it('drops receipts dated outside the 7-day window', () => {
    const rows: SpendingReceiptRow[] = [
      { id: '1', total_amount: '50', receipt_date: '2026-04-20' }, // before window
      { id: '2', total_amount: '60', receipt_date: '2026-05-04' }, // in window
    ];
    const out = shapeSpending(rows, now);
    expect(out.spendingTotal).toBe(60);
  });
});

describe('shapeLhdnHome', () => {
  it('mirrors totalClaimed / totalCap from ClaimableInsights so Home and Insights agree', () => {
    const insights: ClaimableInsights = {
      totalCap: 57000,
      totalClaimed: 7000,
      headroom: 50000,
      categoryCount: 5,
      categories: [],
    };
    expect(shapeLhdnHome(insights)).toEqual({ used: 7000, cap: 57000 });
  });

  it('returns zeros when there are no claimable categories yet', () => {
    const empty: ClaimableInsights = {
      totalCap: 0,
      totalClaimed: 0,
      headroom: 0,
      categoryCount: 0,
      categories: [],
    };
    expect(shapeLhdnHome(empty)).toEqual({ used: 0, cap: 0 });
  });
});

describe('monthChangeFor', () => {
  it('sums signed amounts across the rows', () => {
    const rows: MonthTxnRow[] = [
      { amount: 1000, occurred_at: '2026-05-01' },
      { amount: -120.5, occurred_at: '2026-05-02' },
      { amount: -30, occurred_at: '2026-05-03' },
    ];
    expect(monthChangeFor(rows)).toBe(849.5);
  });

  it('returns 0 when there are no rows this month', () => {
    expect(monthChangeFor([])).toBe(0);
  });
});

describe('shapeHome', () => {
  const now = new Date('2026-05-07T09:00:00');
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
      occurred_at: '2026-05-07T08:00:00',
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
      occurred_at: '2026-05-06T08:00:00',
      lhdn_claimable: true,
      account_id: 's1',
      account_name: 'Maybank',
      account_type: 'bank',
      points_earned: 8,
      source: 'receipt',
    },
  ];
  const spending: SpendingReceiptRow[] = [
    { id: 'sp1', total_amount: '150', receipt_date: '2026-05-04' },
    { id: 'sp2', total_amount: '40', receipt_date: '2026-05-07' },
  ];
  const claimableInsights: ClaimableInsights = {
    totalCap: 10500,
    totalClaimed: 85,
    headroom: 10415,
    categoryCount: 2,
    categories: [],
  };
  const monthTxns: MonthTxnRow[] = [
    { amount: 1000, occurred_at: '2026-05-01T00:00:00' },
    { amount: -120, occurred_at: '2026-05-04T00:00:00' },
  ];

  function call(overrides: Partial<Parameters<typeof shapeHome>[0]> = {}) {
    return shapeHome({
      profile,
      points,
      sources,
      recent,
      spending,
      claimableInsights,
      monthTxns,
      now,
      ...overrides,
    });
  }

  it('uses profile name and initials, falls back gracefully', () => {
    const out = call();
    expect(out.user.name).toBe('Aizuddin Yusoff');
    expect(out.user.initials).toBe('AY');
  });

  it('rounds points to whole number from PostgREST string', () => {
    const out = call();
    expect(out.user.points).toBe(4520);
  });

  it('zero points when user_points row is missing (brand-new user)', () => {
    const out = call({ points: null });
    expect(out.user.points).toBe(0);
  });

  it('sums payment_sources balances into mainMyr (string-safe)', () => {
    const out = call();
    expect(out.balance.mainMyr).toBe(12840.5);
  });

  it('emits a single MYR currency pill — DB has no foreign-currency balances', () => {
    const out = call();
    expect(out.balance.currencies).toHaveLength(1);
    expect(out.balance.currencies[0]).toMatchObject({ code: 'MYR', amount: 12840.5 });
  });

  it('time-of-day based greetingPrefix', () => {
    const out = call();
    expect(out.user.greetingPrefix).toBe('Good morning');
  });

  it('persona on insight chip reflects profile.advisor_persona', () => {
    const out = call();
    expect(out.insight.persona).toBe('Analyst');
  });

  it('shapes recent[] with friendly Today / Yesterday labels and lhdn flag', () => {
    const out = call();
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
      occurred_at: '2026-05-07T08:00:00',
      lhdn_claimable: false,
      account_id: null,
      account_name: null,
      account_type: null,
      points_earned: 0,
      source: 'receipt',
    }));
    const out = call({ recent: big });
    expect(out.recent).toHaveLength(4);
  });

  it('derives spendingTotal/Bars/Axis from receipts in the last 7 days', () => {
    const out = call();
    expect(out.spendingTotal).toBe(190);
    expect(out.spendingBars).toHaveLength(7);
    // 5/4 = 150 (max → 100); 5/7 = 40 (40/150 ≈ 27); rest 0
    expect(out.spendingBars[3]).toBe(100);
    expect(out.spendingBars[6]).toBe(27);
  });

  it('mirrors lhdn { used, cap } from the shared ClaimableInsights payload so Home agrees with Insights', () => {
    const out = call();
    expect(out.lhdn).toEqual({ used: 85, cap: 10500 });
  });

  it('derives monthChange from current-month signed transactions', () => {
    const out = call();
    expect(out.balance.monthChange).toBe(880);
  });

  it('keeps tier on mock until a points-tier table exists', () => {
    const out = call();
    expect(out.tier.name).toBe('Sapphire');
  });
});
