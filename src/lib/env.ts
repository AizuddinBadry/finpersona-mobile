export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_BASE_URL: string;
  APPLE_SERVICES_ID: string;
};

export function readEnv(): Env {
  return {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
    APPLE_SERVICES_ID: import.meta.env.VITE_APPLE_SERVICES_ID ?? '',
  };
}

export function assertEnv(e: Env): Env {
  const missing: string[] = [];
  if (!e.SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!e.SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  return e;
}

/**
 * Validated runtime env. Lazily computed on first access so importing this
 * module in tests / tools doesn't require the .env values to be present —
 * only call sites that actually need a Supabase URL pay the assertion cost.
 */
let _env: Env | null = null;
export function getEnv(): Env {
  if (!_env) _env = assertEnv(readEnv());
  return _env;
}
