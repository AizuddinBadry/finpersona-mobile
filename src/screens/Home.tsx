/**
 * Home — visual port of Finpersona-mobile-build/screens-1.jsx.
 *
 * Renders BETWEEN the StatusBar and BottomNav supplied by AppShell, so this
 * file only owns the scrolling content area. Bottom padding leaves room for
 * the floating glass nav (`bottom: 18`, `height: 72` → ~110px reservation).
 *
 * Data is read from src/mocks/seed.ts. Static links use react-router-dom
 * <Link> to /rewards, /lhdn, /activity (those are still Placeholder routes
 * until later Phase 2 tasks port them).
 */
import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { CatIcon } from '@/components/CatIcon';
import { homeMock } from '@/mocks/seed';

const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';
const GRAD_CARD =
  'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)';
const GRAD_GLOW =
  'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';

function formatRm(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}RM ${abs.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatRmShort(amount: number): string {
  return amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPoints(n: number): string {
  return n.toLocaleString('en-MY');
}

export default function Home() {
  const { user, balance, insight, spendingBars, lhdn, recent } = homeMock;
  const lhdnPct = Math.round((lhdn.used / lhdn.cap) * 100);
  const lhdnRemaining = lhdn.cap - lhdn.used;

  // Donut math for the LHDN progress ring.
  const R = 32;
  const C = 2 * Math.PI * R;
  const donutDash = `${(C * lhdnPct) / 100} ${C}`;

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '4px 20px 0' }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          <Avatar initials={user.initials} size={36} ring />
          <div>
            <div
              className="font-medium text-muted"
              style={{ fontSize: 12, letterSpacing: -0.1 }}
            >
              {user.greeting.split(', ')[0]}
            </div>
            <div
              className="font-semibold text-ink"
              style={{ fontSize: 15, letterSpacing: -0.2 }}
            >
              {user.greeting.split(', ')[1] ?? ''}
            </div>
          </div>
          {/* Hidden machine-readable greeting for tests / a11y */}
          <span className="sr-only">{user.greeting}</span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Link
            to="/rewards"
            className="flex items-center font-bold text-white"
            aria-label={`${formatPoints(user.points)} Persona Points`}
            style={{
              gap: 6,
              padding: '0 12px',
              height: 36,
              borderRadius: 18,
              background: GRAD_HERO,
              boxShadow:
                '0 12px 32px rgba(110,76,230,0.32), 0 4px 12px rgba(110,76,230,0.20)',
              textDecoration: 'none',
            }}
          >
            <Icon name="star" size={14} color="#fff" strokeWidth={2.4} />
            <span
              style={{
                fontSize: 13,
                letterSpacing: -0.2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatPoints(user.points)} pts
            </span>
          </Link>
          <button
            type="button"
            aria-label="Notifications"
            className="bg-surface shadow-card flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              border: '0.5px solid rgba(91,71,168,0.10)',
            }}
          >
            <Icon name="bell" size={18} color="#3A3458" />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        {/* Hero balance card */}
        <div
          className="relative overflow-hidden text-white"
          style={{
            borderRadius: 24,
            padding: '20px 22px 22px',
            background: GRAD_CARD,
            boxShadow:
              '0 12px 32px rgba(110,76,230,0.32), 0 4px 12px rgba(110,76,230,0.20)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: GRAD_GLOW }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              right: -40,
              top: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              right: 60,
              bottom: -60,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(201,186,251,0.4), transparent 70%)',
            }}
          />

          <div
            className="relative flex items-center justify-between"
            style={{ marginBottom: 8 }}
          >
            <span
              className="font-medium uppercase"
              style={{
                fontSize: 12,
                opacity: 0.85,
                letterSpacing: 0.4,
              }}
            >
              Total balance
            </span>
            <Icon name="eye" size={16} color="rgba(255,255,255,0.85)" />
          </div>
          <div
            className="relative"
            style={{ marginBottom: 4 }}
            aria-label={`Total balance ${formatRm(balance.mainMyr)}`}
          >
            {/* Visible split layout for mockup fidelity */}
            <span aria-hidden className="inline-flex items-baseline" style={{ gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.85 }}>
                RM
              </span>
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  letterSpacing: -1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatRmShort(balance.mainMyr).split('.')[0]}
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  opacity: 0.7,
                  letterSpacing: -0.3,
                }}
              >
                .{formatRmShort(balance.mainMyr).split('.')[1]}
              </span>
            </span>
            {/* Machine-readable form (used by tests / screen readers) */}
            <span className="sr-only">{formatRm(balance.mainMyr)}</span>
          </div>
          <div
            className="relative flex items-center"
            style={{
              gap: 6,
              fontSize: 12,
              opacity: 0.85,
              marginBottom: 18,
            }}
          >
            <Icon name="arrowUp" size={12} color="#C9F5DD" strokeWidth={2.4} />
            <span style={{ color: '#D5F8E3', fontWeight: 600 }}>
              ± RM 240.10
            </span>
            <span>this month</span>
          </div>

          {/* Currency pills */}
          <div className="relative flex" style={{ gap: 8 }}>
            {balance.currencies.map((b) => (
              <div
                key={b.code}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.13)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '0.5px solid rgba(255,255,255,0.18)',
                }}
              >
                <div
                  className="font-medium"
                  style={{
                    fontSize: 10,
                    opacity: 0.8,
                    marginBottom: 2,
                    letterSpacing: 0.3,
                  }}
                >
                  {b.flag} {b.code}
                </div>
                <div
                  className="font-bold"
                  style={{
                    fontSize: 14,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: -0.2,
                  }}
                >
                  {formatRmShort(b.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginTop: 18,
          }}
        >
          {[
            { icon: 'transfer' as const, label: 'Transfer', to: '/cards' },
            { icon: 'arrowDown' as const, label: 'Top up', to: '/cards' },
            { icon: 'star' as const, label: 'Rewards', to: '/rewards' },
            { icon: 'receipt' as const, label: 'LHDN', to: '/lhdn' },
          ].map((q) => (
            <Link
              key={q.label}
              to={q.to}
              className="bg-surface shadow-card flex flex-col items-center"
              style={{
                borderRadius: 16,
                padding: '14px 8px',
                gap: 8,
                border: '0.5px solid rgba(91,71,168,0.10)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                className="bg-mist flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                }}
              >
                <Icon name={q.icon} size={18} color="#6E4CE6" strokeWidth={2} />
              </div>
              <span
                className="font-semibold text-ink2"
                style={{ fontSize: 11, letterSpacing: -0.1 }}
              >
                {q.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Persona Points strip */}
        <Link
          to="/rewards"
          className="bg-surface shadow-card relative flex items-center"
          style={{
            marginTop: 14,
            padding: '14px 16px',
            borderRadius: 18,
            border: '0.5px solid rgba(91,71,168,0.10)',
            gap: 12,
            overflow: 'hidden',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              background: GRAD_HERO,
              boxShadow:
                '0 12px 32px rgba(110,76,230,0.32), 0 4px 12px rgba(110,76,230,0.20)',
            }}
          >
            <Icon name="star" size={20} color="#fff" strokeWidth={2.4} />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ borderRadius: 14, background: GRAD_GLOW }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-baseline" style={{ gap: 4 }}>
              <span
                className="font-bold text-ink"
                style={{
                  fontSize: 18,
                  letterSpacing: -0.4,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatPoints(user.points)}
              </span>
              <span
                className="font-semibold text-muted"
                style={{ fontSize: 11 }}
              >
                pts · Sapphire
              </span>
            </div>
            <div
              className="bg-mistDeep"
              style={{
                marginTop: 6,
                height: 5,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '68%',
                  height: '100%',
                  background: GRAD_HERO,
                  borderRadius: 3,
                }}
              />
            </div>
            <div
              className="font-medium text-muted"
              style={{ fontSize: 10.5, marginTop: 5 }}
            >
              480 pts to Amethyst · 1.5x multiplier
            </div>
          </div>
          <div
            className="text-purple flex items-center font-bold"
            style={{ gap: 4, fontSize: 12, flexShrink: 0 }}
          >
            Redeem
            <Icon name="chevronRight" size={14} color="#6E4CE6" strokeWidth={2.2} />
          </div>
        </Link>

        {/* AI Insight chip */}
        <div
          className="bg-surface shadow-card relative overflow-hidden"
          style={{
            marginTop: 18,
            padding: '14px 16px',
            borderRadius: 18,
            border: '1px solid rgba(91,71,168,0.10)',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: GRAD_HERO,
            }}
          />
          <div className="flex items-start" style={{ gap: 12 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                flexShrink: 0,
                background: GRAD_HERO,
                boxShadow:
                  '0 12px 32px rgba(110,76,230,0.32), 0 4px 12px rgba(110,76,230,0.20)',
              }}
            >
              <Icon name="sparkle" size={16} color="#fff" strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="text-purple font-bold uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: 0.6,
                  marginBottom: 4,
                }}
              >
                Finpersona · {insight.persona}
              </div>
              <div
                className="font-medium text-ink"
                style={{
                  fontSize: 13,
                  lineHeight: 1.45,
                  letterSpacing: -0.1,
                }}
              >
                {insight.body}
              </div>
              <button
                type="button"
                className="text-purple flex items-center font-semibold"
                style={{
                  marginTop: 8,
                  gap: 4,
                  fontSize: 12,
                  background: 'none',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {insight.cta}
                <Icon name="arrowRight" size={12} color="#6E4CE6" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>

        {/* Spending + LHDN mini cards */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: '1.4fr 1fr',
            gap: 10,
            marginTop: 14,
          }}
        >
          {/* Spending */}
          <div
            className="bg-surface shadow-card"
            style={{
              borderRadius: 18,
              padding: 14,
              border: '0.5px solid rgba(91,71,168,0.10)',
            }}
          >
            <div
              className="font-semibold uppercase text-muted"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              Spending
            </div>
            <div
              className="flex items-baseline"
              style={{ gap: 4, marginTop: 6, marginBottom: 10 }}
            >
              <span
                className="font-semibold text-muted"
                style={{ fontSize: 11 }}
              >
                RM
              </span>
              <span
                className="font-bold text-ink"
                style={{
                  fontSize: 22,
                  letterSpacing: -0.6,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                3,284
              </span>
            </div>
            <div
              className="flex"
              style={{ alignItems: 'flex-end', gap: 4, height: 36 }}
              aria-hidden
            >
              {spendingBars.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    borderRadius: 2,
                    background: i === spendingBars.length - 1 ? '#6E4CE6' : '#C9BAFB',
                    opacity: i === spendingBars.length - 1 ? 1 : 0.55,
                  }}
                />
              ))}
            </div>
            <div
              className="flex justify-between font-medium text-faint"
              style={{ marginTop: 6, fontSize: 9 }}
            >
              <span>Mon</span>
              <span>Thu</span>
              <span>Sun</span>
            </div>
          </div>
          {/* LHDN donut */}
          <div
            className="bg-surface shadow-card"
            style={{
              borderRadius: 18,
              padding: 14,
              border: '0.5px solid rgba(91,71,168,0.10)',
            }}
          >
            <div
              className="font-semibold uppercase text-muted"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              LHDN claim
            </div>
            <div
              className="relative"
              style={{ width: 76, height: 76, margin: '8px auto 4px' }}
            >
              <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
                <circle
                  cx="38"
                  cy="38"
                  r={R}
                  stroke="#EDE7FB"
                  strokeWidth="7"
                  fill="none"
                />
                <circle
                  cx="38"
                  cy="38"
                  r={R}
                  stroke="url(#lhdnGrad)"
                  strokeWidth="7"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={donutDash}
                  transform="rotate(-90 38 38)"
                />
                <defs>
                  <linearGradient id="lhdnGrad" x1="0" y1="0" x2="76" y2="76">
                    <stop offset="0" stopColor="#6E4CE6" />
                    <stop offset="1" stopColor="#C9BAFB" />
                  </linearGradient>
                </defs>
              </svg>
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <span
                  className="font-bold text-ink"
                  style={{ fontSize: 18, letterSpacing: -0.4 }}
                >
                  {lhdnPct}%
                </span>
                <span
                  className="font-semibold text-muted"
                  style={{ fontSize: 9 }}
                >
                  of RM {(lhdn.cap / 1000).toFixed(0)}k
                </span>
              </div>
            </div>
            <div
              className="text-center font-semibold text-ink2"
              style={{ fontSize: 11, letterSpacing: -0.1 }}
            >
              RM {formatRmShort(lhdnRemaining)} left
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: 18 }}
        >
          <span
            className="font-bold text-ink"
            style={{ fontSize: 17, letterSpacing: -0.3 }}
          >
            Recent
          </span>
          <Link
            to="/activity"
            className="text-purple font-semibold"
            style={{ fontSize: 12, textDecoration: 'none' }}
          >
            See all
          </Link>
        </div>
        <div
          className="bg-surface shadow-card overflow-hidden"
          style={{
            marginTop: 10,
            borderRadius: 20,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          {recent.map((t, i) => {
            const isIncome = t.amount >= 0;
            return (
              <div
                key={t.id}
                className="flex items-center"
                style={{
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom:
                    i < recent.length - 1
                      ? '0.5px solid rgba(91,71,168,0.07)'
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
                        className="bg-mistDeep font-bold"
                        style={{
                          fontSize: 9,
                          color: '#5837C9',
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
                    {t.category} · {t.date}
                  </div>
                </div>
                <div
                  className="font-bold"
                  style={{
                    fontSize: 14,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: -0.2,
                    color: isIncome ? '#1FB573' : '#1A1530',
                  }}
                >
                  {isIncome ? '+' : ''}
                  {formatRm(t.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
