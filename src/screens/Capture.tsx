/**
 * Capture — receipt capture flow.
 *
 * Phase 3-H wires this to the real pipeline (camera → /api/upload → /api/extract
 * → receipts insert) via useCaptureFlow. The dark camera-style chrome from the
 * mockup stays put; the bottom sheet body swaps based on the current phase.
 *
 * Phases:
 *   - idle:                  big "Tap to scan" CTA
 *   - capturing/upload/etc.: spinner + status label
 *   - review:                editable parsed fields + LHDN toggle + Save
 *   - saving:                Save button shows pending state
 *   - done:                  success banner with View receipt + Back to home
 *   - error:                 error banner + Retry / Cancel
 */
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useCaptureFlow, type CapturePhase } from '@/hooks/useCaptureFlow';
import { usePaymentSources } from '@/hooks/usePaymentSources';
import type { PaymentSource } from '@/lib/supabase/queries/sources';

const GRAD_BACKDROP =
  'radial-gradient(120% 80% at 50% -10%, #2A1854 0%, #0A0418 60%)';
const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';
const GRAD_LHDN = 'linear-gradient(135deg, #F5F2FE, #EDE7FB)';

const PHASE_LABEL: Record<CapturePhase, string> = {
  idle: 'Ready when you are',
  capturing: 'Opening camera…',
  uploading: 'Uploading receipt…',
  extracting: 'Reading with AI…',
  review: 'Review parsed details',
  saving: 'Saving…',
  done: 'Saved',
  error: 'Something went wrong',
};

export default function Capture() {
  const navigate = useNavigate();
  const sourcesQuery = usePaymentSources();

  // Pin the user's `is_default = true` source as the seed for the review
  // step's Source dropdown. Mirrors CaptureManual's resolution.
  const defaultSourceId = useMemo(() => {
    if (!sourcesQuery.data?.length) return '';
    return (
      sourcesQuery.data.find((s) => s.is_default)?.id ??
      sourcesQuery.data[0]!.id
    );
  }, [sourcesQuery.data]);

  const flow = useCaptureFlow({ defaultSourceId });

  /**
   * Race-condition guard: extraction can finish before usePaymentSources
   * resolves. When that happens, useCaptureFlow seeds form.sourceId from an
   * empty defaultSourceId and Save stays disabled with no clear signal why.
   * Once sources actually arrive, push the resolved default into the form so
   * the dropdown's value matches a real option and Save unlocks.
   */
  useEffect(() => {
    if (
      flow.phase === 'review' &&
      flow.form &&
      flow.form.sourceId === '' &&
      defaultSourceId !== ''
    ) {
      flow.setForm((prev) => ({ ...prev, sourceId: defaultSourceId }));
    }
  }, [flow.phase, flow.form, defaultSourceId, flow.setForm]);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0A0418',
        color: '#fff',
      }}
    >
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: GRAD_BACKDROP }}
      />

      {/* Top bar */}
      <div
        className="flex items-center justify-between"
        style={{
          position: 'relative',
          padding: '8px 20px 0',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          aria-label="Close capture"
          onClick={() => navigate('/')}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            border: 'none',
            color: '#fff',
          }}
        >
          <Icon name="close" size={18} color="#fff" />
        </button>
        <div
          className="flex items-center font-bold"
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            fontSize: 11,
            color: '#fff',
            letterSpacing: 0.4,
            gap: 6,
          }}
        >
          <Icon name="sparkle" size={12} color="#C9BAFB" strokeWidth={2.4} />
          AI PARSED
        </div>
        <div style={{ width: 36 }} aria-hidden />
      </div>

      {/* Phase header */}
      <div
        style={{
          position: 'relative',
          textAlign: 'center',
          marginTop: 28,
          color: 'rgba(255,255,255,0.85)',
          zIndex: 5,
        }}
      >
        <div
          className="font-bold"
          style={{ fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' }}
        >
          {PHASE_LABEL[flow.phase]}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          position: 'relative',
          marginTop: 28,
          background: '#fff',
          borderRadius: '28px 28px 0 0',
          padding: '20px 20px 40px',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.3)',
          color: '#1A1530',
          minHeight: 400,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 36,
            height: 4,
            background: '#E5E0F0',
            borderRadius: 2,
            margin: '0 auto 16px',
          }}
        />

        {flow.phase === 'idle' && (
          <IdleBody onStart={flow.start} />
        )}

        {(flow.phase === 'capturing' ||
          flow.phase === 'uploading' ||
          flow.phase === 'extracting') && (
          <ProgressBody label={PHASE_LABEL[flow.phase]} />
        )}

        {(flow.phase === 'review' || flow.phase === 'saving') && flow.form && (
          <ReviewBody
            form={flow.form}
            saving={flow.phase === 'saving'}
            sources={sourcesQuery.data ?? []}
            sourcesLoading={sourcesQuery.isLoading}
            onChange={flow.setForm}
            onCancel={flow.reset}
            onSave={flow.confirm}
          />
        )}

        {flow.phase === 'done' && (
          <DoneBody
            insertedId={flow.insertedId}
            onViewReceipt={() => {
              if (flow.insertedId) navigate(`/receipts/${flow.insertedId}`);
            }}
            onBackHome={() => navigate('/')}
          />
        )}

        {flow.phase === 'error' && (
          <ErrorBody
            message={flow.errorMessage ?? 'Something went wrong'}
            onRetry={flow.start}
            onCancel={() => navigate('/')}
          />
        )}
      </div>
    </div>
  );
}

