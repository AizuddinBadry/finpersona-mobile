import { supabase } from '@/lib/supabase/client';

export type EmploymentType = 'employed' | 'self_employed' | 'both';

export type OnboardingPayload = {
  userId: string;
  taxYear: number;
  /** Captured for UX context; written to personal_information in Phase 2. */
  employmentType: EmploymentType;
  /** Midpoint of selected income band, written as `annual_salary`. */
  incomeRangeMid: number;
};

export async function completeOnboarding(p: OnboardingPayload): Promise<void> {
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', p.userId);
  if (profileErr) throw profileErr;

  const { error: incomeErr } = await supabase.from('income_records').upsert(
    {
      user_id: p.userId,
      tax_year: p.taxYear,
      annual_salary: p.incomeRangeMid,
    },
    { onConflict: 'user_id,tax_year' },
  );
  if (incomeErr) throw incomeErr;
}
