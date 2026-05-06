import { describe, it, expect } from 'vitest';
import {
  computeTier,
  receiptsThisWeek,
  shapeCatalogItem,
  shapeRecent,
  shapeRewards,
  type EarnTxnRow,
  type RewardsCatalogRow,
  type UserPointsScalarRow,
} from '@/lib/supabase/queries/rewards';

function row(partial: Partial<EarnTxnRow> & { id: string; created_at: string }): EarnTxnRow {
  return {
    id: partial.id,
    user_id: 'u',
    transaction_type: partial.transaction_type ?? 'earn_receipt',
    points_amount: partial.points_amount ?? '10',
    multiplier_applied: partial.multiplier_applied ?? null,
    description: partial.description ?? null,
    created_at: partial.created_at,
    receipt_id: partial.receipt_id ?? null,
    receipts: partial.receipts ?? null,
  };
}

describe('computeTier', () => {
  it('maps Bronze for 0 lifetime pts', () => {
    const t = computeTier(0);
    expect(t.name).toBe('Bronze');
    expect(t.next).toBe('Sapphire');
    expect(t.progressPct).toBe(0);
    expect(t.pointsToNext).toBe(1000);
  });

  it('maps Sapphire for 1000–4999 pts with correct progress', () => {
    const t = computeTier(3000);
    expect(t.name).toBe('Sapphire');
    expect(t.progressPct).toBe(Math.round(((3000 - 1000) / 4000) * 100));
    expect(t.pointsToNext).toBe(2000);
  });

  it('maps Amethyst for 5000–9999 pts', () => {
    expect(computeTier(8000).name).toBe('Amethyst');
    expect(computeTier(5000).name).toBe('Amethyst');
    expect(computeTier(9999).name).toBe('Amethyst');
  });

  it('maps Diamond at max tier with progressPct 100 and 0 pointsToNext', () => {
    const t = computeTier(15000);
    expect(t.name).toBe('Diamond');
    expect(t.progressPct).toBe(100);
    expect(t.pointsToNext).toBe(0);
  });
});

describe('shapeCatalogItem', () => {
  it('maps voucher type to gift icon and purple color with RM sub', () => {
    const row: RewardsCatalogRow = {
      id: 'c1',
      reward_name: 'Shopee RM 50',
      reward_description: null,
      points_cost: '4800',
      reward_type: 'voucher',
      reward_value: '50',
      display_order: 1,
    };
    const item = shapeCatalogItem(row);
    expect(item.id).toBe('c1');
    expect(item.name).toBe('Shopee RM 50');
    expect(item.pts).toBe(4800);
    expect(item.icon).toBe('gift');
    expect(item.sub).toBe('RM 50 value');
  });

  it('falls back to reward_description as sub when reward_value is null', () => {
    const row: RewardsCatalogRow = {
      id: 'c2',
      reward_name: 'Donation',
      reward_description: 'Plant a tree',
      points_cost: '1000',
      reward_type: 'donation',
      reward_value: null,
      display_order: 2,
    };
    const item = shapeCatalogItem(row);
    expect(item.icon).toBe('pulse');
    expect(item.sub).toBe('Plant a tree');
  });
});

describe('receiptsThisWeek', () => {
  const now = new Date('2026-05-01T10:00:00');

  it('counts distinct days in the last 7 days inclusive', () => {
    const rows = [
      row({ id: 't1', created_at: '2026-05-01T08:00:00' }),
      row({ id: 't2', created_at: '2026-05-01T18:00:00' }), // same day, should not double-count
      row({ id: 't3', created_at: '2026-04-30T10:00:00' }),
      row({ id: 't4', created_at: '2026-04-29T10:00:00' }),
      row({ id: 't5', created_at: '2026-04-25T10:00:00' }),
    ];
    expect(receiptsThisWeek(rows, now)).toBe(4);
  });

  it('ignores rows older than 7 days', () => {
    const rows = [
      row({ id: 't1', created_at: '2026-05-01T08:00:00' }),
      row({ id: 'old', created_at: '2026-04-15T08:00:00' }),
    ];
    expect(receiptsThisWeek(rows, now)).toBe(1);
  });

  it('skips non-earn_receipt rows', () => {
    const rows = [
      row({ id: 't1', created_at: '2026-05-01T08:00:00', transaction_type: 'spend_reward' }),
      row({ id: 't2', created_at: '2026-04-30T08:00:00', transaction_type: 'admin_adjustment' }),
    ];
    expect(receiptsThisWeek(rows, now)).toBe(0);
  });

  it('returns 0 when no rows', () => {
    expect(receiptsThisWeek([], now)).toBe(0);
  });
});

