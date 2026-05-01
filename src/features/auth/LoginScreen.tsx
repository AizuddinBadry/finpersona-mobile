/**
 * LoginScreen — visual port of Finpersona-mobile-build/screens-10.jsx.
 *
 * The mockup shows a Face-ID-led "returning user" frame with no email/password
 * inputs at all. We keep the visual frame (top wash, glow, brand logo, language
 * pill, footer) but render an email/password form inside because:
 *   - email/password is needed for testing without an Apple Developer cert
 *   - biometric unlock + recognized account state isn't wired anywhere yet
 * Apple Sign-In is the primary CTA on iOS, matching the mockup's intent.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase/client';
import { signInWithApple } from './apple-sign-in';
import { Icon } from '@/components/Icon';

const Schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type Form = z.infer<typeof Schema>;

export default function LoginScreen() {
  const nav = useNavigate();
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: Form) => {
    setSubmitErr(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setSubmitErr(error.message);
      return;
    }
    nav('/', { replace: true });
  };

  const showApple = Capacitor.getPlatform() === 'ios';

  const onApple = async () => {
    setSubmitErr(null);
    const { error } = await signInWithApple();
    if (error) {
      setSubmitErr(error);
      return;
    }
    nav('/', { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-ink">
      {/* Top wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0"
        style={{
          height: 320,
          background: 'linear-gradient(180deg, #F5F2FE 0%, #FAF8FF 100%)',
        }}
      />
      {/* Lavender radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: 240,
          height: 240,
          borderRadius: '50%',
          left: -60,
          top: -40,
          background:
            'radial-gradient(circle, rgba(201,186,251,0.30) 0%, rgba(201,186,251,0) 70%)',
          filter: 'blur(6px)',
        }}
      />

      {/* Top row: logo + language pill */}
      <div className="relative flex items-center justify-between px-6 pt-6">
        <img
          src="/logo-light.svg"
          alt="Finpersona"
          height={32}
          style={{
            height: 32,
            filter:
              'brightness(0) saturate(100%) invert(28%) sepia(72%) saturate(2200%) hue-rotate(248deg) brightness(95%) contrast(92%)',
          }}
        />
        <div
          className="flex items-center gap-1.5 bg-surface shadow-card"
          style={{
            height: 32,
            padding: '0 12px',
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          <span style={{ fontSize: 13 }}>🇲🇾</span>
          <span className="font-semibold text-ink2" style={{ fontSize: 12 }}>
            EN
          </span>
        </div>
      </div>

      {/* Heading */}
      <div className="relative px-7 pt-9">
        <p className="font-medium text-muted" style={{ fontSize: 14, letterSpacing: -0.1 }}>
          Welcome back
        </p>
        <h1
          className="mt-2 text-ink"
          style={{
            fontFamily: '"New York", "Times New Roman", Georgia, serif',
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: -1,
            lineHeight: 1.1,
          }}
        >
          Good to{' '}
          <span className="italic text-purple">see you</span>.
        </h1>
      </div>

      {/* Form card */}
      <div className="relative px-6 pt-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block font-semibold uppercase text-muted"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              {...register('email')}
              className="w-full bg-surface px-4 text-ink shadow-card focus:outline-none"
              style={{
                height: 52,
                borderRadius: 16,
                border: '1px solid rgba(91,71,168,0.10)',
                fontSize: 15,
              }}
            />
            {formState.errors.email && (
              <p className="mt-1.5 text-xs text-danger">{formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-semibold uppercase text-muted"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full bg-surface px-4 text-ink shadow-card focus:outline-none"
              style={{
                height: 52,
                borderRadius: 16,
                border: '1px solid rgba(91,71,168,0.10)',
                fontSize: 15,
              }}
            />
            {formState.errors.password && (
              <p className="mt-1.5 text-xs text-danger">{formState.errors.password.message}</p>
            )}
          </div>

          {submitErr && <p className="text-sm text-danger">{submitErr}</p>}

          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden text-white shadow-purpleGlow disabled:opacity-50"
            style={{
              height: 56,
              borderRadius: 18,
              background:
                'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)',
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)',
              }}
            />
            <span
              className="relative font-bold"
              style={{ fontSize: 16, letterSpacing: -0.2 }}
            >
              {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
            </span>
            {!formState.isSubmitting && (
              <span className="relative">
                <Icon name="arrowRight" size={18} color="#fff" strokeWidth={2.4} />
              </span>
            )}
          </button>
        </form>

        {showApple && (
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 bg-surface font-semibold text-ink"
            style={{
              height: 52,
              borderRadius: 16,
              border: '1px solid rgba(26,21,48,0.30)',
              fontSize: 15,
            }}
            onClick={onApple}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>&#xF8FF;</span>
            Sign in with Apple
          </button>
        )}

        <p className="mt-8 text-center text-sm text-muted">
          New to Finpersona?{' '}
          <Link to="/signup" className="font-semibold text-purple">
            Create account
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="relative mt-12 flex items-center justify-center gap-1.5 pb-8">
        <Icon name="shield" size={12} color="#7A7392" strokeWidth={2} />
        <span className="font-medium text-muted" style={{ fontSize: 11 }}>
          Secured · BNM-licensed e-money issuer
        </span>
      </div>
    </div>
  );
}
