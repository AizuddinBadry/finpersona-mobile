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

/**
 * Cards screen mock — visual port of
 * Finpersona-mobile-build/screens-3.jsx. Stack of bank cards, a move-money
 * form fixture, and three auto-deduct rules with toggle defaults.
 */
export type CardItem = {
  id: string;
  name: string;
  last4: string;
  amount: string; // pre-formatted display string
  currency: 'MYR' | 'SGD' | 'USD';
  flag: string;
  gradient: string;
  primary?: boolean;
};

export type AutoDeductRule = {
  id: string;
  category: string;
  from: string;
  icon: CatIconName;
  defaultEnabled: boolean;
};

export type CardsMock = {
  cards: CardItem[];
  move: {
    fromName: string;
    fromLast4: string;
    fromCurrency: 'MYR';
    toName: string;
    toLast4: string;
    toCurrency: 'SGD' | 'USD';
    rateLabel: string;
    amountMyr: string;
    convertedLabel: string;
  };
  rules: AutoDeductRule[];
};

export const cardsMock: CardsMock = {
  cards: [
    {
      id: 'c1',
      name: 'Maybank Visa',
      last4: '4218',
      amount: '12,402.18',
      currency: 'MYR',
      flag: '🇲🇾',
      gradient: 'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)',
      primary: true,
    },
    {
      id: 'c2',
      name: 'CIMB Debit',
      last4: '8801',
      amount: '6,000.22',
      currency: 'MYR',
      flag: '🇲🇾',
      gradient: 'linear-gradient(140deg, #1A1530 0%, #3A3458 100%)',
    },
    {
      id: 'c3',
      name: 'Wise Multi',
      last4: '2240',
      amount: '1,820.00',
      currency: 'SGD',
      flag: '🇸🇬',
      gradient: 'linear-gradient(140deg, #1FB573 0%, #4DD7A0 100%)',
    },
    {
      id: 'c4',
      name: 'Wise Multi',
      last4: '2240',
      amount: '1,043.00',
      currency: 'USD',
      flag: '🇺🇸',
      gradient: 'linear-gradient(140deg, #B57415 0%, #E89B2A 100%)',
    },
  ],
  move: {
    fromName: 'Maybank Visa',
    fromLast4: '4218',
    fromCurrency: 'MYR',
    toName: 'Wise Multi · SGD',
    toLast4: '2240',
    toCurrency: 'SGD',
    rateLabel: '1 MYR = 0.296 SGD',
    amountMyr: '500.00',
    convertedLabel: '≈ S$ 148.00',
  },
  rules: [
    {
      id: 'r1',
      category: 'Dining & groceries',
      from: 'Maybank Visa',
      icon: 'food',
      defaultEnabled: true,
    },
    {
      id: 'r2',
      category: 'Bills & subscriptions',
      from: 'CIMB Debit',
      icon: 'home2',
      defaultEnabled: true,
    },
    {
      id: 'r3',
      category: 'Online shopping (USD)',
      from: 'Wise USD',
      icon: 'bag',
      defaultEnabled: false,
    },
  ],
};

/**
 * LHDN screen mock — visual port of
 * Finpersona-mobile-build/screens-4.jsx. Tax-relief category caps and
 * recently tagged transactions for YA 2025.
 */
export type LhdnIconName = 'book' | 'medical' | 'pulse' | 'flash' | 'star';

export type LhdnCategory = {
  id: string;
  name: string;
  icon: LhdnIconName;
  cap: number;
  used: number;
  items: number;
  color: string;
};

export type LhdnRecentTag = {
  id: string;
  name: string;
  category: string;
  amount: number;
  icon: CatIconName;
  date: string;
};

export type LhdnMock = {
  taxYear: string;
  insightCopy: string;
  insightHighlightRm: number;
  categories: LhdnCategory[];
  recent: LhdnRecentTag[];
};