describe('shapeRecent', () => {
  it('uses joined receipt merchant + category, picks CatIcon, marks bonus when multiplier > 1', () => {
    const rows = [
      row({
        id: 'e1',
        created_at: '2026-05-01T08:00:00',
        points_amount: '142',
        multiplier_applied: '2',
        receipts: { id: 'r1', merchant_name: 'Kinokuniya KLCC', category: 'Lifestyle' },
      }),
      row({
        id: 'e2',
        created_at: '2026-04-30T08:00:00',
        points_amount: '85',
        multiplier_applied: '1',
        receipts: { id: 'r2', merchant_name: 'Klinik Mediviron', category: 'Medical' },
      }),
    ];
    const out = shapeRecent(rows);
    expect(out[0]).toMatchObject({
      merchant: 'Kinokuniya KLCC',
      pts: 142,
      category: 'Lifestyle',
      icon: 'book',
      bonus: '2× LHDN',
    });
    expect(out[1]).toMatchObject({
      merchant: 'Klinik Mediviron',
      pts: 85,
      icon: 'medical',
    });
    expect(out[1].bonus).toBeUndefined();
  });

  it('falls back to description when receipt join is null', () => {
    const rows = [
      row({
        id: 'e1',
        created_at: '2026-05-01T08:00:00',
        points_amount: '10',
        receipts: null,
        description: 'Welcome bonus',
      }),
    ];
    const out = shapeRecent(rows);
    expect(out[0].merchant).toBe('Welcome bonus');
    expect(out[0].icon).toBe('receipt');
  });

  it('caps at 4 entries', () => {
    const rows: EarnTxnRow[] = Array.from({ length: 6 }, (_, i) =>
      row({ id: `e${i}`, created_at: '2026-05-01T08:00:00', points_amount: '10' }),
    );
    expect(shapeRecent(rows)).toHaveLength(4);
  });
});

describe('shapeRewards', () => {
  const points: UserPointsScalarRow = {
    user_id: 'u',
    current_balance: '4520.00',
    lifetime_earned: '8000.00',
  };
  const earnTxns: EarnTxnRow[] = [
    row({
      id: 'e1',
      created_at: '2026-05-01T08:00:00',
      points_amount: '142',
      multiplier_applied: '2',
      receipts: { id: 'r1', merchant_name: 'Kinokuniya', category: 'Lifestyle' },
    }),
    row({
      id: 'e2',
      created_at: '2026-04-30T08:00:00',
      points_amount: '50',
      receipts: { id: 'r2', merchant_name: 'Mama\'s', category: 'Food' },
    }),
  ];
  const now = new Date('2026-05-01T10:00:00');

  it('rounds balancePts and computes redeemableMyr at 1pt = RM 0.01', () => {
    const out = shapeRewards({ points, earnTxns, now });
    expect(out.balancePts).toBe(4520);
    expect(out.redeemableMyr).toBe(45.2);
  });

  it('handles missing user_points row (brand-new user)', () => {
    const out = shapeRewards({ points: null, earnTxns: [], now });
    expect(out.balancePts).toBe(0);
    expect(out.redeemableMyr).toBe(0);
    expect(out.recent).toEqual([]);
  });

  it('streak.receiptsThisWeek is computed from txns; multiplier stays on mock', () => {
    const out = shapeRewards({ points, earnTxns, now });
    expect(out.streak.receiptsThisWeek).toBe(2);
    expect(out.streak.days).toBe(12); // unchanged from mock
    expect(out.streak.receiptGoal).toBe(7);
    // lifetime_earned = 8000 → Amethyst tier (5000–9999)
    expect(out.tier.name).toBe('Amethyst');
    expect(out.tier.next).toBe('Diamond');
    expect(out.multiplier.value).toBe(2);
  });

  it('redeem comes from catalog when provided, falls back to mock when catalog is empty', () => {
    const catalogRow: RewardsCatalogRow = {
      id: 'c1',
      reward_name: 'Grab RM 30',
      reward_description: 'Grab voucher',
      points_cost: '3000',
      reward_type: 'voucher',
      reward_value: '30',
      display_order: 1,
    };
    const withCatalog = shapeRewards({ points, earnTxns, catalog: [catalogRow], now });
    expect(withCatalog.redeem).toHaveLength(1);
    expect(withCatalog.redeem[0]!.name).toBe('Grab RM 30');
    expect(withCatalog.redeem[0]!.pts).toBe(3000);
    // falls back to mock when catalog is empty
    const noCatalog = shapeRewards({ points, earnTxns, catalog: [], now });
    expect(noCatalog.redeem.length).toBeGreaterThan(0);
  });

  it('preserves footnote from mock', () => {
    const out = shapeRewards({ points, earnTxns, now });
    expect(typeof out.footnote).toBe('string');
    expect(out.footnote.length).toBeGreaterThan(0);
  });
});
