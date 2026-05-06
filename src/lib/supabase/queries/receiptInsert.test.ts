import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExtractedReceiptData } from '@/lib/api/finpersona';

// Build a chainable mock: from().insert().select().single() resolves with
// whatever the test sets ahead of time.
const singleMock = vi.fn();
const selectMock = vi.fn(() => ({ single: singleMock }));
const insertMock = vi.fn(() => ({ select: selectMock }));
const fromMock = vi.fn((_table?: string) => ({ insert: insertMock }));

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [string])) },
}));

import {
  toReceiptInsert,
  insertReceipt,
  insertManualReceipt,
} from './receiptInsert';

const baseExtracted: ExtractedReceiptData = {
  merchant: 'Kinokuniya',
  date: '2026-04-15',
  total: 142,
  currency: 'MYR',
  items: [],
  suggested_category: 'lifestyle',
  category_confidence: 0.9,
  reasoning: 'books',
  is_eligible: true,
  eligibility_explanation: 'lifestyle eligible',
  tax_relief_rules: [],
};

const baseDraft = {
  userId: 'u1',
  merchantName: 'Kinokuniya KLCC',
  receiptDate: '2026-04-15',
  totalAmount: 142,
  currency: 'MYR',
  category: 'lifestyle',
  isClaimable: true,
  imageUrl: 'https://b2/img.jpg',
  imageFileId: 'f1',
  extracted: baseExtracted,
  sourceId: 'src-x',
};

describe('toReceiptInsert', () => {
  it('maps draft fields onto the receipts row shape', () => {
    const row = toReceiptInsert(baseDraft);
    expect(row).toEqual({
      user_id: 'u1',
      merchant_name: 'Kinokuniya KLCC',
      receipt_date: '2026-04-15',
      total_amount: 142,
      currency: 'MYR',
      category: 'lifestyle',
      image_url: 'https://b2/img.jpg',
      image_file_id: 'f1',
      extracted_data: baseExtracted,
      is_verified: true,
      is_claimable: true,
      tax_year: 2026,
      source_id: 'src-x',
    });
  });

  it('derives tax_year from the receipt_date year', () => {
    const row = toReceiptInsert({ ...baseDraft, receiptDate: '2024-12-31' });
    expect(row.tax_year).toBe(2024);
  });

  it('passes a null category through (uncategorized receipts)', () => {
    const row = toReceiptInsert({ ...baseDraft, category: null });
    expect(row.category).toBeNull();
  });

  it('passes null image fields through (no upload yet)', () => {
    const row = toReceiptInsert({
      ...baseDraft,
      imageUrl: null,
      imageFileId: null,
    });
    expect(row.image_url).toBeNull();
    expect(row.image_file_id).toBeNull();
  });

  it('throws when receipt_date is not a parseable YYYY-MM-DD', () => {
    expect(() =>
      toReceiptInsert({ ...baseDraft, receiptDate: 'not-a-date' }),
    ).toThrow(/Invalid receipt_date/);
  });

  it('marks is_verified true (user just confirmed the form)', () => {
    const row = toReceiptInsert(baseDraft);
    expect(row.is_verified).toBe(true);
  });
});

describe('insertReceipt', () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockClear();
    selectMock.mockClear();
    singleMock.mockReset();
  });

  it('inserts the mapped row and returns the new id', async () => {
    singleMock.mockResolvedValue({ data: { id: 'new-id' }, error: null });
    const out = await insertReceipt(baseDraft);
    expect(out).toEqual({ id: 'new-id' });
    expect(fromMock).toHaveBeenCalledWith('receipts');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        merchant_name: 'Kinokuniya KLCC',
        tax_year: 2026,
      }),
    );
    expect(selectMock).toHaveBeenCalledWith('id');
  });

  it('throws when supabase returns an error', async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: { message: 'rls violation' },
    });
    await expect(insertReceipt(baseDraft)).rejects.toMatchObject({
      message: 'rls violation',
    });
  });

  it('throws when the insert returns no row data', async () => {
    singleMock.mockResolvedValue({ data: null, error: null });
    await expect(insertReceipt(baseDraft)).rejects.toThrow(/no row/);
  });
});

describe('insertManualReceipt', () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockClear();
    selectMock.mockClear();
    singleMock.mockReset();
  });

  const manualArgs = {
    userId: 'u1',
    merchantName: 'Tesco Mutiara',
    receiptDate: '2026-04-15',
    totalAmount: 89.5,
    purchaseType: 'groceries',
    sourceId: 'src-default',
  };

  it('inserts a manual-entry row tagged with source_id and returns the id', async () => {
    singleMock.mockResolvedValue({ data: { id: 'manual-id' }, error: null });
    const out = await insertManualReceipt(manualArgs);
    expect(out).toEqual({ id: 'manual-id' });
    expect(fromMock).toHaveBeenCalledWith('receipts');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        merchant_name: 'Tesco Mutiara',
        receipt_date: '2026-04-15',
        total_amount: 89.5,
        currency: 'MYR',
        // Manual entries always go in as 'uncategorized' tax_category — the
        // user's PURCHASE_TYPES pick is preserved as free-text on subcategory.
        // Mirrors finpersona/components/receipt/receipt-upload-modal.tsx.
        category: 'uncategorized',
        subcategory: 'groceries',
        is_claimable: false,
        is_manual_entry: true,
        points_eligible: false,
        source_id: 'src-default',
        tax_year: 2026,
      }),
    );
    expect(selectMock).toHaveBeenCalledWith('id');
  });

  it('derives tax_year from the receipt_date year', async () => {
    singleMock.mockResolvedValue({ data: { id: 'm2' }, error: null });
    await insertManualReceipt({ ...manualArgs, receiptDate: '2024-06-01' });
    const inserted = (insertMock.mock.calls[0] as unknown[])[0] as { tax_year: number };
    expect(inserted.tax_year).toBe(2024);
  });

  it('throws when supabase returns an error', async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: { message: 'rls violation' },
    });
    await expect(insertManualReceipt(manualArgs)).rejects.toMatchObject({
      message: 'rls violation',
    });
  });

  it('throws when the insert returns no row data', async () => {
    singleMock.mockResolvedValue({ data: null, error: null });
    await expect(insertManualReceipt(manualArgs)).rejects.toThrow(/no row/);
  });
});
