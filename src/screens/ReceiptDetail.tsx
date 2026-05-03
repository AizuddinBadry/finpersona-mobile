/**
 * ReceiptDetail — view-only phase (Task 5).
 *
 * Reads /receipts/:id, renders merchant / date / total / category / claimable
 * plus two collapsible rationale sections sourced from
 * `extracted_data.reasoning` and `extracted_data.eligibility_explanation`.
 *
 * Edit and delete handlers are intentionally absent for this task — the Edit
 * button is a no-op placeholder that lights up in T6.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useReceipt } from '@/hooks/useReceipt';
import type { ReceiptRow } from '@/lib/supabase/queries/receiptDetail';

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

  return <LoadedState data={data} onBack={() => navigate(-1)} />;
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
  data,
  onBack,
}: {
  data: ReceiptRow;
  onBack: () => void;
}) {
  const reasoning = data.extracted_data?.reasoning;
  const eligibility = data.extracted_data?.eligibility_explanation;

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header row */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '4px 20px 12px' }}
      >
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
        <h1
          className="text-ink"
          style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}
        >
          Receipt
        </h1>
        <button
          type="button"
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
      </div>

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
          {/* Image */}
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

          <div style={{ padding: 18 }}>
            {/* Merchant */}
            <div
              className="font-bold text-ink"
              style={{ fontSize: 20, letterSpacing: -0.4 }}
            >
              {data.merchant_name}
            </div>
            <div
              className="text-muted"
              style={{ fontSize: 12, marginTop: 4 }}
            >
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

          {/* Collapsible rationale sections */}
          {reasoning != null && (
            <CollapsibleRow title="AI reasoning" body={reasoning} />
          )}
          {eligibility != null && (
            <CollapsibleRow title="Why eligible" body={eligibility} />
          )}
        </div>
      </div>
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
