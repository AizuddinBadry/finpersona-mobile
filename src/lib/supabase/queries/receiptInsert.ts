/**
 * Receipt insert — writes a new row to receipts after the user confirms the
 * AI-extracted values on the review screen. RLS scopes the insert to the
 * authenticated user (auth.uid() = user_id), so callers must be signed in.
 *
 * The full ExtractedReceiptData blob is preserved on the row's JSONB column
 * so we can re-derive any field later without another OCR roundtrip.
 *
 * Note: this is a thin adapter over the supabase client — the heavy lifting
 * (mapping form → row shape) is in toReceiptInsert() which is unit-testable
 * without the supabase chain.
 */
import { supabase } from '@/lib/supabase/client';
import type { ExtractedReceiptData } from '@/lib/api/finpersona';

export type ReceiptDraft = {
  userId: string;
  merchantName: string;
  receiptDate: string; // YYYY-MM-DD
  totalAmount: number;
  currency: string;
  category: string | null; // tax_category code, null for uncategorized
  isClaimable: boolean;
  imageUrl: string | null;
  imageFileId: string | null;
  extracted: ExtractedReceiptData;
};

export type ReceiptInsertRow = {
  user_id: string;
  merchant_name: string;
  receipt_date: string;
  total_amount: number;
  currency: string;
  category: string | null;
  image_url: string | null;
  image_file_id: string | null;
  extracted_data: ExtractedReceiptData;
  is_verified: boolean;
  is_claimable: boolean;
  tax_year: number;
};

/**
 * Map the review-form draft onto the receipts row shape. Tax year is derived
 * from the receipt date — splitting on '-' is safe because the date came
 * from extraction (always YYYY-MM-DD) or our own form (also YYYY-MM-DD).
 */
export function toReceiptInsert(draft: ReceiptDraft): ReceiptInsertRow {
  const taxYear = parseInt(draft.receiptDate.slice(0, 4), 10);
  if (Number.isNaN(taxYear)) {
    throw new Error(`Invalid receipt_date '${draft.receiptDate}' — must be YYYY-MM-DD`);
  }
  return {
    user_id: draft.userId,
    merchant_name: draft.merchantName,
    receipt_date: draft.receiptDate,
    total_amount: draft.totalAmount,
    currency: draft.currency,
    category: draft.category,
    image_url: draft.imageUrl,
    image_file_id: draft.imageFileId,
    extracted_data: draft.extracted,
    is_verified: true, // user just reviewed it on the confirm screen
    is_claimable: draft.isClaimable,
    tax_year: taxYear,
  };
}

export async function insertReceipt(draft: ReceiptDraft): Promise<{ id: string }> {
  const row = toReceiptInsert(draft);
  const { data, error } = await supabase
    .from('receipts')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Insert returned no row');
  return { id: data.id as string };
}

/**
 * Manual-entry args. Mirrors the web app's manual receipt modal
 * (finpersona/components/receipt/receipt-upload-modal.tsx): no extracted
 * blob, no image, just the user-typed merchant/date/total plus a
 * PURCHASE_TYPES pick and the payment source they tapped.
 *
 * Defaults set on the row:
 *   - `is_manual_entry: true` — distinguishes from scan flow
 *   - `is_claimable: false` — manual rows aren't auto-claimed; user can flip
 *     this from the receipt detail screen later
 *   - `points_eligible: false` — manual entries don't award points (mirrors
 *     migration 016_non_claimable_receipt_points.sql)
 *
 * Note: `purchaseType` is the user's PURCHASE_TYPES value (e.g. "groceries").
 * It is written to the row's `subcategory` column as free text. The row's
 * `category` column (a tax_category code) is hardcoded to "uncategorized" —
 * the auto-categoriser / tax-relief flow runs later, off the manual queue.
 */
export type ManualReceiptArgs = {
  userId: string;
  merchantName: string;
  receiptDate: string; // YYYY-MM-DD
  totalAmount: number;
  purchaseType: string; // PURCHASE_TYPES value, lands on row.subcategory
  sourceId: string;
};

export type ManualReceiptInsertRow = {
  user_id: string;
  merchant_name: string;
  receipt_date: string;
  total_amount: number;
  currency: string;
  category: string; // always 'uncategorized' for manual entries
  subcategory: string; // PURCHASE_TYPES value
  is_claimable: boolean;
  is_manual_entry: boolean;
  points_eligible: boolean;
  source_id: string;
  tax_year: number;
};

function toManualReceiptInsert(args: ManualReceiptArgs): ManualReceiptInsertRow {
  const taxYear = parseInt(args.receiptDate.slice(0, 4), 10);
  if (Number.isNaN(taxYear)) {
    throw new Error(`Invalid receipt_date '${args.receiptDate}' — must be YYYY-MM-DD`);
  }
  return {
    user_id: args.userId,
    merchant_name: args.merchantName,
    receipt_date: args.receiptDate,
    total_amount: args.totalAmount,
    currency: 'MYR',
    category: 'uncategorized',
    subcategory: args.purchaseType,
    is_claimable: false,
    is_manual_entry: true,
    points_eligible: false,
    source_id: args.sourceId,
    tax_year: taxYear,
  };
}

export async function insertManualReceipt(
  args: ManualReceiptArgs,
): Promise<{ id: string }> {
  const row = toManualReceiptInsert(args);
  const { data, error } = await supabase
    .from('receipts')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Insert returned no row');
  return { id: data.id as string };
}
