/**
 * SignupScreen — credential creation. Visual frame matches LoginScreen
 * (top wash, brand logo, language pill, gradient CTA, BNM footer). The
 * mockups don't include an email/password signup screen, so this composes
 * the Login visual treatment with credential fields rather than porting a
 * specific mockup. Persona/LHDN UI from screens-11 lives in onboarding.
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

const Schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type Form = z.infer<typeof Schema>;

const fieldStyle = {
  height: 52,
  borderRadius: 16,
  border: '1px solid rgba(91,71,168,0.10)',
  fontSize: 15,
} as const;

export default function SignupScreen() {
  const nav = useNavigate();
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: Form) => {
    setSubmitErr(null);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.name } },
    });
    if (error) {
      setSubmitErr(error.message);
      return;
    }
    nav('/onboarding', { replace: true });
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
    <div className="relative min-h-screen overflow-hidden bg-bg pb-12 text-ink">
      {/* Top wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0"
        style={{
          height: 320,
          background: 'linear-gradient(180deg, #F5F2FE 0%, #FAF8FF 100%)',
        }}
      />
      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: 240,
          height: 240,
          borderRadius: '50%',
          right: -60,
          top: -40,
          background:
            'radial-gradient(circle, rgba(201,186,251,0.30) 0%, rgba(201,186,251,0) 70%)',
          filter: 'blur(6px)',
        }}
      />

      {/* Top row: logo + language */}
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
        <p className="font-medium text-muted" style={{ fontSize: 14 }}>
          Create account
        </p>
        <h1
          className="mt-2 text-ink"
          style={{
            fontFamily: '"New York", "Times New Roman", Georgia, serif',
            fontWeight: 500,
            fontSize: 30,
            letterSpacing: -1,
            lineHeight: 1.1,
          }}
        >
          Start your{' '}
          <span className="italic text-purple">Finpersona</span>{' '}
          journey.
        </h1>
      </div>

      {/* Form */}
      <div className="relative px-6 pt-7">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block font-semibold uppercase text-muted"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register('name')}
              className="w-full bg-surface px-4 text-ink shadow-card focus:outline-none"
              style={fieldStyle}
            />
            {formState.errors.name && (
              <p className="mt-1.5 text-xs text-danger">{formState.errors.name.message}</p>
            )}
          </div>

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
              style={fieldStyle}
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
              autoComplete="new-password"
              {...register('password')}
              className="w-full bg-surface px-4 text-ink shadow-card focus:outline-none"
              style={fieldStyle}
            />
            {formState.errors.password && (
              <p className="mt-1.5 text-xs text-danger">{formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block font-semibold uppercase text-muted"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className="w-full bg-surface px-4 text-ink shadow-card focus:outline-none"
              style={fieldStyle}
            />
            {formState.errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-danger">
                {formState.errors.confirmPassword.message}
              </p>
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
              marginTop: 8,
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
              {formState.isSubmitting ? 'Creating account…' : 'Create account'}
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
            Sign up with Apple
          </button>
        )}

        <p
          className="mt-6 text-center font-medium"
          style={{ fontSize: 11, lineHeight: 1.4, color: '#A8A2BD' }}
        >
          By continuing you agree to our{' '}
          <span className="font-semibold text-ink2">Terms</span> and{' '}
          <span className="font-semibold text-ink2">Privacy Policy</span>
        </p>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-purple">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
