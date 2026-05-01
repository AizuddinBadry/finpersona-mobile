/**
 * OnboardingScreen — visual port of Finpersona-mobile-build/screens-11.jsx
 * (step-2 layout) and screens-12.jsx (income bracket grid). The 3-step state
 * machine and submit logic are unchanged from Phase 1; only the JSX/CSS
 * was reworked to match the brand mockups.
 *
 * Mockup divergences (intentional):
 * - Mockup shows "X / 4" pills; we have 3 steps so we show "X / 3".
 * - Mockup's persona pick + LHDN toggle are deferred until their data
 *   destinations exist in the backend (Phase 2+).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components/Icon';
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

type Band = { label: string; mid: number; tax: string; sub: string };
const INCOME_BANDS: Band[] = [
  { label: 'Under RM 30k', mid: 20000, tax: '0%', sub: 'Tax exempt' },
  { label: 'RM 30 – 60k', mid: 45000, tax: '6%', sub: 'M40 entry' },
  { label: 'RM 60 – 100k', mid: 80000, tax: '19%', sub: 'M40 upper' },
  { label: 'RM 100 – 200k', mid: 150000, tax: '25%', sub: 'T20' },
  { label: 'RM 200k+', mid: 250000, tax: '26%', sub: 'T20 upper' },
];

const STEP_HEADINGS: Record<Step, { chip: string; chipIcon: 'sparkle' | 'receipt'; title: React.ReactNode; sub: string }> = {
  1: {
    chip: 'Tax year',
    chipIcon: 'sparkle',
    title: <>Which year are we<br /><span className="italic text-purple">filing</span> for?</>,
    sub: 'Pick the assessment year you want to track from now.',
  },
  2: {
    chip: 'Create your persona',
    chipIcon: 'sparkle',
    title: <>Tell us a bit<br />about <span className="italic text-purple">you</span>.</>,
    sub: 'Your AI advisor uses this to tailor insights and LHDN relief checks.',
  },
  3: {
    chip: 'For LHDN tracking',
    chipIcon: 'receipt',
    title: <>What&apos;s your <span className="italic text-purple">annual income</span>?</>,
    sub: "We'll calculate the right relief caps and flag every claimable receipt automatically.",
  },
};

function StepPills({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={i === step ? 'bg-purple' : 'bg-mistDeep'}
          style={{
            width: i === step ? 24 : 6,
            height: 6,
            borderRadius: 3,
            transition: 'all 0.3s',
          }}
        />
      ))}
    </div>
  );
}

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

  const handleBack = () => {
    if (step === 1) nav(-1);
    else setStep((step - 1) as Step);
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

  const heading = STEP_HEADINGS[step];

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg pb-32 text-ink">
      {/* Top wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0"
        style={{
          height: 280,
          background:
            'radial-gradient(120% 100% at 50% 0%, #EDE7FB 0%, #FAF8FF 80%)',
        }}
      />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 pt-6">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="flex items-center justify-center bg-surface shadow-card"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            border: '1px solid rgba(91,71,168,0.10)',
          }}
        >
          <Icon name="arrowLeft" size={18} color="#1A1530" strokeWidth={2} />
        </button>
        <StepPills step={step} />
        <span
          className="font-semibold text-muted"
          style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
        >
          {step} / 3
        </span>
      </div>

      {/* Heading */}
      <div className="relative px-7 pt-8">
        <div
          className="mb-3.5 inline-flex items-center gap-1.5 bg-mistDeep"
          style={{ height: 26, padding: '0 10px', borderRadius: 13 }}
        >
          <Icon name={heading.chipIcon} size={11} color="#6E4CE6" strokeWidth={2.4} />
          <span
            className="font-bold text-purple-deep"
            style={{ fontSize: 11, letterSpacing: 0.2 }}
          >
            {heading.chip}
          </span>
        </div>
        <h1
          className="text-ink"
          style={{
            fontFamily: '"New York", Georgia, serif',
            fontWeight: 500,
            fontSize: 30,
            letterSpacing: -1.0,
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {heading.title}
        </h1>
        <p
          className="text-muted"
          style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}
        >
          {heading.sub}
        </p>
      </div>

      {/* Body */}
      <div className="relative px-7 pt-6">
        {step === 1 && (
          <div className="space-y-2.5">
            {TAX_YEARS.map((t) => {
              const selected = taxYear === t.value;
              return (
                <label
                  key={t.value}
                  className="flex cursor-pointer items-center gap-3 bg-surface px-4 shadow-card"
                  style={{
                    height: 56,
                    borderRadius: 16,
                    border: selected
                      ? '1.5px solid #6E4CE6'
                      : '1px solid rgba(91,71,168,0.10)',
                    boxShadow: selected
                      ? '0 0 0 3px rgba(110,76,230,0.10), 0 1px 2px rgba(40,20,90,0.04), 0 8px 24px rgba(60,40,140,0.06)'
                      : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name="taxYear"
                    value={t.value}
                    checked={selected}
                    onChange={() => setTaxYear(t.value)}
                    className="sr-only"
                  />
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: selected ? '5px solid #6E4CE6' : '1.5px solid #EDE7FB',
                      background: '#fff',
                    }}
                  />
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: 15,
                      color: selected ? '#5837C9' : '#1A1530',
                    }}
                  >
                    {t.label} ({t.value})
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2.5">
            {EMPLOYMENT.map((e) => {
              const selected = employment === e.value;
              return (
                <label
                  key={e.value}
                  className="flex cursor-pointer items-center gap-3 bg-surface px-4 shadow-card"
                  style={{
                    height: 56,
                    borderRadius: 16,
                    border: selected
                      ? '1.5px solid #6E4CE6'
                      : '1px solid rgba(91,71,168,0.10)',
                    boxShadow: selected
                      ? '0 0 0 3px rgba(110,76,230,0.10), 0 1px 2px rgba(40,20,90,0.04), 0 8px 24px rgba(60,40,140,0.06)'
                      : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name="employment"
                    value={e.value}
                    checked={selected}
                    onChange={() => setEmployment(e.value)}
                    className="sr-only"
                  />
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: selected
                        ? 'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)'
                        : '#EDE7FB',
                      boxShadow: selected
                        ? '0 12px 32px rgba(110,76,230,0.32), 0 4px 12px rgba(110,76,230,0.20)'
                        : undefined,
                    }}
                  >
                    <Icon
                      name="user"
                      size={18}
                      color={selected ? '#fff' : '#6E4CE6'}
                      strokeWidth={2}
                    />
                  </div>
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: 15,
                      color: selected ? '#5837C9' : '#1A1530',
                    }}
                  >
                    {e.label}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <>
            <div
              className="mb-2 font-semibold uppercase text-muted"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              Pick a range
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INCOME_BANDS.map((b) => {
                const selected = incomeMid === b.mid;
                return (
                  <label
                    key={b.mid}
                    className="cursor-pointer bg-surface"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: selected ? '#EDE7FB' : '#fff',
                      border: selected
                        ? '1.5px solid #6E4CE6'
                        : '1.5px solid rgba(91,71,168,0.10)',
                      boxShadow: selected
                        ? '0 0 0 3px rgba(110,76,230,0.10)'
                        : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="income"
                      value={b.mid}
                      checked={selected}
                      onChange={() => setIncomeMid(b.mid)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span
                        className="font-bold"
                        style={{
                          fontSize: 12,
                          letterSpacing: -0.1,
                          color: selected ? '#5837C9' : '#1A1530',
                        }}
                      >
                        {b.label}
                      </span>
                      <span
                        className="font-bold"
                        style={{
                          fontSize: 10,
                          fontVariantNumeric: 'tabular-nums',
                          color: selected ? '#6E4CE6' : '#7A7392',
                        }}
                      >
                        {b.tax}
                      </span>
                    </div>
                    <div
                      className="font-medium"
                      style={{
                        fontSize: 10,
                        marginTop: 2,
                        color: selected ? '#6E4CE6' : '#7A7392',
                      }}
                    >
                      {b.sub}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Privacy callout */}
            <div
              className="mt-4 flex items-center gap-2.5"
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(245,242,254,0.7)',
                border: '0.5px solid rgba(91,71,168,0.10)',
              }}
            >
              <Icon name="lock" size={14} color="#6E4CE6" strokeWidth={2} />
              <span
                className="font-medium text-ink2"
                style={{ fontSize: 11, lineHeight: 1.4 }}
              >
                Income is encrypted on-device. Never shared with banks or LHDN unless
                you e-file.
              </span>
            </div>
          </>
        )}

        {mutation.error instanceof Error && (
          <p className="mt-4 text-sm text-danger">{mutation.error.message}</p>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-7 left-0 right-0 px-7">
        <button
          type="button"
          disabled={!canAdvance || mutation.isPending}
          onClick={step < 3 ? handleNext : handleSubmit}
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
            {step < 3
              ? 'Next'
              : mutation.isPending
                ? 'Saving…'
                : 'Done'}
          </span>
          <span className="relative">
            <Icon name="arrowRight" size={18} color="#fff" strokeWidth={2.4} />
          </span>
        </button>
        {step === 1 && (
          <p
            className="mt-3.5 text-center font-medium"
            style={{ fontSize: 11, lineHeight: 1.4, color: '#A8A2BD', letterSpacing: 0.1 }}
          >
            By continuing you agree to our{' '}
            <span className="font-semibold text-ink2">Terms</span> and{' '}
            <span className="font-semibold text-ink2">Privacy Policy</span>
          </p>
        )}
      </div>
    </div>
  );
}
