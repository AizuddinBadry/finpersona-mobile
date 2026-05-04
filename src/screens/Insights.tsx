/**
 * Insights — Claimable | All spend tab control on /insights.
 *
 * Default tab is Claimable: leads with remaining headroom across active
 * LHDN reliefs, a UtilizationDonut sized by per-category cap (claimed
 * solid, headroom faded), and tappable per-category rows that drill
 * into Activity filtered by category. The synthetic Other claimable
 * trailer (cap === 0) appears in the row list but not in the donut.
 *
 * All spend tab keeps the original visual: dual-curve line chart card,
 * By-category bars (Details link now wired to /activity), and the AI
 * forecast strip. The Week/Month/Year period switcher in the header
 * remains visual-only and is independent of the tab toggle.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { UtilizationDonut } from '@/components/UtilizationDonut';
import { useClaimableInsights, useInsights } from '@/hooks/useInsights';
import {
  claimableInsightsMock,
  insightsMock,
  type ClaimableCategory,
} from '@/mocks/seed';

const PERIODS = ['Week', 'Month', 'Year'] as const;
type Period = (typeof PERIODS)[number];
type Tab = 'claimable' | 'all-spend';

const TAB_OPTIONS = [
  { value: 'claimable', label: 'Claimable' },
  { value: 'all-spend', label: 'All spend' },
] as const;

const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';
const GRAD_INSIGHT = 'linear-gradient(135deg, #F5F2FE, #EDE7FB)';

export default function Insights() {
  const navigate = useNavigate();
  const { data: insightsData = insightsMock } = useInsights();
  const { data: claimableData = claimableInsightsMock } =
    useClaimableInsights();
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
    forecast,
  } = insightsData;
  const [period, setPeriod] = useState<Period>('Month');
  const [tab, setTab] = useState<Tab>('claimable');
  const deltaIsNegative = deltaPct < 0;
  const deltaColor = deltaIsNegative ? '#1FB573' : '#D63440';
  const deltaSign = deltaIsNegative ? '−' : '+';

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
          <div
            role="tablist"
            aria-label="Time range"
            className="flex items-center"
            style={{ gap: 6 }}
          >
            {PERIODS.map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(p)}
                  className="font-semibold"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    background: active ? '#1A1530' : 'transparent',
                    color: active ? '#fff' : '#7E7491',
                    border: 'none',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Claimable | All spend toggle */}
      <div style={{ padding: '0 20px 12px' }}>
        <SegmentedTabs<Tab>
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
          ariaLabel="Insights view"
        />
      </div>

      {tab === 'claimable' ? (
        <ClaimablePane
          data={claimableData}
          onRowClick={(code) => navigate(`/activity?category=${code}`)}
        />
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
          forecast={forecast}
          onDetails={() => navigate('/activity')}
        />
      )}
    </div>
  );
}

// ─── Claimable ──────────────────────────────────────────────────────────────

