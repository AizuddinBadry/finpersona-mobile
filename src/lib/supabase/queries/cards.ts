/**
 * Cards screen query — pulls payment sources for the user and reshapes
 * them into the CardItem shape the Cards screen renders. The DB schema
 * (migration 020_payment_sources.sql) does not store last4 / currency /
 * gradient, so those visual bits are synthesized:
 *   - last4: '••••' placeholder
 *   - currency: 'MYR' (only currency the schema supports today)
 *   - gradient: derived from the source's `color` column, falling back to
 *     a rotating palette so multiple cards look distinct
 *   - flag: 🇲🇾 (matches MYR default)
 *
 * Mutation functions (addSource, editSource, etc.) call Supabase directly
 * with the anon-key session — RLS enforces user ownership.
 */
import { supabase } from '@/lib/supabase/client';
import type { CardItem, CardsMock } from '@/mocks/seed';
import { cardsMock } from '@/mocks/seed';

export type PaymentSourceRow = {
  id: string;
  user_id: string;
  name: string;
  source_type: string;
  balance: string | number;
  is_default: boolean;
  color: string | null;
};

const PALETTE_GRADIENTS = [
  'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)',
  'linear-gradient(140deg, #1A1530 0%, #3A3458 100%)',
  'linear-gradient(140deg, #1FB573 0%, #4DD7A0 100%)',
  'linear-gradient(140deg, #B14CE6 0%, #E673F0 100%)',
];

function colorToGradient(color: string | null, index: number, isPrimary: boolean): string {
  if (isPrimary) return PALETTE_GRADIENTS[0]!;
  if (color) {
    // Build a gradient from the stored hex color
    return `linear-gradient(140deg, ${color} 0%, ${color}CC 100%)`;
  }
  return PALETTE_GRADIENTS[(index % (PALETTE_GRADIENTS.length - 1)) + 1]!;
}

export function shapeCards(rows: PaymentSourceRow[]): CardItem[] {
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
    gradient: colorToGradient(r.color, i, r.is_default),
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
  if (rows.length === 0) return cardsMock;

  return {
    cards: shapeCards(rows),
    move: cardsMock.move,
  };
}

// ---------- mutations ----------

export type AddSourceInput = {
  name: string;
  source_type: string;
  color: string;
  initial_balance: number;
};

export async function addSource(userId: string, input: AddSourceInput): Promise<void> {
  const { error } = await supabase.from('payment_sources').insert({
    user_id: userId,
    name: input.name.trim(),
    source_type: input.source_type,
    color: input.color,
    balance: input.initial_balance,
    initial_balance: input.initial_balance,
  });
  if (error) throw new Error(error.message);
}

export type EditSourceInput = { name: string; color: string };

export async function editSource(sourceId: string, input: EditSourceInput): Promise<void> {
  const { error } = await supabase
    .from('payment_sources')
    .update({ name: input.name.trim(), color: input.color, updated_at: new Date().toISOString() })
    .eq('id', sourceId);
  if (error) throw new Error(error.message);
}

/**
 * Set a source as the default (primary). Clears the old default first, then
 * sets the new one — two sequential updates is acceptable since the brief
 * in-between state is never visible to the user.
 */
export async function setPrimarySource(userId: string, sourceId: string): Promise<void> {
  const { error: clearErr } = await supabase
    .from('payment_sources')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_default', true);
  if (clearErr) throw new Error(clearErr.message);

  const { error: setErr } = await supabase
    .from('payment_sources')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', sourceId);
  if (setErr) throw new Error(setErr.message);
}

export async function addMoneyToSource(
  sourceId: string,
  amount: number,
  description = 'Manual top-up',
): Promise<void> {
  const { error } = await supabase.rpc('add_money_to_source', {
    p_source_id: sourceId,
    p_amount: amount,
    p_description: description,
  });
  if (error) throw new Error(error.message);
}

export async function transferBetweenSources(
  fromId: string,
  toId: string,
  amount: number,
): Promise<void> {
  if (fromId === toId) throw new Error('Source and destination must differ.');
  const { error } = await supabase.rpc('transfer_between_sources', {
    p_from_source_id: fromId,
    p_to_source_id: toId,
    p_amount: amount,
  });
  if (error) {
    const msg = error.message ?? '';
    if (/insufficient|balance/i.test(msg)) throw new Error('Insufficient balance for this transfer.');
    if (/must be positive/i.test(msg)) throw new Error('Transfer amount must be greater than 0.');
    throw new Error('Transfer failed. Please try again.');
  }
}