export const lhdnMock: LhdnMock = {
  taxYear: 'YA 2025',
  insightCopy: 'Adding 2 unclaimed receipts could push you to',
  insightHighlightRm: 5830,
  categories: [
    {
      id: 'lifestyle',
      name: 'Lifestyle',
      icon: 'book',
      cap: 2500,
      used: 1842,
      items: 8,
      color: '#6E4CE6',
    },
    {
      id: 'medical',
      name: 'Medical (self & family)',
      icon: 'medical',
      cap: 8000,
      used: 1240,
      items: 4,
      color: '#D63440',
    },
    {
      id: 'sports',
      name: 'Sports equipment',
      icon: 'pulse',
      cap: 500,
      used: 350,
      items: 2,
      color: '#1FB573',
    },
    {
      id: 'internet',
      name: 'Internet subscription',
      icon: 'flash',
      cap: 2500,
      used: 1800,
      items: 12,
      color: '#1E80B5',
    },
    {
      id: 'skills',
      name: 'Skills & training',
      icon: 'star',
      cap: 7000,
      used: 350,
      items: 1,
      color: '#E89B2A',
    },
  ],
  recent: [
    {
      id: 'lr1',
      name: 'Kinokuniya KLCC',
      category: 'Lifestyle',
      amount: 142.0,
      icon: 'book',
      date: 'Today',
    },
    {
      id: 'lr2',
      name: 'Klinik Mediviron',
      category: 'Medical',
      amount: 85.0,
      icon: 'medical',
      date: 'Yesterday',
    },
    {
      id: 'lr3',
      name: 'Decathlon',
      category: 'Sports',
      amount: 350.0,
      icon: 'receipt',
      date: 'Apr 22',
    },
  ],
};

export type ParsedField = {
  label: string;
  value: string;
  confident: boolean;
};

export type CaptureMock = {
  merchant: string;
  merchantAddress: string;
  totalRm: number;
  receiptLines: number;
  insightTitle: string;
  insightSubtitle: string;
  fields: ParsedField[];
  lhdn: {
    eligible: boolean;
    category: string;
    capLeft: number;
  };
  points: {
    total: number;
    base: number;
    bonusMultiplier: number;
    bonusReason: string;
  };
};

export const captureMock: CaptureMock = {
  merchant: 'KINOKUNIYA',
  merchantAddress: 'Lot 4F-128, Suria KLCC',
  totalRm: 142.0,
  receiptLines: 4,
  insightTitle: 'Looks like a book purchase',
  insightSubtitle: '3 of 4 fields auto-filled · confirm below',
  fields: [
    { label: 'Merchant', value: 'Kinokuniya KLCC', confident: true },
    { label: 'Amount', value: 'RM 142.00', confident: true },
    { label: 'Date', value: '28 Apr 2026, 09:15', confident: true },
    { label: 'Pay from', value: 'Maybank Visa •• 4218', confident: false },
  ],
  lhdn: {
    eligible: true,
    category: 'Lifestyle',
    capLeft: 658,
  },
  points: {
    total: 284,
    base: 142,
    bonusMultiplier: 2,
    bonusReason: 'LHDN bonus',
  },
};

export type AdvisorMessage =
  | { kind: 'text'; from: 'ai' | 'user'; text: string }
  | { kind: 'chart' }
  | { kind: 'recs'; text: string };

export type AdvisorRec = {
  id: string;
  title: string;
  subtitle: string;
  icon: CatIconName;
};

export type AdvisorMock = {
  greeting: string;
  chart: {
    label: string;
    valueRm: number;
    deltaPct: number;
    points: number[]; // y-values 0..60 SVG coords inverted
    axis: string[];
  };
  messages: AdvisorMessage[];
  recs: AdvisorRec[];
  suggestions: string[];
};