function ClaimablePane({
  data,
  onRowClick,
}: {
  data: typeof claimableInsightsMock;
  onRowClick: (code: string) => void;
}) {
  const { headroom, totalCap, totalClaimed, categoryCount, categories } = data;
  const donutSegments = categories
    .filter((c) => c.cap > 0)
    .map((c) => ({
      code: c.code,
      color: c.color,
      cap: c.cap,
      claimed: c.claimed,
    }));
  const centerLabel = `RM ${totalClaimed.toLocaleString(
    'en-MY',
  )} of RM ${totalCap.toLocaleString('en-MY')}`;

  return (
    <>
      {/* Headline card */}
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
            REMAINING HEADROOM
          </div>
          <div
            className="flex items-baseline"
            style={{ gap: 6, marginTop: 4 }}
          >
            <span
              className="text-muted font-semibold"
              style={{ fontSize: 12 }}
            >
              RM
            </span>
            <span
              className="font-bold text-ink"
              style={{
                fontSize: 32,
                letterSpacing: -0.8,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {headroom.toLocaleString('en-MY')}
            </span>
          </div>
          <div
            className="text-muted"
            style={{ fontSize: 11, marginTop: 2 }}
          >
            headroom across {categoryCount} reliefs
          </div>

          {/* Donut */}
          <div
            className="flex items-center justify-center"
            style={{ marginTop: 14 }}
          >
            <UtilizationDonut
              segments={donutSegments}
              centerLabel={centerLabel}
            />
          </div>
        </div>
      </div>

      {/* Per-category rows */}
      <div style={{ padding: '0 16px', marginTop: 12 }}>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          {categories.map((c, i) => (
            <ClaimableRow
              key={c.code}
              category={c}
              isLast={i === categories.length - 1}
              onClick={() => onRowClick(c.code)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function ClaimableRow({
  category,
  isLast,
  onClick,
}: {
  category: ClaimableCategory;
  isLast: boolean;
  onClick: () => void;
}) {
  const isOther = category.cap === 0;
  const fillPct = isOther ? 0 : Math.min(category.pct * 100, 100);
  const trackBg = isOther ? 'rgba(160,160,182,0.20)' : '#E8DFFB';

  return (
    <button
      type="button"
      aria-label={`View ${category.name} receipts`}
      onClick={onClick}
      className="flex items-center"
      style={{
        width: '100%',
        gap: 12,
        padding: '12px 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: isLast
          ? 'none'
          : '0.5px solid rgba(91,71,168,0.08)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Icon tile */}
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
          name={category.icon}
          size={18}
          color={category.color}
          strokeWidth={2}
        />
      </div>

      {/* Name + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-semibold text-ink"
          style={{
            fontSize: 15,
            letterSpacing: -0.1,
            marginBottom: 6,
          }}
        >
          {category.name}
        </div>
        <div
          style={{
            height: 6,
            background: trackBg,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {!isOther && (
            <div
              style={{
                width: `${fillPct}%`,
                height: '100%',
                background: category.color,
                borderRadius: 3,
              }}
            />
          )}
        </div>
      </div>

      {/* Right amount */}
      <div
        className="font-bold text-ink"
        style={{
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: -0.2,
          flexShrink: 0,
          textAlign: 'right',
        }}
      >
        RM {category.claimed.toLocaleString('en-MY')} /{' '}
        {isOther
          ? '—'
          : `RM ${category.cap.toLocaleString('en-MY')}`}
      </div>
    </button>
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
  forecast: typeof insightsMock.forecast;
  onDetails: () => void;
};

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
  forecast,
  onDetails,
}: AllSpendProps) {
  return (
    <>
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
          <div
            className="flex items-baseline"
            style={{ gap: 6, marginTop: 4 }}
          >
            <span
              className="text-muted font-semibold"
              style={{ fontSize: 12 }}
            >
              RM
            </span>
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
              style={{
                fontSize: 12,
                color: deltaColor,
                marginLeft: 6,
              }}
            >
              {deltaSign}
              {Math.abs(deltaPct)}%
            </span>
          </div>
          <div
            className="text-muted"
            style={{ fontSize: 11, marginTop: 2 }}
          >
            vs {prevLabel} · RM {prevTotalRm.toLocaleString('en-MY')}
          </div>

          {/* Dual-line chart */}
          <svg
            width="100%"
            height="100"
            viewBox="0 0 320 100"
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
            {/* gridlines */}
            {[20, 50, 80].map((y) => (
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
            <path
              d={pathCurrent}
              fill="none"
              stroke="#6E4CE6"
              strokeWidth="2.5"
            />
            <circle cx="320" cy="36" r="4" fill="#6E4CE6" />
            <circle cx="320" cy="36" r="7" fill="#6E4CE6" fillOpacity="0.2" />
          </svg>

          <div
            className="flex items-center justify-between font-semibold"
            style={{
              marginTop: 6,
              fontSize: 9,
              color: '#A89DC1',
            }}
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
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 2,
                  background: '#6E4CE6',
                }}
              />
              {monthLabel}
            </span>
            <span className="flex items-center" style={{ gap: 6 }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 2,
                  background: '#C9BAFB',
                }}
              />
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
        <span
          className="font-bold text-ink"
          style={{ fontSize: 14, letterSpacing: -0.2 }}
        >
          By category
        </span>
        <button
          type="button"
          onClick={onDetails}
          className="font-semibold text-purple"
          style={{
            fontSize: 12,
            background: 'none',
            border: 'none',
          }}
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
              style={{
                gap: 10,
                marginBottom: i < categories.length - 1 ? 12 : 0,
              }}
            >
              <span
                className="font-semibold"
                style={{
                  width: 78,
                  fontSize: 12,
                  color: '#39314F',
                  letterSpacing: -0.1,
                }}
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

      {/* AI forecast strip */}
      <div style={{ padding: '14px 16px 0' }}>
        <div
          className="flex items-start"
          style={{
            padding: '14px 16px',
            borderRadius: 18,
            background: GRAD_INSIGHT,
            border: '0.5px solid rgba(91,71,168,0.10)',
            gap: 12,
          }}
        >
          <div
            className="flex items-center justify-center shadow-purpleGlow"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: GRAD_HERO,
              flexShrink: 0,
            }}
          >
            <Icon name="sparkle" size={16} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div
              className="font-bold"
              style={{
                fontSize: 10,
                color: '#6E4CE6',
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              FORECAST · {forecast.period.toUpperCase()}
            </div>
            <div
              className="text-ink font-medium"
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                letterSpacing: -0.1,
              }}
            >
              At current pace, {forecast.period} trends to{' '}
              <strong>RM {forecast.pace.toLocaleString('en-MY')}</strong>.
              Capping weekend dining keeps you under{' '}
              <strong>RM {forecast.capped.toLocaleString('en-MY')}</strong>.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
