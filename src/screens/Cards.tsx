/**
 * Cards — visual port of Finpersona-mobile-build/screens-3.jsx.
 *
 * Tab route at /sources. Stacked card carousel (primary card 200px, others
 * 88px peeks), quick-actions grid, move-money form (visual only — no
 * submit), and auto-deduct rules with toggle switches that flip on tap.
 */
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { CatIcon } from '@/components/CatIcon';
import { useCards } from '@/hooks/useCards';
import { cardsMock } from '@/mocks/seed';

const GRAD_GLOW =
  'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';
const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

export default function Cards() {
  const { data = cardsMock } = useCards();
  const { cards, move, rules } = data;
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(rules.map((r) => [r.id, r.defaultEnabled])),
  );

  const toggle = (id: string) =>
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '4px 20px 8px' }}>
        <div className="flex items-center justify-between">
          <h1
            className="text-ink"
            style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}
          >
            Accounts
          </h1>
          <button
            type="button"
            aria-label="Add account"
            className="flex items-center justify-center bg-surface shadow-card"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              border: '0.5px solid rgba(91,71,168,0.10)',
            }}
          >
            <Icon name="plus" size={18} color="#39314F" />
          </button>
        </div>
        <div
          className="font-medium text-muted"
          style={{ fontSize: 13, marginTop: 4 }}
        >
          {cards.length} cards · 3 currencies linked
        </div>
      </div>

      {/* Card stack */}
      <div style={{ padding: '0 20px' }}>
        {cards.map((c, i) => {
          const isPrimary = i === 0;
          return (
            <div
              key={c.id}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 22,
                padding: '20px 22px',
                height: isPrimary ? 200 : 88,
                marginBottom: isPrimary ? 14 : 12,
                background: c.gradient,
                color: '#fff',
                boxShadow: isPrimary
                  ? '0 18px 40px rgba(91,71,168,0.32)'
                  : '0 10px 24px rgba(60,40,140,0.14)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: GRAD_GLOW,
                  pointerEvents: 'none',
                }}
              />
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  right: -30,
                  top: -30,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
                }}
              />
              <div
                className="flex items-center justify-between"
                style={{ position: 'relative' }}
              >
                <div>
                  <div
                    className="font-semibold"
                    style={{
                      fontSize: 11,
                      opacity: 0.8,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.flag} {c.name}
                  </div>
                  <div
                    className="font-mono font-semibold"
                    style={{
                      fontSize: 13,
                      opacity: 0.65,
                      marginTop: 2,
                      letterSpacing: 0.4,
                    }}
                  >
                    •• {c.last4}
                  </div>
                </div>
                {isPrimary && (
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.18)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    PRIMARY
                  </div>
                )}
              </div>
              {isPrimary ? (
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.75,
                      fontWeight: 500,
                      letterSpacing: 0.3,
                      marginBottom: 4,
                    }}
                  >
                    Available balance
                  </div>
                  <div
                    className="flex items-baseline"
                    style={{ gap: 4 }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: 0.85,
                      }}
                    >
                      RM
                    </span>
                    <span
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        letterSpacing: -0.8,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {c.amount}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    right: 22,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    textAlign: 'right',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.7,
                      fontWeight: 500,
                      letterSpacing: 0.3,
                    }}
                  >
                    Balance
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: -0.3,
                    }}
                  >
                    {c.currency} {c.amount}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div
        style={{
          padding: '6px 20px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
        }}
      >
        {(
          [
            { id: 'move', icon: 'transfer' as const, label: 'Move' },
            { id: 'convert', icon: 'repeat' as const, label: 'Convert' },
            { id: 'freeze', icon: 'lock' as const, label: 'Freeze' },
            { id: 'settings', icon: 'settings' as const, label: 'Settings' },
          ]
        ).map((q) => (
          <button
            key={q.id}
            type="button"
            className="flex flex-col items-center bg-surface shadow-card"
            style={{
              gap: 6,
              borderRadius: 14,
              padding: '12px 8px',
              border: '0.5px solid rgba(91,71,168,0.10)',
            }}
          >
            <Icon name={q.icon} size={18} color="#6E4CE6" strokeWidth={2} />
            <span
              className="font-semibold text-ink2"
              style={{ fontSize: 11 }}
            >
              {q.label}
            </span>
          </button>
        ))}
      </div>

      {/* Move money */}
      <div style={{ padding: '20px 16px 0' }}>
        <div
          className="font-bold text-ink"
          style={{
            fontSize: 14,
            letterSpacing: -0.2,
            marginBottom: 10,
            padding: '0 4px',
          }}
        >
          Move money
        </div>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '0.5px solid rgba(91,71,168,0.08)',
            }}
          >
            <div
              className="font-semibold text-muted"
              style={{
                fontSize: 10,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              From
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center" style={{ gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 18,
                    borderRadius: 4,
                    background:
                      'linear-gradient(140deg, #5837C9, #8E73F0)',
                  }}
                />
                <div>
                  <div
                    className="font-semibold text-ink"
                    style={{ fontSize: 14, letterSpacing: -0.2 }}
                  >
                    {move.fromName}
                  </div>
                  <div
                    className="text-muted"
                    style={{ fontSize: 11 }}
                  >
                    •• {move.fromLast4} · {move.fromCurrency}
                  </div>
                </div>
              </div>
              <Icon name="chevronDown" size={14} color="#7A7392" />
            </div>
          </div>
          <div
            className="flex items-center justify-center"
            style={{ padding: '8px 16px' }}
          >
            <div
              className="flex items-center justify-center bg-surface shadow-card"
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: '#F1ECFB',
                border: '2px solid #FFFFFF',
              }}
            >
              <Icon
                name="arrowDown"
                size={16}
                color="#6E4CE6"
                strokeWidth={2.4}
              />
            </div>
          </div>
          <div
            style={{
              padding: '14px 16px',
              borderTop: '0.5px solid rgba(91,71,168,0.08)',
            }}
          >
            <div
              className="font-semibold text-muted"
              style={{
                fontSize: 10,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              To
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center" style={{ gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 18,
                    borderRadius: 4,
                    background:
                      'linear-gradient(140deg, #1FB573, #4DD7A0)',
                  }}
                />
                <div>
                  <div
                    className="font-semibold text-ink"
                    style={{ fontSize: 14, letterSpacing: -0.2 }}
                  >
                    {move.toName}
                  </div>
                  <div
                    className="text-muted"
                    style={{ fontSize: 11 }}
                  >
                    •• {move.toLast4} · {move.rateLabel}
                  </div>
                </div>
              </div>
              <Icon name="chevronDown" size={14} color="#7A7392" />
            </div>
          </div>
          <div
            className="flex items-center justify-between"
            style={{
              padding: '12px 16px 16px',
              background: '#F1ECFB',
              borderTop: '0.5px solid rgba(91,71,168,0.08)',
            }}
          >
            <div>
              <div
                className="font-semibold text-muted"
                style={{
                  fontSize: 10,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                Amount
              </div>
              <div
                className="flex items-baseline"
                style={{ gap: 4, marginTop: 2 }}
              >
                <span
                  className="font-semibold text-muted"
                  style={{ fontSize: 12 }}
                >
                  RM
                </span>
                <span
                  className="text-ink"
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: -0.5,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {move.amountMyr}
                </span>
                <span
                  className="text-muted"
                  style={{ fontSize: 12, marginLeft: 6 }}
                >
                  {move.convertedLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="text-white shadow-purpleGlow"
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                background: GRAD_HERO,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: -0.1,
              }}
            >
              Transfer
            </button>
          </div>
        </div>
      </div>

      {/* Auto-deduct rules */}
      <div style={{ padding: '20px 16px 0' }}>
        <div
          className="flex items-center justify-between"
          style={{ padding: '0 4px', marginBottom: 10 }}
        >
          <span
            className="font-bold text-ink"
            style={{ fontSize: 14, letterSpacing: -0.2 }}
          >
            Auto-deduct rules
          </span>
          <span
            className="font-semibold text-purple"
            style={{ fontSize: 12 }}
          >
            Edit
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
          {rules.map((r, i) => {
            const on = enabled[r.id] ?? false;
            return (
              <div
                key={r.id}
                className="flex items-center"
                style={{
                  gap: 12,
                  padding: '12px 14px',
                  borderBottom:
                    i < rules.length - 1
                      ? '0.5px solid rgba(91,71,168,0.08)'
                      : 'none',
                }}
              >
                <CatIcon name={r.icon} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="font-semibold text-ink"
                    style={{ fontSize: 13, letterSpacing: -0.1 }}
                  >
                    {r.category}
                  </div>
                  <div
                    className="text-muted"
                    style={{ fontSize: 11, marginTop: 1 }}
                  >
                    From {r.from}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${r.category} auto-deduct`}
                  onClick={() => toggle(r.id)}
                  style={{
                    width: 36,
                    height: 22,
                    borderRadius: 11,
                    background: on ? '#6E4CE6' : '#D5D2E0',
                    position: 'relative',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: on ? 16 : 2,
                      top: 2,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.15s',
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
