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

/**
 * Activity screen mock — visual port of
 * Finpersona-mobile-build/screens-2.jsx. Shape supports filtering by
 * day-group and category chip; non-MYR txns carry a converted MYR figure.
 */
export type ActivityDayKey = 'today' | 'yesterday' | 'sat26';

export type ActivityTxn = {
  id: string;
  icon: CatIconName;
  name: string;
  category: string;
  amount: number; // negative = out, positive = in
  time: string; // 'Today, 12:30 PM'
  day: ActivityDayKey;
  lhdn: boolean;
  currency?: 'SGD' | 'USD';
  convertedMyr?: number;
};

export type ActivityGroup = {
  key: ActivityDayKey;
  label: string;
};

export type ActivityMock = {
  summary: { in: number; out: number; lhdn: number };
  transactions: ActivityTxn[];
  groups: ActivityGroup[];
};

export const activityMock: ActivityMock = {
  summary: { in: 1240, out: -860, lhdn: 320 },
  groups: [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'sat26', label: 'Sat 26 Apr' },
  ],
  transactions: [
    // Today
    {
      id: 'a1',
      icon: 'food',
      name: "Mama's Kitchen",
      category: 'Dining',
      amount: -48.2,
      time: '12:42',
      day: 'today',
      lhdn: false,
    },
    {
      id: 'a2',
      icon: 'book',
      name: 'Kinokuniya KLCC',
      category: 'Books & journals',
      amount: -142.0,
      time: '09:15',
      day: 'today',
      lhdn: true,
    },
    {
      id: 'a3',
      icon: 'coffee',
      name: 'Common Man Coffee',
      category: 'Coffee',
      amount: -18.5,
      time: '08:02',
      day: 'today',
      lhdn: false,
    },
    {
      id: 'a4',
      icon: 'transfer',
      name: 'Grab Ride · KLCC',
      category: 'Transport',
      amount: -14.3,
      time: '07:45',
      day: 'today',
      lhdn: false,
    },
    // Yesterday
    {
      id: 'a5',
      icon: 'transfer',
      name: 'Salary · Maybank',
      category: 'Income',
      amount: 1240.0,
      time: '00:00',
      day: 'yesterday',
      lhdn: false,
    },
    {
      id: 'a6',
      icon: 'medical',
      name: 'Klinik Mediviron',
      category: 'Medical · self',
      amount: -85.0,
      time: '17:31',
      day: 'yesterday',
      lhdn: true,
    },
    {
      id: 'a7',
      icon: 'car',
      name: 'Shell Bangsar',
      category: 'Transport',
      amount: -120.0,
      time: '14:08',
      day: 'yesterday',
      lhdn: false,
    },
    {
      id: 'a8',
      icon: 'book',
      name: 'BookXcess Mid Valley',
      category: 'Books & journals',
      amount: -93.0,
      time: '11:20',
      day: 'yesterday',
      lhdn: true,
    },
    // Sat 26 Apr
    {
      id: 'a9',
      icon: 'bag',
      name: 'Uniqlo Pavilion',
      category: 'Shopping',
      amount: -298.0,
      time: '15:24',
      day: 'sat26',
      lhdn: false,
    },
    {
      id: 'a10',
      icon: 'transfer',
      name: 'Transfer to Wise USD',
      category: 'Internal',
      amount: -240.0,
      time: '11:00',
      day: 'sat26',
      lhdn: false,
      currency: 'USD',
      convertedMyr: -1043.0,
    },
    {
      id: 'a11',
      icon: 'food',
      name: 'PappaRich Bukit Bintang',
      category: 'Dining',
      amount: -62.4,
      time: '13:05',
      day: 'sat26',
      lhdn: false,
    },
    {
      id: 'a12',
      icon: 'medical',
      name: 'Guardian Pharmacy',
      category: 'Medical · self',
      amount: -54.9,
      time: '10:18',
      day: 'sat26',
      lhdn: true,
      currency: 'SGD',
      convertedMyr: -188.4,
    },
  ],
};
