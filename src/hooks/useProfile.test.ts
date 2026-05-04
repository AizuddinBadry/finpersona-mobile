import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdatePersona } from './useProfile';
import type { ProfileRow } from '@/lib/supabase/queries/profile';

const mockedUseAuth = vi.mocked(useAuth);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children),
  };
}

const sampleProfile: ProfileRow = {
  id: 'user-1',
  full_name: 'Aiman',
  advisor_persona: 'analyst',
};

beforeEach(() => {
  mockedUseAuth.mockReturnValue({
    session: null,
    user: { id: 'user-1' } as never,
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
  });
});

describe('useProfile', () => {
  it('calls injected fetchProfile with the authenticated userId and exposes data', async () => {
    const { wrapper } = makeWrapper();
    const fetchProfile = vi.fn().mockResolvedValue(sampleProfile);

    const { result } = renderHook(() => useProfile({ fetchProfile }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProfile).toHaveBeenCalledWith('user-1');
    expect(result.current.data).toEqual(sampleProfile);
  });

  it('exposes error state when the query rejects', async () => {
    const { wrapper } = makeWrapper();
    const fetchProfile = vi.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useProfile({ fetchProfile }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useUpdatePersona', () => {
  it('optimistically updates the profile cache before the mutation resolves', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData<ProfileRow>(['profile', 'user-1'], sampleProfile);

    let resolveMutation!: (row: ProfileRow) => void;
    const updatePromise = new Promise<ProfileRow>((res) => {
      resolveMutation = res;
    });
    const updateProfilePersona = vi.fn().mockReturnValue(updatePromise);

    const { result } = renderHook(
      () => useUpdatePersona({ updateProfilePersona }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('coach');
    });

    await waitFor(() => {
      const cached = qc.getQueryData<ProfileRow>(['profile', 'user-1']);
      expect(cached?.advisor_persona).toBe('coach');
    });

    expect(updateProfilePersona).toHaveBeenCalledWith({
      userId: 'user-1',
      persona: 'coach',
    });

    // Resolve so cleanup is clean.
    act(() => {
      resolveMutation({ ...sampleProfile, advisor_persona: 'coach' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("invalidates ['advisor', uid] on success", async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData<ProfileRow>(['profile', 'user-1'], sampleProfile);
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const updateProfilePersona = vi
      .fn()
      .mockResolvedValue({ ...sampleProfile, advisor_persona: 'coach' });

    const { result } = renderHook(
      () => useUpdatePersona({ updateProfilePersona }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync('coach');
    });

    const keys = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: unknown[] }).queryKey,
    );
    expect(keys).toContainEqual(['advisor', 'user-1']);
  });

  it('rolls back the optimistic update when the mutation fails', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData<ProfileRow>(['profile', 'user-1'], sampleProfile);
    const updateProfilePersona = vi
      .fn()
      .mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(
      () => useUpdatePersona({ updateProfilePersona }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync('witty').catch(() => {
        /* expected — asserted via isError */
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(qc.getQueryData<ProfileRow>(['profile', 'user-1'])).toEqual(
      sampleProfile,
    );
  });

  it('does not throw on error when there was no previous cache snapshot', async () => {
    const { qc, wrapper } = makeWrapper();
    expect(qc.getQueryData(['profile', 'user-1'])).toBeUndefined();

    const updateProfilePersona = vi
      .fn()
      .mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(
      () => useUpdatePersona({ updateProfilePersona }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync('coach').catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // No snapshot to restore — cache stays empty (no half-written row).
    expect(qc.getQueryData(['profile', 'user-1'])).toBeUndefined();
  });
});
