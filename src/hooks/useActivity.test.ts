import { describe, it, expect } from 'vitest';
import {
  shapeActivity,
  dayBucket,
  categoryToIcon,
  type MobileTransactionRow,
} from '@/lib/supabase/queries/activity';

describe('categoryToIcon', () => {
  it('maps Food/Dining variants to food', () => {
    expect(categoryToIcon('Dining')).toBe('food');
    expect(categoryToIcon('food & beverages')).toBe('food');
    expect(categoryToIcon('Restaurant')).toBe('food');
  });
  it('maps Coffee to coffee', () => {
    expect(categoryToIcon('Coffee')).toBe('coffee');
    expect(categoryToIcon('Cafe stop')).toBe('coffee');
  });
  it('maps Transport / fuel to car', () => {
    expect(categoryToIcon('Transport')).toBe('car');
    expect(categoryToIcon('Petrol')).toBe('car');
  });
  it('maps Medical / Health / Clinic to medical', () => {
    expect(categoryToIcon('Medical · self')).toBe('medical');
    expect(categoryToIcon('Klinik visit')).toBe('medical');
  });
  it('maps Books / Education to book', () => {
    expect(categoryToIcon('Books & journals')).toBe('book');
    expect(categoryToIcon('Education')).toBe('book');
  });
  it('falls back to receipt on unknown / null category', () => {
    expect(categoryToIcon(null)).toBe('receipt');
    expect(categoryToIcon('Quantum cryptography')).toBe('receipt');
  });
});

describe('dayBucket', () => {
  const now = new Date('2026-05-01T10:00:00');

  it('returns today/Today for same calendar day', () => {
    const r = dayBucket('2026-05-01T08:00:00', now);
    expect(r.key).toBe('today');
    expect(r.label).toBe('Today');
  });

  it('returns yesterday/Yesterday for the day before', () => {
    const r = dayBucket('2026-04-30T22:00:00', now);
    expect(r.key).toBe('yesterday');
    expect(r.label).toBe('Yesterday');
  });

  it('returns ISO key with weekday label for older dates', () => {
    const r = dayBucket('2026-04-25T12:00:00', now);
    expect(r.key).toBe('2026-04-25');
    // en-GB short format: "Sat 25 Apr"
    expect(r.label).toMatch(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/);
  });
});

describe('shapeActivity', () => {
  const now = new Date('2026-05-01T15:00:00');

  it('returns empty mock-shape on empty input', () => {
    const out = shapeActivity([], now);
    expect(out.summary).toEqual({ in: 0, out: 0, lhdn: 0 });
    expect(out.transactions).toEqual([]);
    expect(out.groups).toEqual([]);
  });

  it('groups by day bucket and sums in / out / lhdn correctly', () => {
    const rows: MobileTransactionRow[] = [
      {
        id: 'r1',
        user_id: 'u1',
        merchant: "Mama's Kitchen",
        amount: -48.2,
        category: 'Dining',
        occurred_at: '2026-05-01T12:42:00',
        lhdn_claimable: false,
        account_id: null,
        account_name: null,
        account_type: null,
        points_earned: null,
        source: 'receipt',
      },
      {
        id: 'r2',
        user_id: 'u1',
        merchant: 'Kinokuniya KLCC',
        amount: -142.0,
        category: 'Books & journals',
        occurred_at: '2026-05-01T09:15:00',
        lhdn_claimable: true,
        account_id: null,
        account_name: null,
        account_type: null,
        points_earned: null,
        source: 'receipt',
      },
      {
        id: 'r3',
        user_id: 'u1',
        merchant: 'Salary',
        amount: 1240,
        category: 'Income',
        occurred_at: '2026-04-30T00:00:00',
        lhdn_claimable: false,
        account_id: null,
        account_name: null,
        account_type: null,
        points_earned: null,
        source: 'manual',
      },
    ];

    const out = shapeActivity(rows, now);
    expect(out.summary.in).toBe(1240);
    expect(out.summary.out).toBe(-190.2);
    expect(out.summary.lhdn).toBe(142);

    expect(out.groups.map((g) => g.key)).toEqual(['today', 'yesterday']);
    expect(out.transactions).toHaveLength(3);

    const todayTxns = out.transactions.filter((t) => t.day === 'today');
    expect(todayTxns).toHaveLength(2);
    expect(todayTxns[0]).toMatchObject({
      name: "Mama's Kitchen",
      icon: 'food',
      lhdn: false,
    });
    expect(todayTxns[1]).toMatchObject({
      name: 'Kinokuniya KLCC',
      icon: 'book',
      lhdn: true,
      time: '09:15',
    });
  });
});
