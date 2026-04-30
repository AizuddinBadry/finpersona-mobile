import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  /** True until the first auth event arrives (initial getSession + state subscription). */
  isLoading: boolean;
  setSession: (s: Session | null) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session, isLoading: false }),
  clearSession: () => set({ session: null, isLoading: false }),
}));
