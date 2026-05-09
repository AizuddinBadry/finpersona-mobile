/**
 * Activity — visual port of Finpersona-mobile-build/screens-2.jsx.
 *
 * Renders BETWEEN the StatusBar and BottomNav supplied by AppShell. Reached
 * from Home's "See all" link. The in-component FILTERS chips remain visual
 * only (active class swaps on tap via aria-pressed) pending backend wiring,
 * but the ?category= URL param actually filters the rendered rows — set by
 * Insights drill-ins. Data lives in src/mocks/seed.ts.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { CatIcon } from '@/components/CatIcon';
import { activityMock } from '@/mocks/seed';
import { useActivity } from '@/hooks/useActivity';
import { categoryToCode } from '@/lib/supabase/queries/lhdn';

const FILTERS = ['All', 'Claimable', 'Food', 'Transport', 'Medical', 'Books'] as const;
type Filter = (typeof FILTERS)[number];

const CATEGORY_KEYWORDS: Record<Exclude<Filter, 'All' | 'Claimable'>, string[]> = {
  Food: ['food', 'dining', 'restaurant', 'cafe', 'coffee', 'makan'],
  Transport: ['transport', 'fuel', 'petrol', 'grab', 'taxi', 'toll', 'parking'],
  Medical: ['medical', 'health', 'clinic', 'klinik', 'hospital', 'pharmacy', 'farmasi'],
  Books: ['book', 'buku', 'lifestyle', 'education', 'stationary'],
};

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
  return code
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Build a CSV string from the filtered transactions. Quotes any value that
 * contains a comma, quote, or newline — RFC-4180 minimal escaping. Keep
 * columns aligned to what users actually want to see in Excel/Sheets.
 */
function toCsv(rows: ReadonlyArray<{
  day: string;
  time: string;
  name: string;
  category: string;
  amount: number;
  currency?: string;
  convertedMyr?: number;
  lhdn?: boolean;
}>): string {
  const escape = (v: string | number | boolean) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Day', 'Time', 'Merchant', 'Category', 'Amount (MYR)', 'Foreign', 'Claimable'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const myr =
      r.currency && r.convertedMyr !== undefined ? r.convertedMyr : r.amount;
    const foreign = r.currency ? `${r.currency} ${r.amount.toFixed(2)}` : '';
    lines.push(
      [
        escape(r.day),
        escape(r.time),
        escape(r.name),
        escape(r.category),
        escape(myr.toFixed(2)),
        escape(foreign),
        escape(r.lhdn ? 'Yes' : 'No'),
      ].join(','),
    );
  }
  return lines.join('\n');
}

