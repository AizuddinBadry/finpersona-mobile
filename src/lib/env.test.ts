import { describe, it, expect } from 'vitest';
import { assertEnv } from './env';

describe('assertEnv', () => {
  it('throws when SUPABASE_URL is missing', () => {
    expect(() =>
      assertEnv({
        SUPABASE_URL: '',
        SUPABASE_ANON_KEY: 'k',
        API_BASE_URL: 'x',
        APPLE_SERVICES_ID: '',
      }),
    ).toThrow(/VITE_SUPABASE_URL/);
  });

  it('throws when SUPABASE_ANON_KEY is missing', () => {
    expect(() =>
      assertEnv({
        SUPABASE_URL: 'u',
        SUPABASE_ANON_KEY: '',
        API_BASE_URL: 'x',
        APPLE_SERVICES_ID: '',
      }),
    ).toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it('returns env when all required values present', () => {
    const e = assertEnv({
      SUPABASE_URL: 'u',
      SUPABASE_ANON_KEY: 'k',
      API_BASE_URL: 'x',
      APPLE_SERVICES_ID: '',
    });
    expect(e.SUPABASE_URL).toBe('u');
    expect(e.SUPABASE_ANON_KEY).toBe('k');
  });

  it('reports all missing keys at once', () => {
    expect(() =>
      assertEnv({
        SUPABASE_URL: '',
        SUPABASE_ANON_KEY: '',
        API_BASE_URL: 'x',
        APPLE_SERVICES_ID: '',
      }),
    ).toThrow(/VITE_SUPABASE_URL.*VITE_SUPABASE_ANON_KEY/);
  });
});
