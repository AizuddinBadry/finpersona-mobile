import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Supabase JS expects a `storage` adapter with get/set/remove. On native we
 * persist tokens via Capacitor Preferences (which stores in iOS UserDefaults
 * and Android SharedPreferences); on web fallback to localStorage so the
 * adapter still works under `vite preview` and Vitest happy-dom.
 */
const isNative = Capacitor.isNativePlatform();

export const supabaseStorage = isNative
  ? {
      async getItem(key: string): Promise<string | null> {
        const { value } = await Preferences.get({ key });
        return value;
      },
      async setItem(key: string, value: string): Promise<void> {
        await Preferences.set({ key, value });
      },
      async removeItem(key: string): Promise<void> {
        await Preferences.remove({ key });
      },
    }
  : {
      getItem(key: string): string | null {
        return window.localStorage.getItem(key);
      },
      setItem(key: string, value: string): void {
        window.localStorage.setItem(key, value);
      },
      removeItem(key: string): void {
        window.localStorage.removeItem(key);
      },
    };
