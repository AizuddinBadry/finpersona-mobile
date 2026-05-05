/**
 * payment_sources query layer for the receipt source-picker flow.
 *
 * Returns raw-ish PaymentSource rows ordered (is_default desc, created_at asc)
 * so the receipt capture sheet / manual form can render the user's sources
 * with the default one pinned at the top. This is intentionally separate from
 * `cards.ts` (which reshapes the same table into the visual CardItem mock).
 *
 * The DB schema (migration 020_payment_sources.sql) does not store `last4` or
 * `currency`, so those visual bits are synthesized here to match the web
 * receipt modal and `cards.ts`:
 *   - last4: '••••' placeholder
 *   - currency: 'MYR' (only currency the schema supports today)
 */
import { supabase } from '@/lib/supabase/client';

export type PaymentSource = {
  id: string;
  name: string;
  last4: string;
  balance: number;
  currency: string;
  source_type: string;
  is_default: boolean;
};

type PaymentSourceRow = {
  id: string;
  name: string;
  source_type: string;
  balance: string | number; // numeric → string from PostgREST
  is_default: boolean;
  created_at: string;
};

export async function fetchPaymentSources(
  userId: string,
): Promise<PaymentSource[]> {
  const { data, error } = await supabase
    .from('payment_sources')
    .select('id, name, source_type, balance, is_default, created_at')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as PaymentSourceRow[];
  return rows.map<PaymentSource>((r) => ({
    id: r.id,
    name: r.name,
    last4: '••••',
    balance: Number(r.balance),
    currency: 'MYR',
    source_type: r.source_type,
    is_default: r.is_default,
  }));
}
