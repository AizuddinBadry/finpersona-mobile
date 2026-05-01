import { describe, it, expect, vi, beforeEach } from 'vitest';

const authorizeMock = vi.fn();
const signInWithIdTokenMock = vi.fn();

vi.mock('@capacitor-community/apple-sign-in', () => ({
  SignInWithApple: { authorize: (...args: unknown[]) => authorizeMock(...args) },
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { signInWithIdToken: (...args: unknown[]) => signInWithIdTokenMock(...args) },
  },
}));

vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://abc123.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
    API_BASE_URL: 'http://localhost:3000',
    APPLE_SERVICES_ID: 'com.aexlora.finpersona.signin',
  }),
}));

import { signInWithApple } from './apple-sign-in';

describe('signInWithApple', () => {
  beforeEach(() => {
    authorizeMock.mockReset();
    signInWithIdTokenMock.mockReset();
  });

  it('exchanges identity token with Supabase and returns no error on success', async () => {
    authorizeMock.mockResolvedValue({ response: { identityToken: 'tok-abc' } });
    signInWithIdTokenMock.mockResolvedValue({ error: null });

    const result = await signInWithApple();

    expect(authorizeMock).toHaveBeenCalledWith({
      clientId: 'com.aexlora.finpersona.signin',
      redirectURI: 'https://abc123.supabase.co/auth/v1/callback',
      scopes: 'email name',
    });
    expect(signInWithIdTokenMock).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'tok-abc',
    });
    expect(result.error).toBeNull();
  });

  it('returns the cancellation message when authorize throws', async () => {
    authorizeMock.mockRejectedValue(new Error('User cancelled'));
    const result = await signInWithApple();
    expect(result.error).toBe('User cancelled');
    expect(signInWithIdTokenMock).not.toHaveBeenCalled();
  });

  it('returns the supabase error message on token-exchange failure', async () => {
    authorizeMock.mockResolvedValue({ response: { identityToken: 'tok-abc' } });
    signInWithIdTokenMock.mockResolvedValue({ error: { message: 'Invalid token' } });
    const result = await signInWithApple();
    expect(result.error).toBe('Invalid token');
  });

  it('returns an error when Apple does not return an identity token', async () => {
    authorizeMock.mockResolvedValue({ response: {} });
    const result = await signInWithApple();
    expect(result.error).toMatch(/identity token/i);
    expect(signInWithIdTokenMock).not.toHaveBeenCalled();
  });
});