function IdleBody({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div
        className="flex items-center justify-center shadow-purpleGlow"
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          background: GRAD_HERO,
          margin: '0 auto 16px',
        }}
      >
        <Icon name="camera" size={36} color="#fff" strokeWidth={2.2} />
      </div>
      <h2 className="font-bold text-ink" style={{ fontSize: 18, letterSpacing: -0.3 }}>
        Scan a receipt
      </h2>
      <p
        className="text-muted"
        style={{ fontSize: 13, marginTop: 4, maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}
      >
        Snap a photo and we'll pull merchant, total, and the LHDN category for you.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="font-bold text-white shadow-purpleGlow"
        style={{
          marginTop: 24,
          padding: '14px 28px',
          borderRadius: 14,
          background: GRAD_HERO,
          fontSize: 14,
          border: 'none',
          letterSpacing: -0.1,
        }}
      >
        Tap to scan
      </button>
    </div>
  );
}

function ProgressBody({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          background: '#F5F2FE',
          margin: '0 auto 12px',
          border: '3px solid #6E4CE6',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite',
        }}
      />
      <div className="font-semibold text-ink" style={{ fontSize: 14 }}>
        {label}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ReviewBody(props: {
  form: ReturnType<typeof useCaptureFlow>['form'];
  saving: boolean;
  sources: PaymentSource[];
  sourcesLoading: boolean;
  onChange: ReturnType<typeof useCaptureFlow>['setForm'];
  onCancel: () => void;
  onSave: () => void;
}) {
  const { form, saving, sources, sourcesLoading, onChange, onCancel, onSave } =
    props;
  if (!form) return null;

  // Save is gated on having a payment source picked — the receipts row
  // requires a non-null source_id so the DB trigger can decrement balance.
  const saveDisabled = saving || !form.sourceId;

  return (
    <div>
      <div
        className="flex items-center"
        style={{ gap: 10, marginBottom: 16 }}
      >
        <div
          className="flex items-center justify-center shadow-purpleGlow"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: GRAD_HERO,
          }}
        >
          <Icon name="sparkle" size={16} color="#fff" strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="font-bold text-ink" style={{ fontSize: 16, letterSpacing: -0.3 }}>
            Review parsed details
          </h2>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
            Edit anything before saving.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Field
          label="Merchant"
          value={form.merchantName}
          onChange={(v) => onChange((p) => ({ ...p, merchantName: v }))}
        />
        <Field
          label="Date"
          value={form.receiptDate}
          type="date"
          onChange={(v) => onChange((p) => ({ ...p, receiptDate: v }))}
        />
        <Field
          label="Total (RM)"
          value={String(form.totalAmount)}
          type="number"
          onChange={(v) => onChange((p) => ({ ...p, totalAmount: Number(v) || 0 }))}
        />
        <Field
          label="Category"
          value={form.category ?? ''}
          onChange={(v) => onChange((p) => ({ ...p, category: v || null }))}
        />
        <label
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: '#F5F2FE',
            border: '0.5px solid rgba(91,71,168,0.10)',
            display: 'block',
          }}
        >
          <div
            className="text-muted font-semibold"
            style={{
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            Source
          </div>
          <select
            value={form.sourceId}
            onChange={(e) => {
              const v = e.target.value;
              onChange((p) => ({ ...p, sourceId: v }));
            }}
            disabled={sourcesLoading || sources.length === 0}
            className="font-semibold text-ink"
            style={{
              fontSize: 14,
              marginTop: 4,
              letterSpacing: -0.2,
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
            }}
          >
            {sourcesLoading && <option value="">Loading…</option>}
            {!sourcesLoading && sources.length === 0 && (
              <option value="">No sources available</option>
            )}
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* LHDN toggle */}
      <div
        className="flex items-center"
        style={{
          marginTop: 12,
          padding: '12px 14px',
          borderRadius: 12,
          background: GRAD_LHDN,
          border: '1px solid rgba(91,71,168,0.10)',
          gap: 10,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: 8, background: '#fff' }}
        >
          <Icon name="receipt" size={16} color="#5837C9" strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="font-bold"
            style={{
              fontSize: 12,
              color: '#5837C9',
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            LHDN claimable
          </div>
          <div style={{ fontSize: 12, color: '#39314F', fontWeight: 500, marginTop: 1 }}>
            Tag this receipt under your tax relief totals.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.isClaimable}
          aria-label="Tag as LHDN claimable"
          onClick={() => onChange((p) => ({ ...p, isClaimable: !p.isClaimable }))}
          style={{
            width: 36,
            height: 22,
            borderRadius: 11,
            background: form.isClaimable ? '#6E4CE6' : '#D8D2E8',
            position: 'relative',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: form.isClaimable ? 16 : 2,
              top: 2,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s',
            }}
          />
        </button>
      </div>

      <div className="flex items-center" style={{ gap: 10, marginTop: 18 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="font-semibold"
          style={{
            flex: 1,
            padding: '14px 0',
            borderRadius: 14,
            background: '#F5F2FE',
            color: '#39314F',
            fontSize: 14,
            border: 'none',
            letterSpacing: -0.1,
            opacity: saving ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="font-bold text-white shadow-purpleGlow"
          style={{
            flex: 1.4,
            padding: '14px 0',
            borderRadius: 14,
            background: GRAD_HERO,
            fontSize: 14,
            border: 'none',
            letterSpacing: -0.1,
            opacity: saveDisabled ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save expense'}
        </button>
      </div>
    </div>
  );
}

function DoneBody(props: {
  insertedId: string | null;
  onViewReceipt: () => void;
  onBackHome: () => void;
}) {
  const { insertedId, onViewReceipt, onBackHome } = props;
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          background: '#D6F5E5',
          margin: '0 auto 12px',
        }}
      >
        <Icon name="check" size={32} color="#1FB573" strokeWidth={2.6} />
      </div>
      <div className="font-bold text-ink" style={{ fontSize: 18, letterSpacing: -0.3 }}>
        Receipt saved
      </div>
      <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
        What next?
      </div>
      <div
        className="flex items-center"
        style={{ gap: 10, marginTop: 20, padding: '0 4px' }}
      >
        <button
          type="button"
          onClick={onBackHome}
          className="font-semibold"
          style={{
            flex: 1,
            padding: '14px 0',
            borderRadius: 14,
            background: '#F5F2FE',
            color: '#39314F',
            fontSize: 14,
            border: 'none',
            letterSpacing: -0.1,
          }}
        >
          Back to home
        </button>
        <button
          type="button"
          onClick={onViewReceipt}
          disabled={!insertedId}
          className="font-bold text-white shadow-purpleGlow"
          style={{
            flex: 1.4,
            padding: '14px 0',
            borderRadius: 14,
            background: GRAD_HERO,
            fontSize: 14,
            border: 'none',
            letterSpacing: -0.1,
            opacity: insertedId ? 1 : 0.5,
          }}
        >
          View receipt
        </button>
      </div>
    </div>
  );
}

function ErrorBody(props: {
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const { message, onRetry, onCancel } = props;
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          background: '#FFE4E6',
          margin: '0 auto 12px',
        }}
      >
        <Icon name="close" size={28} color="#D63440" strokeWidth={2.4} />
      </div>
      <div className="font-bold text-ink" style={{ fontSize: 16, letterSpacing: -0.3 }}>
        Couldn't capture receipt
      </div>
      <div
        className="text-muted"
        style={{ fontSize: 12, marginTop: 4, maxWidth: 280, margin: '4px auto 0' }}
      >
        {message}
      </div>
      <div className="flex items-center" style={{ gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={onCancel}
          className="font-semibold"
          style={{
            flex: 1,
            padding: '14px 0',
            borderRadius: 14,
            background: '#F5F2FE',
            color: '#39314F',
            fontSize: 14,
            border: 'none',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="font-bold text-white shadow-purpleGlow"
          style={{
            flex: 1,
            padding: '14px 0',
            borderRadius: 14,
            background: GRAD_HERO,
            fontSize: 14,
            border: 'none',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
