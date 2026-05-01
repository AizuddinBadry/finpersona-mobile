/**
 * Cards screen query — pulls payment sources for the user and reshapes
 * them into the CardItem shape Phase 2's Cards.tsx renders. The DB schema
 * (migration 020_payment_sources.sql) does not store last4 / currency /
 * gradient, so those visual bits are synthesized:
 *   - last4: '••••' placeholder (Phase 4 may add a `last_four` column)
 *   - currency: 'MYR' (only currency the schema supports today)
 *   - gradient: rotated through a small palette so multiple cards still
 *     look distinct in the stack
 *   - flag: 🇲🇾 (matches MYR default)
 *
 * Move-money form fixture and auto-deduct rules stay in cardsMock — they
 * are UI-only fixtures with no backing schema yet.
 */
import { supabase } from '@/lib/supabase/client';
import type { CardItem, CardsMock } from '@/mocks/seed';
import { cardsMock } from '@/mocks/seed';

export type PaymentSourceRow = {
  id: string;
  user_id: string;
  name: string;
  source_type: string;
  balance: string | number; // numeric comes back as string from PostgREST
  is_default: boolean;
  color: string | null;
};

const GRADIENTS = [
  'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)',
  'linear-gradient(140deg, #1A1530 0%, #3A3458 100%)',
  'linear-gradient(140deg, #1FB573 0%, #34D89B 100%)',
  'linear-gradient(140deg, #B14CE6 0%, #E673F0 100%)',
];

function gradientFor(index: number, isPrimary: boolean): string {
  // Primary card always gets the canonical purple to match the mockup.
  if (isPrimary) return GRADIENTS[0];
  return GRADIENTS[(index % (GRADIENTS.length - 1)) + 1];
}

export function shapeCards(rows: PaymentSourceRow[]): CardItem[] {
  // Sort: default first, then by balance desc — same visual priority as the mock.
  const sorted = [...rows].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return Number(b.balance) - Number(a.balance);
  });

  return sorted.map<CardItem>((r, i) => ({
    id: r.id,
    name: r.name,
    last4: '••••',
    amount: Number(r.balance).toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    currency: 'MYR',
    flag: '🇲🇾',
    gradient: gradientFor(i, r.is_default),
    primary: r.is_default || undefined,
  }));
}

export async function fetchCards(userId: string): Promise<CardsMock> {
  const { data, error } = await supabase
    .from('payment_sources')
    .select('id, user_id, name, source_type, balance, is_default, color')
    .eq('user_id', userId);
  if (error) throw error;

  const rows = (data ?? []) as PaymentSourceRow[];
  if (rows.length === 0) {
    // Brand-new user with no sources yet: keep the mock visible so the screen
    // still has something to render.
    return cardsMock;
  }

  return {
    cards: shapeCards(rows),
    move: cardsMock.move,
    rules: cardsMock.rules,
  };
}
