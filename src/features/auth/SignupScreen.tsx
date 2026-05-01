import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase/client';
import { signInWithApple } from './apple-sign-in';

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
    <div className="flex min-h-screen flex-col justify-center bg-grad-mist px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold text-ink">Create account</h1>
        <p className="mb-8 text-muted">Start your Finpersona tax-relief journey</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink2">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register('name')}
              className="w-full rounded-md border border-mistDeep bg-surface px-3 py-3 text-ink shadow-card focus:border-purple focus:outline-none"
            />
            {formState.errors.name && (
              <p className="mt-1 text-xs text-danger">{formState.errors.name.message}</p>
            )}
          </div>

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
              autoComplete="new-password"
              {...register('password')}
              className="w-full rounded-md border border-mistDeep bg-surface px-3 py-3 text-ink shadow-card focus:border-purple focus:outline-none"
            />
            {formState.errors.password && (
              <p className="mt-1 text-xs text-danger">{formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-ink2">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className="w-full rounded-md border border-mistDeep bg-surface px-3 py-3 text-ink shadow-card focus:border-purple focus:outline-none"
            />
            {formState.errors.confirmPassword && (
              <p className="mt-1 text-xs text-danger">
                {formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {submitErr && <p className="text-sm text-danger">{submitErr}</p>}

          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded-md bg-purple py-3 text-sm font-semibold text-white shadow-purpleGlow disabled:opacity-50"
          >
            {formState.isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {showApple && (
          <button
            type="button"
            className="mt-3 w-full rounded-md border border-ink py-3 text-sm font-semibold text-ink"
            onClick={onApple}
          >
            Sign up with Apple
          </button>
        )}

        <p className="mt-8 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-purple">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
