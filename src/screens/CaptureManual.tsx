/**
 * CaptureManual — manual-entry receipt screen at `/capture/manual`.
 *
 * Mirrors the dark camera-style chrome of the scan flow (Capture.tsx) but
 * the body is a plain controlled form: merchant, date, total, category,
 * payment source. On save we insert a row tagged `is_manual_entry: true` /
 * `is_claimable: false` and route to `/capture/success` with the amount and
 * source name for the celebration screen (Task 9).
 *
 * Why a separate screen (not a modal): mobile capture flows are full-screen
 * for thumb reach, and we want the same hideNav top-bar treatment as the
 * scan path.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentSources } from '@/hooks/usePaymentSources';
import { insertManualReceipt } from '@/lib/supabase/queries/receiptInsert';
import { PURCHASE_TYPES } from '@/lib/purchaseTypes';

const GRAD_BACKDROP =
  'radial-gradient(120% 80% at 50% -10%, #2A1854 0%, #0A0418 60%)';
const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

/** Today as YYYY-MM-DD in the user's local timezone (no date-fns). */
function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CaptureManual() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sourcesQuery = usePaymentSources();

  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState<string>(todayIso());
  const [totalText, setTotalText] = useState('');
  const [category, setCategory] = useState('');
  const [sourceId, setSourceId] = useState<string>('');

  // Default the source picker to the user's `is_default = true` source once
  // the query resolves. We only set this once: if the user picks a different
  // source we don't want to keep stomping their choice on re-render.
  const defaultSourceId = useMemo(() => {
    if (!sourcesQuery.data?.length) return '';
    return (
      sourcesQuery.data.find((s) => s.is_default)?.id ??
      sourcesQuery.data[0]!.id
    );
  }, [sourcesQuery.data]);

  // Derive the effective source: state if set, else default. Avoids a useEffect.
  const effectiveSourceId = sourceId || defaultSourceId;

  const totalAmount = Number(totalText);
  const isTotalValid =
    totalText.trim() !== '' && Number.isFinite(totalAmount) && totalAmount > 0;
  const isFormValid =
    merchant.trim() !== '' &&
    date.trim() !== '' &&
    isTotalValid &&
    category !== '' &&
    effectiveSourceId !== '';

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      const res = await insertManualReceipt({
        userId: user.id,
        merchantName: merchant.trim(),
        receiptDate: date,
        totalAmount,
        // Local `category` state holds a PURCHASE_TYPES value (e.g.
        // "groceries"); the helper writes it to row.subcategory and sets
        // row.category = 'uncategorized' to match the web app's manual flow.
        purchaseType: category,
        sourceId: effectiveSourceId,
      });
      return res;
    },
    onSuccess: (res) => {
      const sourceName =
        sourcesQuery.data?.find((s) => s.id === effectiveSourceId)?.name ??
        '';
      navigate('/capture/success', {
        state: {
          amount: totalAmount,
          sourceName,
          receiptId: res.id,
        },
      });
    },
  });

  const saveDisabled =
    !isFormValid || sourcesQuery.isLoading || mutation.isPending;

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
        style={{ position: 'relative', padding: '8px 20px 0', zIndex: 10 }}
      >
        <button
          type="button"
          aria-label="Close manual entry"
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
          MANUAL ENTRY
        </div>
        <div style={{ width: 36 }} aria-hidden />
      </div>

      {/* Header */}
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
          Add a receipt by hand
        </div>
      </div>

      {/* Body */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!saveDisabled) mutation.mutate();
        }}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FormField label="Merchant">
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Tesco Mutiara"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Total (RM)">
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={totalText}
              onChange={(e) => setTotalText(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="" disabled>
                Select a category
              </option>
              {PURCHASE_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Payment source">
            <select
              value={effectiveSourceId}
              onChange={(e) => setSourceId(e.target.value)}
              disabled={sourcesQuery.isLoading || !sourcesQuery.data?.length}
              style={inputStyle}
            >
              {sourcesQuery.isLoading && <option value="">Loading…</option>}
              {sourcesQuery.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {mutation.isError && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: '#FFE4E6',
              color: '#9B1C2A',
              fontSize: 12,
            }}
          >
            {(mutation.error as Error)?.message ?? 'Could not save receipt'}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (!saveDisabled) mutation.mutate();
          }}
          disabled={saveDisabled}
          className="font-bold text-white shadow-purpleGlow"
          style={{
            marginTop: 18,
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            background: GRAD_HERO,
            fontSize: 14,
            border: 'none',
            letterSpacing: -0.1,
            opacity: saveDisabled ? 0.5 : 1,
          }}
        >
          {mutation.isPending ? 'Saving…' : 'Save receipt'}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 14,
  marginTop: 4,
  letterSpacing: -0.2,
  width: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontWeight: 600,
  color: '#1A1530',
};

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
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
        {label}
      </div>
      {children}
    </label>
  );
}
