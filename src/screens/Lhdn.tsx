/**
 * Lhdn — visual port of Finpersona-mobile-build/screens-4.jsx.
 *
 * Pushed route at /lhdn (linked from Home's quick action). Hero claimable
 * card with DonutRing showing % of cap used + AI insight banner, then
 * tax-relief categories with progress bars, then recently tagged
 * transactions. Disclaimer footer.
 */
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@/components/Icon';
import { CatIcon } from '@/components/CatIcon';
import { DonutRing } from '@/components/DonutRing';
import { useLhdn } from '@/hooks/useLhdn';
import { lhdnMock } from '@/mocks/seed';

const GRAD_CARD =
  'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)';
const GRAD_GLOW =
  'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';

export default function Lhdn() {
  const { data = lhdnMock } = useLhdn();
  const { taxYear, insightCopy, insightHighlightRm, categories, recent } = data;
  const total = categories.reduce((s, c) => s + c.used, 0);
  const cap = categories.reduce((s, c) => s + c.cap, 0);
  const pct = cap > 0 ? Math.round((total / cap) * 100) : 0;

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
              style={{
                fontSize: 11,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              {taxYear} · LHDN
            </div>
            <h1
              className="text-ink"
              style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}
            >
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
              right: -50,
              top: -50,
              width: 180,
              height: 180,
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
                  opacity: 0.85,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                Total claimable
              </div>
              <div
                className="flex items-baseline"
                style={{ gap: 4, marginTop: 4 }}
              >
                <span
                  style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}
                >
                  RM
                </span>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: -1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {total.toLocaleString('en-MY')}
                </span>
              </div>
              <div
                style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}
              >
                of RM {cap.toLocaleString('en-MY')} cap
              </div>
            </div>
            <DonutRing pct={pct} size={88} strokeWidth={6}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: -0.4,
                  color: '#fff',
                }}
              >
                {pct}%
              </span>
            </DonutRing>
          </div>
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
            <div
              style={{
                flex: 1,
                fontSize: 11.5,
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {insightCopy}{' '}
              <strong style={{ fontWeight: 700 }}>
                RM {insightHighlightRm.toLocaleString('en-MY')}
              </strong>
              .
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
          <span
            className="font-bold text-ink"
            style={{ fontSize: 14, letterSpacing: -0.2 }}
          >
            Reliefs by category
          </span>
          <button
            type="button"
            className="font-semibold text-purple"
            style={{ fontSize: 12, background: 'none', border: 'none' }}
          >
            Add receipt
          </button>
        </div>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          {categories.map((c, i) => {
            const ratio = c.used / c.cap;
            return (
              <div
                key={c.id}
                style={{
                  padding: '14px 16px',
                  borderBottom:
                    i < categories.length - 1
                      ? '0.5px solid rgba(91,71,168,0.08)'
                      : 'none',
                }}
              >
                <div
                  className="flex items-center"
                  style={{ gap: 12, marginBottom: 8 }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${c.color}15`,
                    }}
                  >
                    <Icon
                      name={c.icon as IconName}
                      size={18}
                      color={c.color}
                      strokeWidth={2}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="font-semibold text-ink"
                      style={{ fontSize: 13.5, letterSpacing: -0.1 }}
                    >
                      {c.name}
                    </div>
                    <div
                      className="text-muted"
                      style={{ fontSize: 11, marginTop: 1 }}
                    >
                      {c.items} receipts
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      className="font-bold text-ink"
                      style={{
                        fontSize: 13,
                        letterSpacing: -0.2,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      RM {c.used.toLocaleString('en-MY')}
                    </div>
                    <div
                      className="text-muted"
                      style={{
                        fontSize: 10,
                        fontVariantNumeric: 'tabular-nums',
                        marginTop: 1,
                      }}
                    >
                      / {c.cap.toLocaleString('en-MY')}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    height: 5,
                    background: '#E8DFFB',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${ratio * 100}%`,
                      height: '100%',
                      background: c.color,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recently tagged */}
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
          Recently tagged
        </div>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          {recent.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center"
              style={{
                gap: 12,
                padding: '13px 14px',
                borderBottom:
                  i < recent.length - 1
                    ? '0.5px solid rgba(91,71,168,0.08)'
                    : 'none',
              }}
            >
              <CatIcon name={t.icon} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="font-semibold text-ink"
                  style={{ fontSize: 13.5, letterSpacing: -0.2 }}
                >
                  {t.name}
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
                  fontSize: 13,
                  color: '#5837C9',
                  letterSpacing: -0.1,
                  background: '#E8DFFB',
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                RM {t.amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        className="text-muted"
        style={{ padding: '16px 20px 0', fontSize: 11, lineHeight: 1.5 }}
      >
        Estimates only · final relief is determined when filing Borang BE
        with LHDN.
      </p>
    </div>
  );
}
