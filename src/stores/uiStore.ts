import { create } from 'zustand';

export type Toast = {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
};

type UIState = {
  toasts: Toast[];
  pushToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
};

/**
 * Minimal UI state. Phase 1 wires the store + push API so error paths in the
 * auth flow have a place to report; Phase 2 adds the visible <Toaster>.
 */
export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  pushToast: (message, tone = 'info') =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id: crypto.randomUUID(), message, tone },
      ],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
