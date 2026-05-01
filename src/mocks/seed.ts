/**
 * Static mock data for Phase 2 visual ports. Each screen's slice is named
 * (homeMock, activityMock, cardsMock, …) so the eventual swap to a
 * supabase- or RPC-backed source can replace exports one at a time.
 *
 * Numbers and copy here come from the Task 2-B plan and the
 * Finpersona-mobile-build/screens-1.jsx mockup.
 */
import type { CatIconName } from '@/components/CatIcon';

export type AiPersona = 'Analyst' | 'Coach' | 'Witty';

export type RecentTxn = {
  id: string;
  icon: CatIconName;
  name: string;
  category: string;
  amount: number;
  date: string;
  lhdn: boolean;
};

export type CurrencyBalance = {
  code: 'MYR' | 'SGD' | 'USD';
  amount: number;
  flag: string;
};

export type HomeMock = {
  user: {
    greetingPrefix: string;
    name: string;
    initials: string;
    points: number;
  };
  balance: { mainMyr: number; monthChange: number; currencies: CurrencyBalance[] };
  tier: {
    name: string;
    progressPct: number;
    nextTier: string;
    nextTierGap: number;
    multiplier: number;
  };
  insight: { persona: AiPersona; body: string; cta: string };
  spendingTotal: number;
  spendingBars: number[];
  spendingAxis: string[];
  lhdn: { used: number; cap: number };
  recent: RecentTxn[];
};

export const homeMock: HomeMock = {
  user: {
    greetingPrefix: 'Good morning',
    name: 'Aizuddin',
    initials: 'AY',
    points: 4520,
  },
  balance: {
    mainMyr: 12840.5,
    monthChange: 240.1,
    currencies: [
      { code: 'MYR', amount: 12840.5, flag: '\u{1F1F2}\u{1F1FE}' },
      { code: 'SGD', amount: 1240.0, flag: '\u{1F1F8}\u{1F1EC}' },
      { code: 'USD', amount: 320.4, flag: '\u{1F1FA}\u{1F1F8}' },
    ],
  },
  tier: {
    name: 'Sapphire',
    progressPct: 68,
    nextTier: 'Amethyst',
    nextTierGap: 480,
    multiplier: 1.5,
  },
  insight: {
    persona: 'Analyst',
    body: 'You spent 18% more on dining this month.',
    cta: 'See breakdown',
  },
  spendingTotal: 3284,
  spendingBars: [40, 65, 50, 80, 35, 90, 55],
  spendingAxis: ['Mon', 'Thu', 'Sun'],
  lhdn: { used: 3120, cap: 9000 },
  recent: [
    {
      id: 't1',
      icon: 'food',
      name: 'Mak Cik Nasi Lemak',
      category: 'Food',
      amount: -12.5,
      date: 'Today',
      lhdn: false,
    },
    {
      id: 't2',
      icon: 'book',
      name: 'Kinokuniya',
      category: 'Books',
      amount: -89.0,
      date: 'Today',
      lhdn: true,
    },
    {
      id: 't3',
      icon: 'medical',
      name: 'Klinik Subang',
      category: 'Medical',
      amount: -180.0,
      date: 'Yesterday',
      lhdn: true,
    },
    {
      id: 't4',
      icon: 'transfer',
      name: 'From Mom',
      category: 'Transfer',
      amount: 500.0,
      date: 'Yesterday',
      lhdn: false,
    },
  ],
};
