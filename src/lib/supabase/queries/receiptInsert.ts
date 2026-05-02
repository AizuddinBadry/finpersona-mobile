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
