import { describe, it, expect } from 'vitest';
import { shapeCards, type PaymentSourceRow } from '@/lib/supabase/queries/cards';

describe('shapeCards', () => {
  it('puts the default card first regardless of input order', () => {
    const rows: PaymentSourceRow[] = [
      { id: 'b', user_id: 'u', name: 'CIMB', source_type: 'bank', balance: 100, is_default: false, color: null },
      { id: 'a', user_id: 'u', name: 'Maybank', source_type: 'bank', balance: 9999, is_default: true, color: null },
      { id: 'c', user_id: 'u', name: 'Wise', source_type: 'bank', balance: 50, is_default: false, color: null },
    ];
    const cards = shapeCards(rows);
    expect(cards[0]).toMatchObject({ name: 'Maybank', primary: true });
    expect(cards[0].gradient).toBe('linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)');
  });

  it('sorts non-default cards by balance descending', () => {
    const rows: PaymentSourceRow[] = [
      { id: 'a', user_id: 'u', name: 'Low', source_type: 'bank', balance: 50, is_default: false, color: null },
      { id: 'b', user_id: 'u', name: 'High', source_type: 'bank', balance: 5000, is_default: false, color: null },
      { id: 'c', user_id: 'u', name: 'Mid', source_type: 'bank', balance: 500, is_default: false, color: null },
    ];
    const cards = shapeCards(rows);
    expect(cards.map((c) => c.name)).toEqual(['High', 'Mid', 'Low']);
  });

  it('formats balance as en-MY with 2 decimal places', () => {
    const rows: PaymentSourceRow[] = [
      { id: 'a', user_id: 'u', name: 'Maybank', source_type: 'bank', balance: 12402.18, is_default: true, color: null },
    ];
    const [card] = shapeCards(rows);
    expect(card.amount).toBe('12,402.18');
    expect(card.currency).toBe('MYR');
    expect(card.flag).toBe('🇲🇾');
    expect(card.last4).toBe('••••');
  });

  it('coerces string balance (PostgREST numeric form) to a number', () => {
    const rows: PaymentSourceRow[] = [
      { id: 'a', user_id: 'u', name: 'Maybank', source_type: 'bank', balance: '8765.40' as unknown as number, is_default: true, color: null },
    ];
    const [card] = shapeCards(rows);
    expect(card.amount).toBe('8,765.40');
  });

  it('uses primary flag (is_default) to mark primary card', () => {
    const rows: PaymentSourceRow[] = [
      { id: 'a', user_id: 'u', name: 'Solo', source_type: 'bank', balance: 100, is_default: true, color: null },
    ];
    expect(shapeCards(rows)[0].primary).toBe(true);
  });
});
