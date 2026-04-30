import { describe, it, expect, beforeEach } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore } from './authStore';

const fakeSession = (id = 'u1'): Session =>
  ({ user: { id, email: 'x@y' } } as unknown as Session);

describe('authStore', () => {
  beforeEach(() => {
    // Reset to initial-ish state; mark loading so tests can assert hydration.
    useAuthStore.setState({ session: null, isLoading: true });
  });

  it('starts with no session and isLoading=true', () => {
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it('setSession populates session and clears loading', () => {
    useAuthStore.getState().setSession(fakeSession());
    const s = useAuthStore.getState();
    expect(s.session?.user.id).toBe('u1');
    expect(s.isLoading).toBe(false);
  });

  it('setSession(null) clears session but still ends loading', () => {
    useAuthStore.getState().setSession(null);
    const s = useAuthStore.getState();
    expect(s.session).toBeNull();
    expect(s.isLoading).toBe(false);
  });

  it('clearSession wipes session and ends loading', () => {
    useAuthStore.getState().setSession(fakeSession());
    useAuthStore.getState().clearSession();
    const s = useAuthStore.getState();
    expect(s.session).toBeNull();
    expect(s.isLoading).toBe(false);
  });
});
