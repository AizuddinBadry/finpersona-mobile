import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase/client';

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

  return (
    <div className="flex min-h-screen flex-col justify-center bg-grad-mist px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold text-ink">Welcome back</h1>
        <p className="mb-8 text-muted">Sign in to your Finpersona account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              {...register('email')}
              className="w-full rounded-md border border-mistDeep bg-surface px-3 py-3 text-ink shadow-card focus:border-purple focus:outline-none"
            />
            {formState.errors.email && (
              <p className="mt-1 text-xs text-danger">{formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink2">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-md border border-mistDeep bg-surface px-3 py-3 text-ink shadow-card focus:border-purple focus:outline-none"
            />
            {formState.errors.password && (
              <p className="mt-1 text-xs text-danger">{formState.errors.password.message}</p>
            )}
          </div>

          {submitErr && <p className="text-sm text-danger">{submitErr}</p>}

          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded-md bg-purple py-3 text-sm font-semibold text-white shadow-purpleGlow disabled:opacity-50"
          >
            {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {showApple && (
          <button
            type="button"
            className="mt-3 w-full rounded-md border border-ink py-3 text-sm font-semibold text-ink"
            onClick={() => alert('Apple Sign-In wired in Phase 1 Task 14')}
          >
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
    </div>
  );
}
