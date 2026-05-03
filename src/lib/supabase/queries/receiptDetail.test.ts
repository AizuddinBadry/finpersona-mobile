import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a chainable mock for the receipts table. The chains used:
//   fetchReceipt:  from().select().eq(id).eq(user_id).single()
//   updateReceipt: from().update().eq(id).eq(user_id).select().single()
//   deleteReceipt: from().delete().eq(id).eq(user_id)
const singleMock = vi.fn();
const selectAfterUpdateMock = vi.fn(() => ({ single: singleMock }));
const eqUserSelectMock = vi.fn(() => ({ single: singleMock }));
const eqIdSelectMock = vi.fn(() => ({ eq: eqUserSelectMock }));
const selectMock = vi.fn(() => ({ eq: eqIdSelectMock }));

const eqUserUpdateMock = vi.fn(() => ({ select: selectAfterUpdateMock }));
const eqIdUpdateMock = vi.fn(() => ({ eq: eqUserUpdateMock }));
const updateMock = vi.fn(() => ({ eq: eqIdUpdateMock }));

const deleteResolver = vi.fn();
const eqUserDeleteMock = vi.fn(() => deleteResolver());
const eqIdDeleteMock = vi.fn(() => ({ eq: eqUserDeleteMock }));
const deleteMock = vi.fn(() => ({ eq: eqIdDeleteMock }));

const fromMock = vi.fn(() => ({
  select: selectMock,
  update: updateMock,
  delete: deleteMock,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { fetchReceipt, updateReceipt, deleteReceipt } from './receiptDetail';

const sampleRow = {
  id: 'r1',
  user_id: 'u1',
  merchant_name: 'Kinokuniya KLCC',
  receipt_date: '2026-04-15',
  total_amount: 142,
  currency: 'MYR',
  category: 'lifestyle',
  is_claimable: true,
  image_url: 'https://b2/img.jpg',
  extracted_data: {
    reasoning: 'books',
    eligibility_explanation: 'lifestyle eligible',
  },
  created_at: '2026-04-15T10:00:00Z',
};

beforeEach(() => {
  fromMock.mockClear();
  selectMock.mockClear();
  eqIdSelectMock.mockClear();
  eqUserSelectMock.mockClear();
  singleMock.mockReset();
  updateMock.mockClear();
  eqIdUpdateMock.mockClear();
  eqUserUpdateMock.mockClear();
  selectAfterUpdateMock.mockClear();
  deleteMock.mockClear();
  eqIdDeleteMock.mockClear();
  eqUserDeleteMock.mockClear();
  deleteResolver.mockReset();
});

describe('fetchReceipt', () => {
  it('selects the row scoped by id and user_id and returns it', async () => {
    singleMock.mockResolvedValue({ data: sampleRow, error: null });
    const out = await fetchReceipt('r1', 'u1');
    expect(out).toEqual(sampleRow);
    expect(fromMock).toHaveBeenCalledWith('receipts');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqIdSelectMock).toHaveBeenCalledWith('id', 'r1');
    expect(eqUserSelectMock).toHaveBeenCalledWith('user_id', 'u1');
    expect(singleMock).toHaveBeenCalled();
  });

  it('throws when supabase returns an error', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'not found' } });
    await expect(fetchReceipt('r1', 'u1')).rejects.toMatchObject({
      message: 'not found',
    });
  });
});

describe('updateReceipt', () => {
  it('maps camelCase patch fields to snake_case columns and filters by id + user_id', async () => {
    const updated = { ...sampleRow, merchant_name: 'Kinokuniya Pavilion', total_amount: 150 };
    singleMock.mockResolvedValue({ data: updated, error: null });

    const out = await updateReceipt({
      id: 'r1',
      userId: 'u1',
      merchantName: 'Kinokuniya Pavilion',
      totalAmount: 150,
      isClaimable: false,
    });

    expect(out).toEqual(updated);
    expect(fromMock).toHaveBeenCalledWith('receipts');
    expect(updateMock).toHaveBeenCalledWith({
      merchant_name: 'Kinokuniya Pavilion',
      total_amount: 150,
      is_claimable: false,
    });
    expect(eqIdUpdateMock).toHaveBeenCalledWith('id', 'r1');
    expect(eqUserUpdateMock).toHaveBeenCalledWith('user_id', 'u1');
    expect(selectAfterUpdateMock).toHaveBeenCalled();
    expect(singleMock).toHaveBeenCalled();
  });

  it('throws when supabase returns an error', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'rls violation' } });
    await expect(
      updateReceipt({ id: 'r1', userId: 'u1', merchantName: 'X' }),
    ).rejects.toMatchObject({ message: 'rls violation' });
  });
});

describe('deleteReceipt', () => {
  it('deletes the row scoped by id and user_id and returns {id}', async () => {
    deleteResolver.mockResolvedValue({ data: null, error: null });
    const out = await deleteReceipt({ id: 'r1', userId: 'u1' });
    expect(out).toEqual({ id: 'r1' });
    expect(fromMock).toHaveBeenCalledWith('receipts');
    expect(deleteMock).toHaveBeenCalled();
    expect(eqIdDeleteMock).toHaveBeenCalledWith('id', 'r1');
    expect(eqUserDeleteMock).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('throws when supabase returns an error', async () => {
    deleteResolver.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    await expect(deleteReceipt({ id: 'r1', userId: 'u1' })).rejects.toMatchObject({
      message: 'forbidden',
    });
  });
});
