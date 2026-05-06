/**
 * Insights — Tax | All spend tab control on /insights.
 *
 * Tax tab: embeds LhdnContent (same component as the standalone /lhdn screen)
 * showing all LHDN tax-relief categories, each collapsible with receipts + search.
 *
 * All spend tab: dual-curve line chart (real paths from daily cumulative
 * spend), By-category bars, and a searchable paginated receipts list.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatIcon } from '@/components/CatIcon';
import { Icon } from '@/components/Icon';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import {
  useAllReceiptsPage,
  useClaimableReceiptsPage,
  useInsights,
  RECEIPTS_PAGE_SIZE,
} from '@/hooks/useInsights';
import type { ReceiptListItem } from '@/lib/supabase/queries/insights';
import { categoryToIcon } from '@/lib/supabase/queries/activity';
import { insightsMock } from '@/mocks/seed';
import { LhdnContent } from '@/screens/Lhdn';

type Tab = 'claimable' | 'all-spend';

const TAB_OPTIONS = [
  { value: 'claimable', label: 'Tax' },
  { value: 'all-spend', label: 'All spend' },
] as const;

const CURRENT_CALENDAR_YEAR = new Date().getFullYear();
// Show years from 2022 up to the current calendar year.
const SELECTABLE_YEARS = Array.from(
  { length: CURRENT_CALENDAR_YEAR - 2022 + 1 },
  (_, i) => CURRENT_CALENDAR_YEAR - i,
);

const NOW = new Date();
// First day of the current month — used as the default for All spend.
const CURRENT_MONTH_START = new Date(NOW.getFullYear(), NOW.getMonth(), 1);

function addMonths(base: Date, delta: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

export default function Insights() {
  const navigate = useNavigate();
  const [year, setYear] = useState(CURRENT_CALENDAR_YEAR);
  const [tab, setTab] = useState<Tab>('claimable');
  // All spend month — defaults to the current month.
  const [spendMonth, setSpendMonth] = useState(CURRENT_MONTH_START);

  const { data: insightsData = insightsMock } = useInsights(spendMonth);
  const {
    monthLabel,
    totalRm,
    deltaPct,
    prevTotalRm,
    prevLabel,
    axis,
    pathCurrent,
    pathPrevious,
    areaCurrent,
    areaPrevious,
    categories,
  } = insightsData;

  const yearIdx = SELECTABLE_YEARS.indexOf(year);
  const canGoBack = yearIdx < SELECTABLE_YEARS.length - 1;
  const canGoForward = yearIdx > 0;
  const deltaIsNegative = deltaPct < 0;
  const deltaColor = deltaIsNegative ? '#1FB573' : '#D63440';
  const deltaSign = deltaIsNegative ? '−' : '+';

  // Month nav helpers for All spend tab.
  const canGoMonthBack = spendMonth.getTime() > new Date(2022, 0, 1).getTime();
  const canGoMonthForward = spendMonth.getTime() < CURRENT_MONTH_START.getTime();

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 12px' }}>
        <div className="flex items-center justify-between">
          <h1
            className="font-bold text-ink"
            style={{ fontSize: 28, letterSpacing: -0.7 }}
          >
            Insights
          </h1>
          {/* Year navigator — Tax tab only */}
          {tab === 'claimable' && (
            <div
              className="flex items-center"
              style={{
                gap: 2,
                background: '#F4F1FB',
                borderRadius: 999,
                padding: '3px 4px',
              }}
            >
              <button
                type="button"
                aria-label="Previous year"
                onClick={() => canGoBack && setYear(SELECTABLE_YEARS[yearIdx + 1])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: 'none',
                  border: 'none',
                  cursor: canGoBack ? 'pointer' : 'default',
                  opacity: canGoBack ? 1 : 0.3,
                }}
              >
                <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
                  <Icon name="chevronDown" size={13} color="#5837C9" strokeWidth={2.5} />
                </span>
              </button>
              <span
                className="font-bold"
                style={{ fontSize: 13, color: '#1A1530', letterSpacing: -0.3, minWidth: 36, textAlign: 'center' }}
              >
                {year}
              </span>
              <button
                type="button"
                aria-label="Next year"
                onClick={() => canGoForward && setYear(SELECTABLE_YEARS[yearIdx - 1])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: 'none',
                  border: 'none',
                  cursor: canGoForward ? 'pointer' : 'default',
                  opacity: canGoForward ? 1 : 0.3,
                }}
              >
                <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
                  <Icon name="chevronDown" size={13} color="#5837C9" strokeWidth={2.5} />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tax | All spend toggle */}
      <div style={{ padding: '0 20px 12px' }}>
        <SegmentedTabs<Tab>
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
          ariaLabel="Insights view"
        />
      </div>

      {tab === 'claimable' ? (
        <LhdnContent year={year} />
      ) : (
        <AllSpendPane
          monthLabel={monthLabel}
          totalRm={totalRm}
          deltaPct={deltaPct}
          deltaColor={deltaColor}
          deltaSign={deltaSign}
          prevTotalRm={prevTotalRm}
          prevLabel={prevLabel}
          axis={axis}
          pathCurrent={pathCurrent}
          pathPrevious={pathPrevious}
          areaCurrent={areaCurrent}
          areaPrevious={areaPrevious}
          categories={categories}
          spendMonth={spendMonth}
          canGoMonthBack={canGoMonthBack}
          canGoMonthForward={canGoMonthForward}
          onPrevMonth={() => setSpendMonth((m) => addMonths(m, -1))}
          onNextMonth={() => setSpendMonth((m) => addMonths(m, 1))}
          onDetails={() => navigate('/activity')}
        />
      )}
    </div>
  );
}