function downloadCsv(filename: string, csv: string) {
  // Prepend BOM so Excel auto-detects UTF-8 (handles RM symbol, MYR text, etc.)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the click handler has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Activity() {
  const [active, setActive] = useState<Filter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  // Live data from supabase; falls back to the mock while loading or signed out.
  const { data = activityMock } = useActivity();
  const { summary, transactions, groups } = data;

  // 1. Apply ?category=<code> URL filter (from Insights drill-in).
  const urlFiltered = categoryFilter
    ? transactions.filter((t) => {
        if (categoryFilter === 'other-claimable') {
          return t.lhdn === true && categoryToCode(t.category) === null;
        }
        return categoryToCode(t.category) === categoryFilter;
      })
    : transactions;

  // 2. Apply chip filter.
  const chipFiltered =
    active === 'All'
      ? urlFiltered
      : active === 'Claimable'
        ? urlFiltered.filter((t) => t.lhdn === true)
        : urlFiltered.filter((t) => {
            const keywords = CATEGORY_KEYWORDS[active];
            const cat = t.category.toLowerCase();
            return keywords.some((kw) => cat.includes(kw));
          });

  // 3. Apply search query (merchant name or category, case-insensitive).
  const q = searchQuery.trim().toLowerCase();
  const filteredTransactions = q
    ? chipFiltered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      )
    : chipFiltered;

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
          <button
            type="button"
            aria-label="Filter"
            onClick={() => setFilterSheetOpen(true)}
            className="flex items-center justify-center bg-surface shadow-card"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              border: '0.5px solid rgba(91,71,168,0.10)',
              position: 'relative',
            }}
          >
            <Icon name="filter" size={17} color="#39314F" />
            {(active !== 'All' || categoryFilter) && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: '#6E4CE6',
                  border: '1.5px solid #fff',
                }}
              />
            )}
          </button>
          <button
            type="button"
            aria-label="Download"
            onClick={() => {
              if (filteredTransactions.length === 0) return;
              const stamp = new Date().toISOString().slice(0, 10);
              const suffix =
                categoryFilter ?? (active !== 'All' ? active.toLowerCase() : 'all');
              downloadCsv(
                `activity-${suffix}-${stamp}.csv`,
                toCsv(filteredTransactions),
              );
            }}
            disabled={filteredTransactions.length === 0}
            className="flex items-center justify-center bg-surface shadow-card"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              border: '0.5px solid rgba(91,71,168,0.10)',
              opacity: filteredTransactions.length === 0 ? 0.45 : 1,
              cursor: filteredTransactions.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Icon name="download" size={17} color="#39314F" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px' }}>
        <label
          className="flex items-center bg-surface shadow-card"
          style={{
            gap: 8,
            padding: '11px 14px',
            borderRadius: 14,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          <Icon name="search" size={16} color="#7A7392" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchants, categories…"
            aria-label="Search transactions"
            className="font-medium text-ink"
            style={{
              flex: 1,
              fontSize: 14,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <Icon name="close" size={14} color="#7A7392" />
            </button>
          )}
        </label>
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
              { l: 'Claimable', v: formatRm(summary.lhdn), c: '#5837C9', align: 'right' as const },
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
            <span aria-hidden style={{ opacity: 0.7 }}>{' · '}</span>
            <span aria-hidden>✕</span>
          </button>
        </div>
      )}

      {/* Grouped transactions */}
      <div style={{ padding: '16px 16px 0' }}>
        {categoryFilter && filteredTransactions.length === 0 && (
          <div
            role="status"
            aria-live="polite"
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
                              Claimable
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

      {/* Filter sheet — primary affordance for the top-right Filter icon. The
          inline chip strip stays as the quick-toggle path; this sheet groups
          the same filters with larger touch targets plus a Clear-all action
          and the URL-derived category chip in one place. */}
      {filterSheetOpen && (
        <>
          <div
            onClick={() => setFilterSheetOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.40)',
              zIndex: 110,
            }}
          />
          <div
            role="dialog"
            aria-label="Filter activity"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 120,
              borderRadius: '20px 20px 0 0',
              background: '#fff',
              padding: '20px 20px 32px',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            <div
              aria-hidden
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: '#E0DBF0',
                margin: '0 auto 16px',
              }}
            />
            <div
              className="font-bold text-ink"
              style={{ fontSize: 17, letterSpacing: -0.3, marginBottom: 16 }}
            >
              Filter
            </div>

            {categoryFilter && (
              <div style={{ marginBottom: 16 }}>
                <div
                  className="font-bold text-muted"
                  style={{
                    fontSize: 10,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  From insights
                </div>
                <div
                  className="flex items-center justify-between"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: '#F1ECFB',
                    color: '#5837C9',
                  }}
                >
                  <span className="font-semibold" style={{ fontSize: 13 }}>
                    {categoryLabel(categoryFilter)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className="font-semibold"
                    style={{
                      background: '#fff',
                      border: 'none',
                      borderRadius: 999,
                      padding: '6px 12px',
                      fontSize: 11,
                      color: '#5837C9',
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div
              className="font-bold text-muted"
              style={{
                fontSize: 10,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Category
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                      padding: '10px 16px',
                      borderRadius: 999,
                      fontSize: 13,
                      background: isActive ? '#1A1530' : '#F8F7FC',
                      color: isActive ? '#FFFFFF' : '#39314F',
                      border: isActive
                        ? 'none'
                        : '0.5px solid rgba(91,71,168,0.16)',
                      cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <div className="flex" style={{ gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={() => {
                  setActive('All');
                  setSearchParams({});
                }}
                disabled={active === 'All' && !categoryFilter}
                className="font-semibold"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 12,
                  background: '#F0EEF8',
                  color: '#7A7392',
                  border: 'none',
                  fontSize: 13,
                  cursor:
                    active === 'All' && !categoryFilter ? 'not-allowed' : 'pointer',
                  opacity: active === 'All' && !categoryFilter ? 0.5 : 1,
                }}
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="font-semibold"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 12,
                  background:
                    'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
