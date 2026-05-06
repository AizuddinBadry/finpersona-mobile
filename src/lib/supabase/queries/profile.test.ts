import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a chainable mock for the profiles table. The chains used:
//   fetchProfile:           from().select().eq(id).single()
//   updateProfilePersona:   from().update().eq(id).select().single()
const singleMock = vi.fn();
const selectAfterUpdateMock = vi.fn(() => ({ single: singleMock }));
const eqIdSelectMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqIdSelectMock }));

const eqIdUpdateMock = vi.fn(() => ({ select: selectAfterUpdateMock }));
const updateMock = vi.fn(() => ({ eq: eqIdUpdateMock }));

const fromMock = vi.fn((_table?: string) => ({
  select: selectMock,
  update: updateMock,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [string])) },
}));

import { fetchProfile, updateProfilePersona } from './profile';

const sampleRow = {
  id: 'u1',
  advisor_persona: 'analyst' as const,
  full_name: 'Aizuddin Badry',
};

beforeEach(() => {
  fromMock.mockClear();
  selectMock.mockClear();
  eqIdSelectMock.mockClear();
  singleMock.mockReset();
  updateMock.mockClear();
  eqIdUpdateMock.mockClear();
  selectAfterUpdateMock.mockClear();
});

describe('fetchProfile', () => {
  it('selects the profile row scoped by id and returns it', async () => {
    singleMock.mockResolvedValue({ data: sampleRow, error: null });
    const out = await fetchProfile('u1');
    expect(out).toEqual(sampleRow);
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(selectMock).toHaveBeenCalledWith('id, advisor_persona, full_name');
    expect(eqIdSelectMock).toHaveBeenCalledWith('id', 'u1');
    expect(singleMock).toHaveBeenCalled();
  });

  it('throws when supabase returns an error', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'not found' } });
    await expect(fetchProfile('u1')).rejects.toMatchObject({ message: 'not found' });
  });
});

describe('updateProfilePersona', () => {
  it('updates advisor_persona scoped by id and returns the updated row', async () => {
    const updated = { ...sampleRow, advisor_persona: 'coach' as const };
    singleMock.mockResolvedValue({ data: updated, error: null });

    const out = await updateProfilePersona({ userId: 'u1', persona: 'coach' });

    expect(out).toEqual(updated);
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(updateMock).toHaveBeenCalledWith({ advisor_persona: 'coach' });
    expect(eqIdUpdateMock).toHaveBeenCalledWith('id', 'u1');
    expect(selectAfterUpdateMock).toHaveBeenCalledWith('id, advisor_persona, full_name');
    expect(singleMock).toHaveBeenCalled();
  });

  it('throws when supabase returns an error', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'rls violation' } });
    await expect(
      updateProfilePersona({ userId: 'u1', persona: 'witty' }),
    ).rejects.toMatchObject({ message: 'rls violation' });
  });
});
