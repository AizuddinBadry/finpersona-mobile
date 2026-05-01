import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  completeOnboarding,
  type EmploymentType,
  type OnboardingPayload,
} from './onboarding-mutations';

type Step = 1 | 2 | 3;

const CURRENT_YEAR = new Date().getFullYear();

const TAX_YEARS: { label: string; value: number }[] = [
  { label: 'This year', value: CURRENT_YEAR },
  { label: 'Last year', value: CURRENT_YEAR - 1 },
];

const EMPLOYMENT: { label: string; value: EmploymentType }[] = [
  { label: 'Employed', value: 'employed' },
  { label: 'Self-employed', value: 'self_employed' },
  { label: 'Business owner', value: 'both' },
];

const INCOME_BANDS: { label: string; mid: number }[] = [
  { label: 'Under RM 30k', mid: 20000 },
  { label: 'RM 30 – 60k', mid: 45000 },
  { label: 'RM 60 – 100k', mid: 80000 },
  { label: 'RM 100 – 200k', mid: 150000 },
  { label: 'RM 200k+', mid: 250000 },
];

export default function OnboardingScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [taxYear, setTaxYear] = useState<number | null>(null);
  const [employment, setEmployment] = useState<EmploymentType | null>(null);
  const [incomeMid, setIncomeMid] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (p: OnboardingPayload) => completeOnboarding(p),
    onSuccess: () => nav('/', { replace: true }),
  });

  const canAdvance =
    (step === 1 && taxYear !== null) ||
    (step === 2 && employment !== null) ||
    (step === 3 && incomeMid !== null);

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleSubmit = () => {
    if (!user || taxYear === null || !employment || incomeMid === null) return;
    mutation.mutate({
      userId: user.id,
      taxYear,
      employmentType: employment,
      incomeRangeMid: incomeMid,
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-grad-mist px-6 py-10">
      <div className="mx-auto w-full max-w-sm flex-1 flex flex-col">
        <p className="mb-2 text-sm font-medium text-muted">Step {step} of 3</p>
        <h1 className="mb-8 text-3xl font-bold text-ink">
          {step === 1 && 'Which tax year?'}
          {step === 2 && 'Your work'}
          {step === 3 && 'Roughly your annual income?'}
        </h1>

        <div className="space-y-3">
          {step === 1 &&
            TAX_YEARS.map((t) => (
              <label
                key={t.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-mistDeep bg-surface px-4 py-3 shadow-card"
              >
                <input
                  type="radio"
                  name="taxYear"
                  value={t.value}
                  checked={taxYear === t.value}
                  onChange={() => setTaxYear(t.value)}
                  className="h-4 w-4 accent-purple"
                />
                <span className="text-sm font-medium text-ink">
                  {t.label} ({t.value})
                </span>
              </label>
            ))}

          {step === 2 &&
            EMPLOYMENT.map((e) => (
              <label
                key={e.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-mistDeep bg-surface px-4 py-3 shadow-card"
              >
                <input
                  type="radio"
                  name="employment"
                  value={e.value}
                  checked={employment === e.value}
                  onChange={() => setEmployment(e.value)}
                  className="h-4 w-4 accent-purple"
                />
                <span className="text-sm font-medium text-ink">{e.label}</span>
              </label>
            ))}

          {step === 3 &&
            INCOME_BANDS.map((b) => (
              <label
                key={b.mid}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-mistDeep bg-surface px-4 py-3 shadow-card"
              >
                <input
                  type="radio"
                  name="income"
                  value={b.mid}
                  checked={incomeMid === b.mid}
                  onChange={() => setIncomeMid(b.mid)}
                  className="h-4 w-4 accent-purple"
                />
                <span className="text-sm font-medium text-ink">{b.label}</span>
              </label>
            ))}
        </div>

        {mutation.error instanceof Error && (
          <p className="mt-4 text-sm text-danger">{mutation.error.message}</p>
        )}

        <div className="mt-auto pt-8">
          {step < 3 ? (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={handleNext}
              className="w-full rounded-md bg-purple py-3 text-sm font-semibold text-white shadow-purpleGlow disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAdvance || mutation.isPending}
              onClick={handleSubmit}
              className="w-full rounded-md bg-purple py-3 text-sm font-semibold text-white shadow-purpleGlow disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : 'Done'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
