/**
 * Receipt detail queries — fetch / update / delete a single receipt row for
 * the /receipts/:id screen. RLS already scopes rows to the authenticated
 * user (auth.uid() = user_id), but every call here also passes a redundant
 * `user_id` filter alongside `id` as defense-in-depth: a token leak that
 * somehow bypassed RLS would still need to know the victim's user_id to
 * mutate or read their data.
 *
 * The boundary between the screen and the DB is camelCase ↔ snake_case.
 * Callers (React components, hooks) deal in camelCase patches like
 * `{ merchantName, totalAmount }`; the snake_case translation happens
 * inside updateReceipt and never leaks outside this module.
 *
 * The fetched ReceiptRow keeps DB-native snake_case so a single typed row
 * can be passed through React Query without per-screen reshaping. The
 * detail screen reads `extracted_data.reasoning` and
 * `extracted_data.eligibility_explanation` for the AI rationale block.
 */
import { supabase } from '@/lib/supabase/client';

export type ReceiptRow = {
  id: string;
  user_id: string;
  merchant_name: string;
  receipt_date: string; // YYYY-MM-DD
  total_amount: number;
  currency: string;
  category: string | null;
  is_claimable: boolean;
  image_url: string | null;
  extracted_data: {
    reasoning?: string;
    eligibility_explanation?: string;
    suggested_category?: string;
    category_confidence?: number;
    is_eligible?: boolean;
    tax_relief_rules?: string[];
    purchase_type?: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
};

export type ReceiptUpdate = {
  merchantName?: string;
  receiptDate?: string;
  totalAmount?: number;
  currency?: string;
  category?: string;
  isClaimable?: boolean;
};

export async function fetchReceipt(id: string, userId: string): Promise<ReceiptRow> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data as ReceiptRow;
}

/**
 * Translate a camelCase patch onto the receipts row shape. Only present
 * keys are emitted so undefined fields never overwrite DB values.
 */
function toSnakePatch(patch: ReceiptUpdate): Record<string, unknown> {
  const snake: Record<string, unknown> = {};
  if (patch.merchantName !== undefined) snake.merchant_name = patch.merchantName;
  if (patch.receiptDate !== undefined) snake.receipt_date = patch.receiptDate;
  if (patch.totalAmount !== undefined) snake.total_amount = patch.totalAmount;
  if (patch.currency !== undefined) snake.currency = patch.currency;
  if (patch.category !== undefined) snake.category = patch.category;
  if (patch.isClaimable !== undefined) snake.is_claimable = patch.isClaimable;
  return snake;
}

export async function updateReceipt(
  args: { id: string; userId: string } & ReceiptUpdate,
): Promise<ReceiptRow> {
  const { id, userId, ...patch } = args;
  const snakePatch = toSnakePatch(patch);
  const { data, error } = await supabase
    .from('receipts')
    .update(snakePatch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as ReceiptRow;
}

export async function deleteReceipt(args: { id: string; userId: string }): Promise<{ id: string }> {
  const { id, userId } = args;
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  return { id };
}