// ─── Shared search input ──────────────────────────────────────────────────────

function SearchInput({
  value,
  onChange,
  placeholder = 'Search receipts…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      className="flex items-center bg-surface"
      style={{
        gap: 8,
        padding: '8px 12px',
        borderRadius: 12,
        border: '0.5px solid rgba(91,71,168,0.14)',
        marginBottom: 10,
      }}
    >
      <Icon name="search" size={15} color="#A89DC1" strokeWidth={2} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontSize: 13,
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
          <Icon name="close" size={14} color="#A89DC1" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ─── Shared receipt row ──────────────────────────────────────────────────────

function fmtReceiptDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function ReceiptRow({ receipt, isLast }: { receipt: ReceiptListItem; isLast: boolean }) {
  const navigate = useNavigate();
  const iconName = categoryToIcon(receipt.category);
  return (
    <button
      type="button"
      onClick={() => navigate(`/receipts/${receipt.id}`)}
      className="flex items-center"
      style={{
        width: '100%',
        gap: 10,
        paddingTop: 10,
        paddingBottom: isLast ? 0 : 10,
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
          {receipt.merchant_name || '—'}
        </div>
        <div className="text-muted font-medium" style={{ fontSize: 11, marginTop: 1 }}>
          {fmtReceiptDate(receipt.receipt_date)}
          {receipt.category ? ` · ${receipt.category}` : ''}
        </div>
      </div>
      <div
        className="font-bold text-ink"
        style={{
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: -0.2,
          flexShrink: 0,
        }}
      >
        RM {Number(receipt.total_amount).toLocaleString('en-MY', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </button>
  );
}

// ─── Paginated + searchable receipts list (shared by both tabs) ───────────────

function PaginationBar({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '10px 14px',
        borderTop: '0.5px solid rgba(91,71,168,0.08)',
      }}
    >
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        className="flex items-center font-semibold"
        style={{
          gap: 4,
          fontSize: 12,
          color: page === 0 ? '#C4B8E0' : '#6E4CE6',
          background: 'none',
          border: 'none',
          cursor: page === 0 ? 'default' : 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
          <Icon name="chevronRight" size={14} color={page === 0 ? '#C4B8E0' : '#6E4CE6'} strokeWidth={2.5} />
        </span>
        Prev
      </button>
      <span className="text-muted font-medium" style={{ fontSize: 12 }}>
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        className="flex items-center font-semibold"
        style={{
          gap: 4,
          fontSize: 12,
          color: page >= totalPages - 1 ? '#C4B8E0' : '#6E4CE6',
          background: 'none',
          border: 'none',
          cursor: page >= totalPages - 1 ? 'default' : 'pointer',
        }}
      >
        Next
        <Icon name="chevronRight" size={14} color={page >= totalPages - 1 ? '#C4B8E0' : '#6E4CE6'} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/**
 * variant='claimable' — claimable receipts for the current tax year.
 * variant='all'       — all receipts for the selected month.
 */
function ReceiptsList({ variant, month }: { variant: 'claimable' | 'all'; month?: Date }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  const claimable = useClaimableReceiptsPage(page, search);
  const all = useAllReceiptsPage(page, search, month);
  const { data, isLoading } = variant === 'claimable' ? claimable : all;

  const rows = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / RECEIPTS_PAGE_SIZE));
  const emptyLabel = variant === 'claimable' ? 'No claimable receipts found' : 'No receipts found';

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 10 }}
      >
        <span className="font-bold text-ink" style={{ fontSize: 14, letterSpacing: -0.2 }}>
          {variant === 'claimable' ? 'Claimable receipts' : 'All receipts'}
        </span>
        <span className="text-muted font-medium" style={{ fontSize: 11 }}>
          {totalCount} total
        </span>
      </div>

      <SearchInput value={search} onChange={handleSearch} />

      <div
        className="bg-surface shadow-card"
        style={{
          borderRadius: 16,
          border: '0.5px solid rgba(91,71,168,0.10)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div
            className="text-muted font-medium"
            style={{ fontSize: 13, padding: '20px 0', textAlign: 'center' }}
          >
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div
            className="text-muted font-medium"
            style={{ fontSize: 13, padding: '20px 0', textAlign: 'center' }}
          >
            {search ? `No results for "${search}"` : emptyLabel}
          </div>
        ) : (
          <div style={{ padding: '0 14px' }}>
            {rows.map((r, i) => (
              <ReceiptRow key={r.id} receipt={r} isLast={i === rows.length - 1} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}

// ─── All spend ──────────────────────────────────────────────────────────────

type AllSpendProps = {
  monthLabel: string;
  totalRm: number;
  deltaPct: number;
  deltaColor: string;
  deltaSign: string;
  prevTotalRm: number;
  prevLabel: string;
  axis: typeof insightsMock.axis;
  pathCurrent: string;
  pathPrevious: string;
  areaCurrent: string;
  areaPrevious: string;
  categories: typeof insightsMock.categories;
  spendMonth: Date;
  canGoMonthBack: boolean;
  canGoMonthForward: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDetails: () => void;
};

function MonthNav({
  label,
  canBack,
  canForward,
  onBack,
  onForward,
}: {
  label: string;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 2,
        background: '#F4F1FB',
        borderRadius: 999,
        padding: '3px 4px',
        alignSelf: 'flex-start',
      }}
    >
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => canBack && onBack()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 999,
          background: 'none',
          border: 'none',
          cursor: canBack ? 'pointer' : 'default',
          opacity: canBack ? 1 : 0.3,
        }}
      >
        <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
          <Icon name="chevronDown" size={13} color="#5837C9" strokeWidth={2.5} />
        </span>
      </button>
      <span
        className="font-bold"
        style={{ fontSize: 13, color: '#1A1530', letterSpacing: -0.3, minWidth: 72, textAlign: 'center' }}
      >
        {label}
      </span>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => canForward && onForward()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 999,
          background: 'none',
          border: 'none',
          cursor: canForward ? 'pointer' : 'default',
          opacity: canForward ? 1 : 0.3,
        }}
      >
        <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
          <Icon name="chevronDown" size={13} color="#5837C9" strokeWidth={2.5} />
        </span>
      </button>
    </div>
  );
}

function AllSpendPane({
  monthLabel,
  totalRm,
  deltaPct,
  deltaColor,
  deltaSign,
  prevTotalRm,
  prevLabel,
  axis,
  pathCurrent,
  pathPrevious,
  areaCurrent,
  areaPrevious,
  categories,
  spendMonth,
  canGoMonthBack,
  canGoMonthForward,
  onPrevMonth,
  onNextMonth,
  onDetails,
}: AllSpendProps) {
  const monthNavLabel = spendMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  return (
    <>
      {/* Month navigator */}
      <div className="flex items-center justify-end" style={{ padding: '0 20px 10px' }}>
        <MonthNav
          label={monthNavLabel}
          canBack={canGoMonthBack}
          canForward={canGoMonthForward}
          onBack={onPrevMonth}
          onForward={onNextMonth}
        />
      </div>

      {/* Total spent card */}
      <div style={{ padding: '0 16px' }}>
        <div
          className="bg-surface shadow-card"
          style={{
            padding: 18,
            borderRadius: 22,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          <div
            className="text-muted font-semibold"
            style={{
              fontSize: 11,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            Total spent · {monthLabel}
          </div>
          <div className="flex items-baseline" style={{ gap: 6, marginTop: 4 }}>
            <span className="text-muted font-semibold" style={{ fontSize: 12 }}>RM</span>
            <span
              className="font-bold text-ink"
              style={{
                fontSize: 32,
                letterSpacing: -0.8,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {totalRm.toLocaleString('en-MY')}
            </span>
            <span
              className="font-bold"
              style={{ fontSize: 12, color: deltaColor, marginLeft: 6 }}
            >
              {deltaSign}{Math.abs(deltaPct)}%
            </span>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
            vs {prevLabel} · RM {prevTotalRm.toLocaleString('en-MY')}
          </div>

          {/* Dual-line chart — real paths from buildChartPaths */}
          <svg
            width="100%"
            height="180"
            viewBox="0 0 320 130"
            style={{ marginTop: 14, display: 'block' }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="ins1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#6E4CE6" stopOpacity="0.32" />
                <stop offset="1" stopColor="#6E4CE6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ins2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#C9BAFB" stopOpacity="0.18" />
                <stop offset="1" stopColor="#C9BAFB" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[25, 65, 105].map((y) => (
              <line
                key={y}
                x1="0"
                x2="320"
                y1={y}
                y2={y}
                stroke="rgba(91,71,168,0.10)"
                strokeDasharray="2 4"
              />
            ))}
            {/* previous month (faint) */}
            <path d={areaPrevious} fill="url(#ins2)" />
            <path
              d={pathPrevious}
              fill="none"
              stroke="#C9BAFB"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            {/* current month */}
            <path d={areaCurrent} fill="url(#ins1)" />
            <path d={pathCurrent} fill="none" stroke="#6E4CE6" strokeWidth="2.5" />
          </svg>

          <div
            className="flex items-center justify-between font-semibold"
            style={{ marginTop: 6, fontSize: 9, color: '#A89DC1' }}
          >
            {axis.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
          <div
            className="flex items-center text-muted font-medium"
            style={{ gap: 14, marginTop: 12, fontSize: 11 }}
          >
            <span className="flex items-center" style={{ gap: 6 }}>
              <span aria-hidden style={{ width: 10, height: 2, background: '#6E4CE6' }} />
              {monthLabel}
            </span>
            <span className="flex items-center" style={{ gap: 6 }}>
              <span aria-hidden style={{ width: 10, height: 2, background: '#C9BAFB' }} />
              {prevLabel}
            </span>
          </div>
        </div>
      </div>

      {/* By category */}
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 16, padding: '0 20px' }}
      >
        <span className="font-bold text-ink" style={{ fontSize: 14, letterSpacing: -0.2 }}>
          By category
        </span>
        <button
          type="button"
          onClick={onDetails}
          className="font-semibold text-purple"
          style={{ fontSize: 12, background: 'none', border: 'none' }}
        >
          Details
        </button>
      </div>
      <div style={{ padding: '0 16px', marginTop: 10 }}>
        <div
          className="bg-surface shadow-card"
          style={{
            padding: 16,
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          {categories.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center"
              style={{ gap: 10, marginBottom: i < categories.length - 1 ? 12 : 0 }}
            >
              <span
                className="font-semibold"
                style={{ width: 78, fontSize: 12, color: '#39314F', letterSpacing: -0.1 }}
              >
                {c.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: '#E8DFFB',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${c.pct}%`,
                    height: '100%',
                    background: c.color,
                    borderRadius: 4,
                  }}
                />
              </div>
              <span
                className="font-bold text-ink"
                style={{
                  width: 60,
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  letterSpacing: -0.2,
                }}
              >
                RM {c.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* All receipts (selected month, all categories) — key resets page/search on month change */}
      <ReceiptsList
        key={`${spendMonth.getFullYear()}-${spendMonth.getMonth()}`}
        variant="all"
        month={spendMonth}
      />
    </>
  );
}

