import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useAdvisorSend } from './useAdvisorSend';
import type { AdvisorChatResponse } from '@/lib/api/finpersona';
import type { AdvisorMock } from '@/mocks/seed';
import { advisorMock } from '@/mocks/seed';

const mockedUseAuth = vi.mocked(useAuth);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children),
  };
}

const sampleResponse: AdvisorChatResponse = {
  id: 'row-1',
  text: 'Spending looks healthy.',
  blocks: [],
  suggestionChips: [],
};

beforeEach(() => {
  mockedUseAuth.mockReturnValue({
    session: null,
    user: { id: 'u1' } as never,
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
  });
});

describe('useAdvisorSend', () => {
  it('optimistically appends a user bubble before the request resolves', async () => {
    const { qc, wrapper } = makeWrapper();
    // Seed a starting cache entry so we can observe the optimistic write.
    qc.setQueryData<AdvisorMock>(['advisor', 'u1'], advisorMock);

    let resolve: (v: AdvisorChatResponse) => void = () => {};
    const postAdvisorMessage = vi.fn(
      () => new Promise<AdvisorChatResponse>((r) => (resolve = r)),
    );

    const { result } = renderHook(
      () => useAdvisorSend({ postAdvisorMessage }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('How am I doing?');
    });

    await waitFor(() => {
      const cached = qc.getQueryData<AdvisorMock>(['advisor', 'u1']);
      const last = cached?.messages.at(-1);
      expect(last).toEqual({ kind: 'text', from: 'user', text: 'How am I doing?' });
    });

    // Resolve so the test cleans up cleanly.
    act(() => {
      resolve(sampleResponse);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('invalidates the advisor query on success so the canonical read path runs', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData<AdvisorMock>(['advisor', 'u1'], advisorMock);
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const postAdvisorMessage = vi.fn().mockResolvedValue(sampleResponse);

    const { result } = renderHook(
      () => useAdvisorSend({ postAdvisorMessage }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync('hi');
    });

    expect(postAdvisorMessage).toHaveBeenCalledWith({ message: 'hi' });
    const keys = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: string[] }).queryKey,
    );
    expect(keys).toContainEqual(['advisor', 'u1']);
  });

  it('rolls the cache back to its previous snapshot on error', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData<AdvisorMock>(['advisor', 'u1'], advisorMock);
    const postAdvisorMessage = vi
      .fn()
      .mockRejectedValue(new Error('Claude rate limited'));

    const { result } = renderHook(
      () => useAdvisorSend({ postAdvisorMessage }),
      { wrapper },
    );

    await act(async () => {
      await result.current
        .mutateAsync('hi')
        .catch(() => {
          /* expected — we asserted via isError below */
        });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData<AdvisorMock>(['advisor', 'u1']);
    // Snapshot restored — the optimistic 'hi' bubble is gone.
    expect(cached).toEqual(advisorMock);
  });

  it('clears the optimistic entry on error when there was no prior snapshot', async () => {
    const { qc, wrapper } = makeWrapper();
    // No prior cache entry — first message in the session.
    expect(qc.getQueryData(['advisor', 'u1'])).toBeUndefined();

    const postAdvisorMessage = vi
      .fn()
      .mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(
      () => useAdvisorSend({ postAdvisorMessage }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync('hi').catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // We must not leave a half-formed AdvisorMock in cache that lacks the
    // assistant's reply — the read path should be allowed to fetch fresh.
    expect(qc.getQueryData(['advisor', 'u1'])).toBeUndefined();
  });
});
