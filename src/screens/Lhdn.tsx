/**
 * Lhdn — LHDN tax-claims screen at /lhdn.
 *
 * LhdnContent is exported so Insights.tsx can embed it inside the Tax tab
 * without duplicating logic. The default export wraps it with the full-screen
 * header (back button + info).
 *
 * Categories are collapsible: tapping a row reveals a search input and the
 * receipts matched to that category code, newest-first. The "Recently tagged"
 * section is replaced by this per-category drill-down.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@/components/Icon';
import { CatIcon } from '@/components/CatIcon';
import { DonutRing } from '@/components/DonutRing';
import { useLhdn, useCategoryReceipts, DEFAULT_TAX_YEAR } from '@/hooks/useLhdn';
import { categoryToCatIcon, recentDateLabel } from '@/lib/supabase/queries/lhdn';
import type { ReceiptRow } from '@/lib/supabase/queries/lhdn';
import { lhdnMock } from '@/mocks/seed';
import type { LhdnCategory } from '@/mocks/seed';

const GRAD_CARD = 'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)';
const GRAD_GLOW =
  'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';

// ─── Inline search input ──────────────────────────────────────────────────────

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 8,
        padding: '8px 12px',
        borderRadius: 10,
        background: 'rgba(91,71,168,0.06)',
        border: '0.5px solid rgba(91,71,168,0.12)',
        marginBottom: 8,
      }}
    >
      <Icon name="search" size={14} color="#A89DC1" strokeWidth={2} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search receipts…"
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontSize: 12.5,
          color: '#1A1530',
          fontFamily: 'inherit',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        >
          <Icon name="close" size={13} color="#A89DC1" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ─── Per-category receipts panel ─────────────────────────────────────────────

function CategoryReceiptsPanel({ code, year }: { code: string; year: number }) {
  const navigate = useNavigate();
  const { data: receipts = [] } = useCategoryReceipts(code, year);
  const [search, setSearch] = useState('');

  const filtered = search
    ? receipts.filter((r) =>
        r.merchant_name.toLowerCase().includes(search.toLowerCase()),
      )
    : receipts;

  return (
    <div
      style={{
        borderTop: '0.5px solid rgba(91,71,168,0.08)',
        padding: '12px 14px 4px',
      }}
    >
      <SearchInput value={search} onChange={setSearch} />
      {filtered.length === 0 ? (
        <div
          className="text-muted"
          style={{ fontSize: 12, textAlign: 'center', padding: '8px 0 10px' }}
        >
          {search ? `No results for "${search}"` : 'No receipts for this category'}
        </div>
      ) : (
        filtered.map((r: ReceiptRow, i: number) => {
          const isLast = i === filtered.length - 1;
          const iconName = categoryToCatIcon(r.category);
          const dateLabel = recentDateLabel(r.receipt_date);
          const amount = Number(r.total_amount);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/receipts/${r.id}`)}
              className="flex items-center"
              style={{
                width: '100%',
                gap: 10,
                padding: '9px 0',
                background: 'none',
                border: 'none',
                borderBottom: isLast ? 'none' : '0.5px solid rgba(91,71,168,0.06)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <CatIcon name={iconName} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="font-semibold text-ink"
                  style={{
                    fontSize: 13,
                    letterSpacing: -0.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.merchant_name || '—'}
                </div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                  {dateLabel}
                </div>
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 12.5,
                  color: '#5837C9',
                  background: '#E8DFFB',
                  padding: '3px 8px',
                  borderRadius: 7,
                  letterSpacing: -0.1,
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                RM {amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

// ─── Category accordion row ───────────────────────────────────────────────────

function CategoryRow({
  category,
  isLast,
  isExpanded,
  onToggle,
  year,
}: {
  category: LhdnCategory;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  year: number;
}) {
  const unlimited = category.cap === 0;
  const ratio = !unlimited ? Math.min(category.used / category.cap, 1) : 0;

  return (
    <div
      style={{
        borderBottom: isLast && !isExpanded ? 'none' : '0.5px solid rgba(91,71,168,0.08)',
      }}
    >
      {/* Row header — tappable to expand/collapse */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center"
        style={{
          width: '100%',
          gap: 12,
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${category.color}15`,
            flexShrink: 0,
          }}
        >
          <Icon
            name={category.icon as IconName}
            size={18}
            color={category.color}
            strokeWidth={2}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 7 }}
          >
            <span
              className="font-semibold text-ink"
              style={{ fontSize: 13.5, letterSpacing: -0.1 }}
            >
              {category.name}
            </span>
            <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
              <span
                className="font-bold text-ink"
                style={{ fontSize: 13, letterSpacing: -0.2, fontVariantNumeric: 'tabular-nums' }}
              >
                RM {category.used.toLocaleString('en-MY')}
              </span>
              {!unlimited ? (
                <span className="text-muted" style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                  / {category.cap.toLocaleString('en-MY')}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: category.color,
                    background: `${category.color}15`,
                    padding: '2px 6px',
                    borderRadius: 5,
                    letterSpacing: 0.2,
                  }}
                >
                  Unlimited
                </span>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  transition: 'transform 0.2s',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <Icon name="chevronDown" size={14} color="#A89DC1" strokeWidth={2.5} />
              </span>
            </div>
          </div>
          {/* Progress bar — hidden for unlimited categories */}
          {!unlimited && (
            <div
              style={{
                height: 5,
                background: '#E8DFFB',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              {ratio > 0 && (
                <div
                  style={{
                    width: `${ratio * 100}%`,
                    height: '100%',
                    background: category.color,
                    borderRadius: 3,
                  }}
                />
              )}
            </div>
          )}
          <div className="text-muted" style={{ fontSize: 10.5, marginTop: unlimited ? 0 : 4 }}>
            {category.items} {category.items === 1 ? 'receipt' : 'receipts'}
          </div>
        </div>
      </button>

      {/* Expanded receipts panel */}
      {isExpanded && <CategoryReceiptsPanel code={category.id} year={year} />}
    </div>
  );
}

// ─── Shared LHDN content ─────────────────────────────────────────────────────

export function LhdnContent({ year = DEFAULT_TAX_YEAR }: { year?: number } = {}) {
  const { data = lhdnMock } = useLhdn(year);
  const { taxYear, insightCopy, insightHighlightRm, categories } = data;
  // All categories contribute to the total displayed in the hero.
  const total = categories.reduce((s, c) => s + c.used, 0);
  // Percentage and cap subtitle only count capped categories (cap > 0).
  // Unlimited categories (stored as cap = 0) would inflate the denominator
  // to millions (e.g. Zakat = 999,999 in DB), making the ring always 0%.
  const cappedCats = categories.filter((c) => c.cap > 0);
  const cappedCap = cappedCats.reduce((s, c) => s + c.cap, 0);
  const cappedUsed = cappedCats.reduce((s, c) => s + c.used, 0);
  const pct = cappedCap > 0 ? Math.round((cappedUsed / cappedCap) * 100) : 0;
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const toggleCode = (id: string) =>
    setExpandedCode((prev) => (prev === id ? null : id));

  return (
    <>
      {/* Hero card */}
      <div style={{ padding: '0 16px' }}>
        <div
          className="text-white shadow-purpleGlow"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 24,
            padding: '20px 22px 22px',
            background: GRAD_CARD,
          }}
        >
          <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, background: GRAD_GLOW, pointerEvents: 'none' }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: -50,
              top: -50,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
            }}
          />
          <div className="flex items-center justify-between" style={{ position: 'relative' }}>
            <div>
              <div
                className="font-semibold"
                style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase' }}
              >
                Total claimable
              </div>
              <div className="flex items-baseline" style={{ gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>RM</span>
                <span
                  style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}
                >
                  {total.toLocaleString('en-MY')}
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                of RM {cappedCap.toLocaleString('en-MY')} cap
              </div>
            </div>
            <DonutRing pct={pct} size={88} strokeWidth={6}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: '#fff' }}>
                {pct}%
              </span>
            </DonutRing>
          </div>
          {/* AI insight banner */}
          <div
            className="flex items-center"
            style={{
              position: 'relative',
              marginTop: 16,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.13)',
              backdropFilter: 'blur(8px)',
              border: '0.5px solid rgba(255,255,255,0.2)',
              gap: 10,
            }}
          >
            <Icon name="sparkle" size={14} color="#fff" strokeWidth={2.2} />
            <div style={{ flex: 1, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4 }}>
              <strong style={{ fontWeight: 700 }}>
                RM {insightHighlightRm.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
              {' '}{insightCopy}.
            </div>
          </div>
        </div>
      </div>

      {/* Reliefs by category */}
      <div style={{ padding: '20px 16px 0' }}>
        <div
          className="flex items-center justify-between"
          style={{ padding: '0 4px', marginBottom: 10 }}
        >
          <span className="font-bold text-ink" style={{ fontSize: 14, letterSpacing: -0.2 }}>
            {taxYear} · Reliefs by category
          </span>

        </div>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          {categories.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={c}
              isLast={i === categories.length - 1}
              isExpanded={expandedCode === c.id}
              onToggle={() => toggleCode(c.id)}
              year={year}
            />
          ))}
        </div>
      </div>

      <p
        className="text-muted"
        style={{ padding: '16px 20px 0', fontSize: 11, lineHeight: 1.5 }}
      >
        Estimates only · final relief is determined when filing Borang BE with LHDN.
      </p>
    </>
  );
}

// ─── Full screen (with header) ───────────────────────────────────────────────

export default function Lhdn() {
  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div
        style={{ padding: '4px 20px 12px' }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <Link
            to="/"
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
          </Link>
          <div>
            <div
              className="font-bold text-purple"
              style={{ fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}
            >
              LHDN
            </div>
            <h1 className="text-ink" style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
              Tax claims
            </h1>
          </div>
        </div>
        <button
          type="button"
          aria-label="Information"
          className="flex items-center justify-center bg-surface shadow-card"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          <Icon name="info" size={17} color="#39314F" />
        </button>
      </div>

      <LhdnContent />
    </div>
  );
}
