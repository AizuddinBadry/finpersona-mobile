/**
 * CaptureSuccess — post-save confirmation screen at `/capture/success`.
 *
 * Shown after both the scan flow (Capture.tsx) and the manual flow
 * (CaptureManual.tsx) finish their insert. The previous source-of-truth
 * was the inline `DoneBody` rendered when `useCaptureFlow.phase === 'done'`;
 * we now route there instead so the manual flow shares the same celebration
 * UI.
 *
 * Router state contract (passed by the calling screen via
 * `navigate('/capture/success', { state: { amount, sourceName, receiptId } })`):
 *   - amount: number — RM total just deducted
 *   - sourceName: string — the payment-source label (e.g. "Maybank Visa ••4218")
 *   - receiptId?: string — the inserted receipt's id; "View receipt" is
 *       disabled when missing.
 *
 * Refresh / direct-nav fallback: when the state is missing or essential
 * fields are absent (browser refresh, manual URL entry, deep link), we
 * redirect to `/` rather than render a half-baked celebration screen.
 *
 * Auto-navigate: after 5s with no interaction we send the user home — the
 * web app does the same. Tests use `vi.useFakeTimers()` to verify the
 * timer fires.
 */
import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';

const GRAD_BACKDROP =
  'radial-gradient(120% 80% at 50% -10%, #2A1854 0%, #0A0418 60%)';
const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

const AUTO_HOME_MS = 5000;

type SuccessState = {
  amount?: number;
  sourceName?: string;
  receiptId?: string;
};

export default function CaptureSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as SuccessState | null) ?? null;

  // Auto-navigate home after 5s of inactivity. Plan calls this nice-to-have
  // and matches the web behaviour. Cleared on unmount so a manual button
  // tap doesn't double-fire navigate.
  useEffect(() => {
    if (!state || typeof state.amount !== 'number' || !state.sourceName) {
      return;
    }
    const t = setTimeout(() => navigate('/'), AUTO_HOME_MS);
    return () => clearTimeout(t);
  }, [state, navigate]);

  // Defensive fallback: refreshing the page or arriving without the state
  // payload should not show "RM undefined deducted from ". Send them home.
  if (!state || typeof state.amount !== 'number' || !state.sourceName) {
    return <Navigate to="/" replace />;
  }

  const { amount, sourceName, receiptId } = state;

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0A0418',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: GRAD_BACKDROP }}
      />

      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          textAlign: 'center',
          zIndex: 5,
        }}
      >
        <div
          className="flex items-center justify-center shadow-purpleGlow"
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            background: GRAD_HERO,
            marginBottom: 20,
          }}
        >
          <Icon name="check" size={44} color="#fff" strokeWidth={2.6} />
        </div>

        <h1
          className="font-bold"
          style={{ fontSize: 28, letterSpacing: -0.5, color: '#fff' }}
        >
          Saved
        </h1>

        <p
          style={{
            marginTop: 10,
            fontSize: 14,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.45,
            maxWidth: 280,
          }}
        >
          {`RM ${amount.toFixed(2)} deducted from ${sourceName}`}
        </p>
      </div>

      <div
        style={{
          position: 'relative',
          padding: '0 20px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (receiptId) navigate(`/receipts/${receiptId}`);
          }}
          disabled={!receiptId}
          className="font-bold text-white shadow-purpleGlow"
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            background: GRAD_HERO,
            fontSize: 14,
            border: 'none',
            letterSpacing: -0.1,
            opacity: receiptId ? 1 : 0.5,
          }}
        >
          View receipt
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="font-semibold"
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            fontSize: 14,
            border: 'none',
            letterSpacing: -0.1,
          }}
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
