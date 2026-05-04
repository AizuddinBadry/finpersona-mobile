/**
 * Activity — visual port of Finpersona-mobile-build/screens-2.jsx.
 *
 * Renders BETWEEN the StatusBar and BottomNav supplied by AppShell. Reached
 * from Home's "See all" link. Filter chips are interactive (active class
 * swaps on tap via aria-pressed) but don't actually filter the list — that's
 * deferred until backend wiring lands. Data lives in src/mocks/seed.ts.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { CatIcon } from '@/components/CatIcon';
import { activityMock } from '@/mocks/seed';
import { useActivity } from '@/hooks/useActivity';
import { categoryToCode } from '@/lib/supabase/queries/lhdn';

const FILTERS = ['All', 'LHDN', 'Food', 'Transport', 'Medical', 'Books'] as const;
type Filter = (typeof FILTERS)[number];

function formatRm(amount: number): string {
  const sign = amount < 0 ? '−' : amount > 0 ? '+' : '';
  const abs = Math.abs(amount);
  return `${sign}RM ${abs.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatForeign(currency: 'SGD' | 'USD', amount: number): string {
  const sign = amount < 0 ? '−' : '+';
  const symbol = currency === 'USD' ? '$' : 'S$';
  return `${sign}${symbol}${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Render a URL ?category= code as a human-readable chip label.
 * 'lifestyle_general' → 'Lifestyle general'
 * 'medical_health'    → 'Medical health'
 * 'other-claimable'   → 'Other claimable' (synthetic bucket)
 */
