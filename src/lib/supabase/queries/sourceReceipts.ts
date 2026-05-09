/**
 * sourceReceipts — fetches receipts paid from a given payment_sources.id.
 *
 * Powers the "View receipts" sheet on the Sources screen so users can see
 * exactly what was deducted from each source. RLS scopes the read to the
 * authenticated user via the receipts.user_id policy, so the user_id filter
 * is defensive belt-and-braces only.
 *
 * Returns the slim ReceiptListItem shape the existing Activity / Insights /
 * Lhdn lists already render — no point inventing a new row type.
 */
import { supabase } from '@/lib/supabase/client';

export type SourceReceiptItem = {
  id: string;
  merchant_name: string;
  receipt_date: string; // ISO YYYY-MM-DD
  total_amount: number;
  category: string | null;
  is_claimable: boolean;
};

type Row = {
  id: string;
  merchant_name: string;
  receipt_date: string;
  total_amount: string | number; // PostgREST numeric → string
  category: string | null;
  is_claimable: boolean | null;
};

export async function fetchReceiptsBySource(
  userId: string,
  sourceId: string,
): Promise<SourceReceiptItem[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('id, merchant_name, receipt_date, total_amount, category, is_claimable')
    .eq('user_id', userId)
    .eq('source_id', sourceId)
    .order('receipt_date', { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    merchant_name: r.merchant_name,
    receipt_date: r.receipt_date,
    total_amount: Number(r.total_amount),
    category: r.category,
    is_claimable: r.is_claimable === true,
  }));
}