export const advisorMock: AdvisorMock = {
  greeting: 'I pulled your last 30 days. Two patterns worth flagging.',
  chart: {
    label: '30-day · Dining',
    valueRm: 666,
    deltaPct: 38,
    // Y values from screens-6.jsx path. Lower = higher on chart (SVG inverted).
    points: [40, 38, 42, 30, 32, 28, 36, 18, 22, 12, 20, 8, 10],
    axis: ['30 Mar', '14 Apr', '28 Apr'],
  },
  messages: [
    {
      kind: 'text',
      from: 'ai',
      text: 'Dining + delivery is up 38% MoM (RM 482 → RM 666). Three weekend orders >RM 80 drove most of it.',
    },
    { kind: 'chart' },
    {
      kind: 'text',
      from: 'user',
      text: 'Show me where I could trim without changing routine.',
    },
    { kind: 'recs', text: 'Top three, ranked by impact and reversibility:' },
  ],
  recs: [
    {
      id: 'r1',
      title: 'Cap weekend delivery to 1 order',
      subtitle: 'Saves ~RM 180/mo · low effort',
      icon: 'food',
    },
    {
      id: 'r2',
      title: 'Move 2 streaming services to family plans',
      subtitle: 'Saves ~RM 42/mo · one-time',
      icon: 'gift',
    },
    {
      id: 'r3',
      title: 'Auto-tag medical → LHDN',
      subtitle: 'Recovers RM 240 at filing',
      icon: 'medical',
    },
  ],
  suggestions: ['Why is dining up?', 'Forecast May', 'Tax tips'],
};

export type InsightsCategory = {
  id: string;
  label: string;
  amount: number;
  pct: number;
  color: string;
};

export type InsightsMock = {
  period: 'Week' | 'Month' | 'Year';
  monthLabel: string;
  totalRm: number;
  deltaPct: number;
  prevTotalRm: number;
  prevLabel: string;
  axis: string[];
  // Cubic bezier path d-attributes from screens-7.jsx, kept here so the
  // shape matches the mockup pixel-for-pixel without re-deriving math.
  pathCurrent: string;
  pathPrevious: string;
  areaCurrent: string;
  areaPrevious: string;
  categories: InsightsCategory[];
  forecast: { period: string; pace: number; capped: number };
};

export const insightsMock: InsightsMock = {
  period: 'Month',
  monthLabel: 'April',
  totalRm: 3284,
  deltaPct: -12,
  prevTotalRm: 3732,
  prevLabel: 'March',
  axis: ['Apr 1', 'Apr 7', 'Apr 14', 'Apr 21', 'Apr 28'],
  pathCurrent:
    'M0,68 C30,64 60,72 90,60 C120,48 150,62 180,52 C210,44 240,52 270,38 C290,32 310,42 320,36',
  pathPrevious:
    'M0,55 C30,52 60,58 90,52 C120,46 150,55 180,40 C210,28 240,42 270,30 C290,24 310,30 320,28',
  areaCurrent:
    'M0,68 C30,64 60,72 90,60 C120,48 150,62 180,52 C210,44 240,52 270,38 C290,32 310,42 320,36 L320,100 L0,100 Z',
  areaPrevious:
    'M0,55 C30,52 60,58 90,52 C120,46 150,55 180,40 C210,28 240,42 270,30 C290,24 310,30 320,28 L320,100 L0,100 Z',
  categories: [
    { id: 'dining', label: 'Dining', amount: 666, pct: 100, color: '#D97636' },
    { id: 'transport', label: 'Transport', amount: 488, pct: 73, color: '#1E80B5' },
    { id: 'shopping', label: 'Shopping', amount: 442, pct: 66, color: '#6E4CE6' },
    { id: 'bills', label: 'Bills', amount: 380, pct: 57, color: '#1FB573' },
    { id: 'coffee', label: 'Coffee', amount: 184, pct: 27, color: '#956B3F' },
  ],
  forecast: {
    period: 'May',
    pace: 3420,
    capped: 3200,
  },
};