function categoryLabel(code: string): string {
  const spaced = code.replace(/_/g, ' ').replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function Activity() {
  const [active, setActive] = useState<Filter>('All');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  // Live data from supabase; falls back to the mock while loading or signed out.
  const { data = activityMock } = useActivity();
  const { summary, transactions, groups } = data;

  // Apply ?category=<code> URL filter. When 'other-claimable', match rows
  // that are claimable but don't bucket to any known LHDN code. Otherwise,
  // bucket the row's free-text category through categoryToCode and compare.
  const filteredTransactions = categoryFilter
    ? transactions.filter((t) => {
        if (categoryFilter === 'other-claimable') {
          return t.lhdn === true && categoryToCode(t.category) === null;
        }
        return categoryToCode(t.category) === categoryFilter;
      })
    : transactions;

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '4px 20px 12px' }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
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
          <h1
            className="text-ink"
            style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}
          >
            Activity
          </h1>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          {(['filter', 'download'] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-label={n === 'filter' ? 'Filter' : 'Download'}
              className="flex items-center justify-center bg-surface shadow-card"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                border: '0.5px solid rgba(91,71,168,0.10)',
              }}
            >
              <Icon name={n} size={17} color="#39314F" />
            </button>
          ))}
        </div>
      </div>

      {/* Search (visual only) */}
      <div style={{ padding: '0 20px' }}>
        <div
          className="flex items-center bg-surface shadow-card"
          style={{
            gap: 8,
            padding: '11px 14px',
            borderRadius: 14,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
          aria-hidden
        >
          <Icon name="search" size={16} color="#7A7392" />
          <span
            className="font-medium text-faint"
            style={{ fontSize: 14 }}
          >
            Search merchants, categories…
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div
        role="group"
        aria-label="Transaction filters"
        className="flex"
        style={{
          gap: 8,
          padding: '12px 20px 4px',
          overflowX: 'auto',
        }}
      >
        {FILTERS.map((f) => {
          const isActive = active === f;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(f)}
              className="font-semibold"
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 12,
                background: isActive ? '#1A1530' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#39314F',
                border: isActive
                  ? 'none'
                  : '0.5px solid rgba(91,71,168,0.10)',
                boxShadow: isActive
                  ? 'none'
                  : '0 6px 18px rgba(60,40,140,0.06)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Summary band */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          className="flex"
          style={{
            padding: '14px 16px',
            borderRadius: 16,
            background: '#F1ECFB',
            justifyContent: 'space-between',
          }}
        >
          {(
            [
              { l: 'In', v: formatRm(summary.in), c: '#1FB573', align: 'left' as const },
              { l: 'Out', v: formatRm(summary.out), c: '#1A1530', align: 'center' as const },
              { l: 'LHDN', v: formatRm(summary.lhdn), c: '#5837C9', align: 'right' as const },
            ]
          ).map((s) => (
            <div key={s.l} style={{ flex: 1, textAlign: s.align }}>
              <div
                className="font-semibold text-muted"
                style={{
                  fontSize: 10,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {s.l}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: s.c,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: -0.3,
                  marginTop: 2,
                }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* URL filter chip — sits above the day groups when ?category is set. */}
      {categoryFilter && (
        <div style={{ padding: '12px 16px 0' }}>
          <button
            type="button"
            aria-label="Clear filter"
            onClick={() => setSearchParams({})}
            className="flex items-center font-semibold"
            style={{
              gap: 8,
              padding: '7px 12px',
              borderRadius: 999,
              fontSize: 12,
              background: '#E8DFFB',
              color: '#5837C9',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>Filtered: {categoryLabel(categoryFilter)}</span>
            <span aria-hidden style={{ opacity: 0.7 }}>·</span>
            <span aria-hidden>✕</span>
          </button>
        </div>
      )}

      {/* Grouped transactions */}
      <div style={{ padding: '16px 16px 0' }}>
        {categoryFilter && filteredTransactions.length === 0 && (
          <div
            className="bg-surface"
            style={{
              padding: '20px 16px',
              borderRadius: 16,
              background: '#F1ECFB',
              color: '#5B4FA8',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            No receipts in this category yet — start by tapping ＋ to capture one.
          </div>
        )}
        {groups.map((g) => {
          const items = filteredTransactions.filter((t) => t.day === g.key);
          if (items.length === 0) return null;
          return (
            <div key={g.key} style={{ marginBottom: 16 }}>
              <div
                className="font-bold text-muted"
                style={{
                  fontSize: 11,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  padding: '0 4px 8px',
                }}
              >
                {g.label}
              </div>
              <div
                className="bg-surface shadow-card"
                style={{
                  borderRadius: 16,
                  border: '0.5px solid rgba(91,71,168,0.10)',
                  overflow: 'hidden',
                }}
              >
                {items.map((t, i) => {
                  const isIncome = t.amount > 0;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-label={`View receipt ${t.name}`}
                      onClick={() => navigate(`/receipts/${t.id}`)}
                      className="flex items-center"
                      style={{
                        width: '100%',
                        gap: 12,
                        padding: '13px 14px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderBottom:
                          i < items.length - 1
                            ? '0.5px solid rgba(91,71,168,0.08)'
                            : 'none',
                      }}
                    >
                      <CatIcon name={t.icon} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center" style={{ gap: 6 }}>
                          <span
                            className="font-semibold text-ink"
                            style={{ fontSize: 14, letterSpacing: -0.2 }}
                          >
                            {t.name}
                          </span>
                          {t.lhdn && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: '#5837C9',
                                background: '#E8DFFB',
                                padding: '2px 6px',
                                borderRadius: 4,
                                letterSpacing: 0.3,
                              }}
                            >
                              LHDN
                            </span>
                          )}
                        </div>
                        <div
                          className="text-muted"
                          style={{ fontSize: 11, marginTop: 2 }}
                        >
                          {t.category} · {t.time}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            color: isIncome ? '#1FB573' : '#1A1530',
                            letterSpacing: -0.2,
                          }}
                        >
                          {t.currency && t.convertedMyr !== undefined
                            ? formatRm(t.convertedMyr)
                            : formatRm(t.amount)}
                        </div>
                        {t.currency && (
                          <div
                            className="text-muted"
                            style={{ fontSize: 10, marginTop: 2 }}
                          >
                            {formatForeign(t.currency, t.amount)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
