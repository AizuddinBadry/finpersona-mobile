/**
 * ReceiptDetail — view + inline edit (Tasks 5 + 6).
 *
 * Reads /receipts/:id, renders merchant / date / total / category / claimable
 * plus two collapsible rationale sections sourced from
 * `extracted_data.reasoning` and `extracted_data.eligibility_explanation`.
 *
 * Task 6 wires the Edit button to a small state machine:
 *
 *   view ── Edit ──▶ edit ── Save ──▶ saving ──▶ view (+ "Saved" toast)
 *                       ▲                  │
 *                       │                  ▼
 *                       └──── error ◀──── (mutateAsync rejects)
 *
 * On error the user's edits stay intact so they can retry without retyping.
 * AI reasoning + eligibility stay read-only even in edit mode (still tappable
 * to expand, but not editable).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import {
  useDeleteReceipt,
  useReceipt,
  useUpdateReceipt,
} from '@/hooks/useReceipt';
import type { ReceiptRow, ReceiptUpdate } from '@/lib/supabase/queries/receiptDetail';

const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

type Phase = 'view' | 'edit' | 'saving' | 'error';

function formatTotal(amount: number, currency: string): string {
  if (currency === 'MYR') {
    return `RM ${amount.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatReceiptDate(yyyyMmDd: string): string {
  // Match the en-GB long-form style used elsewhere (insights, lhdn).
  const d = new Date(yyyyMmDd);
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function rowToForm(row: ReceiptRow): Required<ReceiptUpdate> {
  return {
    merchantName: row.merchant_name,
    receiptDate: row.receipt_date,
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    category: row.category ?? '',
    isClaimable: row.is_claimable,
  };
}

export default function ReceiptDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useReceipt(id);

  if (isLoading) {
    return <SkeletonState />;
  }

  if (isError || data == null) {
    return <NotFoundState />;
  }

  return (
    <LoadedState
      id={id}
      data={data}
      onBack={() => navigate(-1)}
      onDeleted={() => navigate('/activity')}
    />
  );
}

function SkeletonState() {
  return (
    <div
      data-testid="receipt-detail-skeleton"
      className="text-ink"
      style={{ paddingBottom: 110, padding: '4px 16px 110px' }}
    >
      <div
        className="bg-surface shadow-card"
        style={{
          borderRadius: 20,
          padding: 16,
          border: '0.5px solid rgba(91,71,168,0.10)',
        }}
      >
        <ShimmerBlock height={180} radius={16} />
        <div style={{ height: 14 }} />
        <ShimmerBlock height={20} width="60%" />
        <div style={{ height: 8 }} />
        <ShimmerBlock height={14} width="40%" />
        <div style={{ height: 16 }} />
        <ShimmerBlock height={28} width="50%" />
        <div style={{ height: 12 }} />
        <ShimmerBlock height={14} width="30%" />
      </div>
    </div>
  );
}

function ShimmerBlock({
  height,
  width = '100%',
  radius = 8,
}: {
  height: number;
  width?: number | string;
  radius?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, #EDE7FB 0%, #F5F2FE 50%, #EDE7FB 100%)',
        backgroundSize: '200% 100%',
        animation: 'receiptShimmer 1.4s ease-in-out infinite',
      }}
    >
      <style>{`@keyframes receiptShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

function NotFoundState() {
  return (
    <div
      className="text-ink"
      style={{ paddingBottom: 110, padding: '4px 16px 110px' }}
    >
      <div
        className="bg-surface shadow-card"
        style={{
          borderRadius: 20,
          padding: 24,
          border: '0.5px solid rgba(91,71,168,0.10)',
          textAlign: 'center',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: '#F5F2FE',
            margin: '0 auto 12px',
          }}
        >
          <Icon name="receipt" size={24} color="#6E4CE6" strokeWidth={2} />
        </div>
        <div
          className="font-bold text-ink"
          style={{ fontSize: 16, letterSpacing: -0.3 }}
        >
          Receipt not found
        </div>
        <p
          className="text-muted"
          style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}
        >
          We couldn't load this receipt. It may have been deleted, or the link
          may be out of date.
        </p>
        <Link
          to="/activity"
          className="text-purple font-semibold"
          style={{
            display: 'inline-block',
            marginTop: 14,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          ← Back to Activity
        </Link>
      </div>
    </div>
  );
}

function LoadedState({
  id,
  data,
  onBack,
  onDeleted,
}: {
  id: string;
  data: ReceiptRow;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const reasoning = data.extracted_data?.reasoning;
  const eligibility = data.extracted_data?.eligibility_explanation;

  const update = useUpdateReceipt();
  const del = useDeleteReceipt();
  const [phase, setPhase] = useState<Phase>('view');
  const [editForm, setEditForm] = useState<Required<ReceiptUpdate> | null>(
    null,
  );
  const [savedToastVisible, setSavedToastVisible] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [deleteConfirmPending, setDeleteConfirmPending] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending toast timer when the phase moves away from view, when
  // the component unmounts, or before scheduling a new toast.
  function clearToastTimer() {
    if (toastTimerRef.current != null) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }

  function clearDeleteTimer() {
    if (deleteTimerRef.current != null) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearToastTimer();
      clearDeleteTimer();
    };
  }, []);

  // If the user re-enters edit mode while a Saved toast is showing, drop it.
  useEffect(() => {
    if (phase !== 'view' && savedToastVisible) {
      clearToastTimer();
      setSavedToastVisible(false);
    }
  }, [phase, savedToastVisible]);

  const editing = phase === 'edit' || phase === 'saving' || phase === 'error';
  const saving = phase === 'saving' || update.isPending;

  function startEdit() {
    setEditForm(rowToForm(data));
    setPhase('edit');
  }

  function cancelEdit() {
    setEditForm(null);
    setSaveError(null);
    update.reset();
    setPhase('view');
  }

  async function saveEdit() {
    if (editForm == null) return;
    setSaveError(null);
    setPhase('saving');
    try {
      await update.mutateAsync({ id, ...editForm });
      setEditForm(null);
      setPhase('view');
      // Schedule the Saved toast.
      clearToastTimer();
      setSavedToastVisible(true);
      toastTimerRef.current = setTimeout(() => {
        setSavedToastVisible(false);
        toastTimerRef.current = null;
      }, 1500);
    } catch (e) {
      // Keep editForm intact so the user's edits aren't lost.
      setSaveError(e instanceof Error ? e : new Error(String(e)));
      setPhase('error');
    }
  }

  function dismissError() {
    setSaveError(null);
    update.reset();
    setPhase('edit');
  }

  const deleting = del.isPending;

  function onDeleteTap() {
    if (deleting) return;
    if (!deleteConfirmPending) {
      setDeleteConfirmPending(true);
      clearDeleteTimer();
      deleteTimerRef.current = setTimeout(() => {
        setDeleteConfirmPending(false);
        deleteTimerRef.current = null;
      }, 3000);
      return;
    }
    // Second tap — fire the mutation.
    clearDeleteTimer();
    void (async () => {
      try {
        await del.mutateAsync({ id });
        onDeleted();
      } catch (e) {
        setDeleteError(e instanceof Error ? e : new Error(String(e)));
        setDeleteConfirmPending(false);
      }
    })();
  }

  function dismissDeleteError() {
    setDeleteError(null);
    del.reset();
  }

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header row */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '4px 20px 12px' }}
      >
        {editing ? (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            aria-label="Cancel"
            className="font-semibold text-ink2 bg-surface shadow-card"
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 18,
              border: '0.5px solid rgba(91,71,168,0.10)',
              fontSize: 13,
              opacity: saving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onBack}
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
        )}
        <h1
          className="text-ink"
          style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}
        >
          Receipt
        </h1>
        {editing ? (
          <button
            type="button"
            onClick={saveEdit}
            disabled={saving}
            aria-label="Save"
            className="font-bold text-white shadow-purpleGlow"
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 18,
              border: 'none',
              fontSize: 13,
              background: GRAD_HERO,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit"
            className="font-semibold text-purple bg-surface shadow-card"
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 18,
              border: '0.5px solid rgba(91,71,168,0.10)',
              fontSize: 13,
            }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Saved toast */}
      {savedToastVisible && (
        <div
          role="status"
          aria-live="polite"
          style={{
            margin: '0 16px 10px',
            padding: '10px 14px',
            borderRadius: 12,
            background: '#D6F5E5',
            color: '#0E7C4F',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
            border: '0.5px solid rgba(31,181,115,0.30)',
          }}
        >
          Saved
        </div>
      )}

      {/* Delete error banner */}
      {deleteError && (
        <div
          role="alert"
          style={{
            margin: '0 16px 10px',
            padding: '12px 14px',
            borderRadius: 12,
            background: '#FFE4E6',
            color: '#9A1F2A',
            fontSize: 13,
            border: '0.5px solid rgba(214,52,64,0.30)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{deleteError.message}</span>
          <button
            type="button"
            onClick={dismissDeleteError}
            className="font-bold"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#D63440',
              color: '#fff',
              fontSize: 12,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {phase === 'error' && saveError && (
        <div
          role="alert"
          style={{
            margin: '0 16px 10px',
            padding: '12px 14px',
            borderRadius: 12,
            background: '#FFE4E6',
            color: '#9A1F2A',
            fontSize: 13,
            border: '0.5px solid rgba(214,52,64,0.30)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{saveError.message}</span>
          <button
            type="button"
            onClick={dismissError}
            className="font-bold"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#D63440',
              color: '#fff',
              fontSize: 12,
            }}
          >
            OK
          </button>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '0 16px' }}>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 20,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          {/* Image (always read-only) */}
          {data.image_url && (
            <img
              src={data.image_url}
              alt={data.merchant_name}
              style={{
                display: 'block',
                width: '100%',
                maxHeight: 280,
                objectFit: 'cover',
                background: '#F5F2FE',
              }}
            />
          )}

          {editing && editForm ? (
            <EditBody
              form={editForm}
              onChange={setEditForm}
              disabled={saving}
            />
          ) : (
            <ViewBody data={data} />
          )}

          {/* Collapsible rationale sections — read-only in both phases. */}
          {reasoning != null && (
            <CollapsibleRow title="AI reasoning" body={reasoning} />
          )}
          {eligibility != null && (
            <CollapsibleRow title="Why eligible" body={eligibility} />
          )}

          {/* Delete row — only visible in view phase. */}
          {phase === 'view' && (
            <div
              style={{
                borderTop: '0.5px solid rgba(91,71,168,0.10)',
                padding: 16,
              }}
            >
              <button
                type="button"
                onClick={onDeleteTap}
                disabled={deleting}
                data-danger={deleteConfirmPending ? 'true' : 'false'}
                className="font-bold"
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 13,
                  cursor: deleting ? 'default' : 'pointer',
                  background: deleteConfirmPending ? '#D63440' : '#FFE4E6',
                  color: deleteConfirmPending ? '#fff' : '#9A1F2A',
                  opacity: deleting ? 0.7 : 1,
                  letterSpacing: 0.2,
                }}
              >
                {deleting
                  ? 'Deleting…'
                  : deleteConfirmPending
                    ? 'Tap again to confirm'
                    : 'Delete receipt'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewBody({ data }: { data: ReceiptRow }) {
  return (
    <div style={{ padding: 18 }}>
      {/* Merchant */}
      <div
        className="font-bold text-ink"
        style={{ fontSize: 20, letterSpacing: -0.4 }}
      >
        {data.merchant_name}
      </div>
      <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
        {formatReceiptDate(data.receipt_date)}
      </div>

      {/* Total */}
      <div
        className="font-bold text-ink"
        style={{
          marginTop: 14,
          fontSize: 28,
          letterSpacing: -0.6,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatTotal(data.total_amount, data.currency)}
      </div>

      {/* Chips row */}
      <div
        className="flex items-center"
        style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}
      >
        {data.category && (
          <span
            className="font-semibold"
            style={{
              fontSize: 11,
              color: '#5837C9',
              background: '#E8DFFB',
              padding: '5px 10px',
              borderRadius: 999,
              letterSpacing: 0.2,
            }}
          >
            {data.category}
          </span>
        )}
        <span
          className="font-semibold"
          style={{
            fontSize: 11,
            color: data.is_claimable ? '#1FB573' : '#7A7392',
            background: data.is_claimable ? '#D6F5E5' : '#F1ECFB',
            padding: '5px 10px',
            borderRadius: 999,
            letterSpacing: 0.2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span data-testid="receipt-claimable">
            {data.is_claimable ? '✓' : '—'}
          </span>
          LHDN claimable
        </span>
      </div>
    </div>
  );
}

function EditBody({
  form,
  onChange,
  disabled,
}: {
  form: Required<ReceiptUpdate>;
  onChange: (next: Required<ReceiptUpdate>) => void;
  disabled: boolean;
}) {
  return (
    <div style={{ padding: 18 }}>
      <fieldset
        disabled={disabled}
        style={{ border: 'none', padding: 0, margin: 0 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field
            label="Merchant"
            value={form.merchantName}
            onChange={(v) => onChange({ ...form, merchantName: v })}
          />
          <Field
            label="Date"
            type="date"
            value={form.receiptDate}
            onChange={(v) => onChange({ ...form, receiptDate: v })}
          />
          <Field
            label="Total"
            type="number"
            value={String(form.totalAmount)}
            onChange={(v) =>
              onChange({ ...form, totalAmount: Number(v) || 0 })
            }
          />
          <Field
            label="Currency"
            value={form.currency}
            onChange={(v) => onChange({ ...form, currency: v })}
          />
          <Field
            label="Category"
            value={form.category}
            onChange={(v) => onChange({ ...form, category: v })}
          />
        </div>

        {/* LHDN claimable toggle — matches Capture's switch pattern. */}
        <div
          className="flex items-center"
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #F5F2FE, #EDE7FB)',
            border: '1px solid rgba(91,71,168,0.10)',
            gap: 10,
          }}
        >
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
            <div
              style={{
                fontSize: 12,
                color: '#39314F',
                fontWeight: 500,
                marginTop: 1,
              }}
            >
              Tag this receipt under your tax relief totals.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isClaimable}
            aria-label="Tag as LHDN claimable"
            onClick={() =>
              onChange({ ...form, isClaimable: !form.isClaimable })
            }
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
      </fieldset>
    </div>
  );
}

function CollapsibleRow({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderTop: '0.5px solid rgba(91,71,168,0.10)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className="flex items-center justify-between bg-surface"
        style={{
          width: '100%',
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          className="font-semibold text-ink"
          style={{ fontSize: 13, letterSpacing: -0.1 }}
        >
          {title}
        </span>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <Icon name="chevronDown" size={14} color="#7A7392" />
        </span>
      </button>
      {open && (
        <div
          className="text-muted"
          style={{
            padding: '0 18px 14px',
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
}
