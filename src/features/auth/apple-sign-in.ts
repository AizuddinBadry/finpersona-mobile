import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { supabase } from '@/lib/supabase/client';
import { getEnv } from '@/lib/env';

/**
 * Run the native Apple Sign-In flow and exchange the resulting identity token
 * for a Supabase session. Caller handles navigation and error display.
 */
export async function signInWithApple(): Promise<{ error: string | null }> {
  const env = getEnv();
  const supabaseHost = new URL(env.SUPABASE_URL).host;

  let idToken: string | undefined;
  try {
    const result = await SignInWithApple.authorize({
      clientId: env.APPLE_SERVICES_ID,
      redirectURI: `https://${supabaseHost}/auth/v1/callback`,
      scopes: 'email name',
    });
    idToken = result.response.identityToken;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Apple Sign-In was cancelled' };
  }

  if (!idToken) return { error: 'Apple did not return an identity token' };

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
  });
  return { error: error?.message ?? null };
}
