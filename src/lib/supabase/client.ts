import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';
import { supabaseStorage } from './storage-adapter';

const env = getEnv();

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    storage: supabaseStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // not running in a browser tab
  },
});
