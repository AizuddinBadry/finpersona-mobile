/**
 * Settings — advisor persona switcher + account info + sign-out (Task 13).
 *
 * The persona radio rows write through `useUpdatePersona`, which performs an
 * optimistic cache update so the UI flips instantly when the user picks a
 * persona. Sign-out uses the same two-tap confirm pattern as ReceiptDetail's
 * delete: first tap arms a 3000ms confirmation window with danger styling,
 * second tap (within the window) actually fires the signOut mutation; the
 * timer is cleared on unmount.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdatePersona } from '@/hooks/useProfile';
import type { AdvisorPersona } from '@/lib/supabase/queries/profile';

type PersonaOption = {
  value: AdvisorPersona;
  label: string;
  subtitle: string;
};

const PERSONAS: PersonaOption[] = [
  { value: 'analyst', label: 'Analyst', subtitle: 'Data-driven, no fluff.' },
  { value: 'coach', label: 'Coach', subtitle: 'Encouraging, gentle nudges.' },
  { value: 'witty', label: 'Witty', subtitle: 'Playful with a sharp edge.' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { user, signOut } = useAuth();
  const updatePersona = useUpdatePersona();

  const selectedPersona: AdvisorPersona =
    profile?.advisor_persona ?? 'coach';

  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSignOutTimer() {
    if (signOutTimerRef.current != null) {
      clearTimeout(signOutTimerRef.current);
      signOutTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearSignOutTimer();
    };
  }, []);

  function onPersonaTap(persona: AdvisorPersona) {
    if (persona === selectedPersona) return;
    updatePersona.mutate(persona);
  }

  function onSignOutTap() {
    if (!confirmingSignOut) {
      setConfirmingSignOut(true);
      clearSignOutTimer();
      signOutTimerRef.current = setTimeout(() => {
        setConfirmingSignOut(false);
        signOutTimerRef.current = null;
      }, 3000);
      return;
    }
    // Second tap — fire sign-out. The auth flow handles redirect.
    clearSignOutTimer();
    void signOut();
  }

  const fullName = profile?.full_name ?? '—';
  const email = user?.email ?? '—';

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header row */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '4px 20px 12px' }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex items-center justify-center bg-surface text-ink2 shadow-card"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          <Icon name="arrowLeft" size={17} color="#39314F" />
        </button>
        <h1
          className="text-ink"
          style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}
        >
          Settings
        </h1>
        {/* Spacer to keep the title centered. */}
        <div style={{ width: 36 }} aria-hidden />
      </div>

      {/* ADVISOR PERSONA section */}
      <div style={{ padding: '0 16px' }}>
        <SectionHeader>Advisor persona</SectionHeader>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 20,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          {PERSONAS.map((p, idx) => {
            const selected = p.value === selectedPersona;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onPersonaTap(p.value)}
                aria-pressed={selected}
                className="flex items-center bg-surface"
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderTop:
                    idx === 0
                      ? 'none'
                      : '0.5px solid rgba(91,71,168,0.10)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="font-semibold text-ink"
                    style={{ fontSize: 14, letterSpacing: -0.1 }}
                  >
                    {p.label}
                  </div>
                  <div
                    className="text-muted"
                    style={{ fontSize: 12, marginTop: 2, lineHeight: 1.4 }}
                  >
                    {p.subtitle}
                  </div>
                </div>
                <span
                  aria-hidden
                  className="flex items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: selected ? '#6E4CE6' : 'transparent',
                    border: selected
                      ? '1px solid #6E4CE6'
                      : '1.5px solid #D8D2E8',
                    flexShrink: 0,
                  }}
                >
                  {selected && (
                    <Icon name="check" size={12} color="#fff" strokeWidth={3} />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACCOUNT section */}
      <div style={{ padding: '0 16px', marginTop: 18 }}>
        <SectionHeader>Account</SectionHeader>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 20,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          <ReadOnlyRow label="Name" value={fullName} />
          <ReadOnlyRow label="Email" value={email} divider />
        </div>
      </div>

      {/* Sign-out button */}
      <div style={{ padding: '24px 16px 0' }}>
        <button
          type="button"
          onClick={onSignOutTap}
          data-danger={confirmingSignOut ? 'true' : 'false'}
          className="font-bold"
          style={{
            width: '100%',
            height: 48,
            borderRadius: 14,
            border: 'none',
            fontSize: 13,
            cursor: 'pointer',
            background: confirmingSignOut ? '#D63440' : '#FFE4E6',
            color: confirmingSignOut ? '#fff' : '#9A1F2A',
            letterSpacing: 0.2,
          }}
        >
          {confirmingSignOut ? 'Tap again to confirm' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-muted font-bold"
      style={{
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        padding: '0 4px 8px',
      }}
    >
      {children}
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
  divider = false,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '14px 18px',
        borderTop: divider
          ? '0.5px solid rgba(91,71,168,0.10)'
          : 'none',
        gap: 12,
      }}
    >
      <span
        className="text-muted font-semibold"
        style={{ fontSize: 12, letterSpacing: 0.2 }}
      >
        {label}
      </span>
      <span
        className="text-ink"
        style={{
          fontSize: 13,
          fontWeight: 500,
          flex: 1,
          minWidth: 0,
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}
