/**
 * Capture — visual port of Finpersona-mobile-build/screens-5.jsx.
 *
 * Pushed route at /capture (linked from BottomNav FAB; hideNav so the bottom
 * sheet can claim full bottom of viewport). Dark camera-style background,
 * AI PARSED chip in the top bar, receipt thumbnail, and a bottom sheet with
 * parsed fields + LHDN claimable toggle + points-earned banner. No real
 * OCR — values come from captureMock; the LHDN toggle uses local useState
 * so the switch animates without backend writes.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { captureMock } from '@/mocks/seed';

const GRAD_BACKDROP =
  'radial-gradient(120% 80% at 50% -10%, #2A1854 0%, #0A0418 60%)';
const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';
const GRAD_GLOW =
  'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';
const GRAD_LHDN =
  'linear-gradient(135deg, #F5F2FE, #EDE7FB)';

export default function Capture() {
  const navigate = useNavigate();
  const {
    merchant,
    merchantAddress,
    totalRm,
    receiptLines,
    insightTitle,
    insightSubtitle,
    fields,
    lhdn,
    points,
  } = captureMock;
  const [lhdnOn, setLhdnOn] = useState(lhdn.eligible);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0A0418',
        color: '#fff',
      }}
    >
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: GRAD_BACKDROP }}
      />

      {/* Top bar */}
      <div
        className="flex items-center justify-between"
        style={{
          position: 'relative',
          padding: '8px 20px 0',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          aria-label="Close capture"
          onClick={() => navigate('/')}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            border: 'none',
            color: '#fff',
          }}
        >
          <Icon name="close" size={18} color="#fff" />
        </button>
        <div
          className="flex items-center font-bold"
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            fontSize: 11,
            color: '#fff',
            letterSpacing: 0.4,
            gap: 6,
          }}
        >
          <Icon name="sparkle" size={12} color="#C9BAFB" strokeWidth={2.4} />
          AI PARSED
        </div>
        <button
          type="button"
          aria-label="Toggle flash"
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            border: 'none',
            color: '#fff',
          }}
        >
          <Icon name="flash" size={16} color="#fff" />
        </button>
      </div>

      {/* Receipt thumbnail */}
      <div
        style={{
          position: 'relative',
          marginTop: 32,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: 132,
            height: 168,
            borderRadius: 14,
            background: '#fff',
            boxShadow:
              '0 20px 50px rgba(110,76,230,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            overflow: 'hidden',
            padding: 12,
            color: '#1A1530',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            {merchant}
          </div>
          <div style={{ fontSize: 6, color: '#7E7491', marginTop: 2 }}>
            {merchantAddress}
          </div>
          <div
            style={{
              marginTop: 8,
              height: 1,
              background: 'rgba(91,71,168,0.10)',
            }}
          />
          {Array.from({ length: receiptLines }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
              style={{ marginTop: 6 }}
            >
              <div
                style={{
                  width: '50%',
                  height: 4,
                  background: '#EEE',
                  borderRadius: 1,
                }}
              />
              <div
                style={{
                  width: '20%',
                  height: 4,
                  background: '#EEE',
                  borderRadius: 1,
                }}
              />
            </div>
          ))}
          <div
            style={{
              marginTop: 8,
              height: 0.5,
              background: 'rgba(91,71,168,0.10)',
            }}
          />
          <div
            className="flex items-center justify-between"
            style={{
              marginTop: 6,
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            <span>TOTAL</span>
            <span>RM {totalRm.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      <div
        style={{
          position: 'relative',
          marginTop: 28,
          background: '#fff',
          borderRadius: '28px 28px 0 0',
          padding: '20px 20px 40px',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.3)',
          color: '#1A1530',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 36,
            height: 4,
            background: '#E5E0F0',
            borderRadius: 2,
            margin: '0 auto 16px',
          }}
        />

        <div
          className="flex items-center"
          style={{ gap: 10, marginBottom: 16 }}
        >
          <div
            className="flex items-center justify-center shadow-purpleGlow"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: GRAD_HERO,
            }}
          >
            <Icon name="sparkle" size={16} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              className="font-bold text-ink"
              style={{ fontSize: 16, letterSpacing: -0.3 }}
            >
              {insightTitle}
            </h2>
            <div
              className="text-muted"
              style={{ fontSize: 11, marginTop: 1 }}
            >
              {insightSubtitle}
            </div>
          </div>
        </div>

        {/* Parsed fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fields.map((f) => (
            <div
              key={f.label}
              className="flex items-center justify-between"
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: '#F5F2FE',
                border: '0.5px solid rgba(91,71,168,0.10)',
              }}
            >
              <div>
                <div
                  className="text-muted font-semibold"
                  style={{
                    fontSize: 10,
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  {f.label}
                </div>
                <div
                  className="font-semibold text-ink"
                  style={{ fontSize: 14, marginTop: 2, letterSpacing: -0.2 }}
                >
                  {f.value}
                </div>
              </div>
              {f.confident ? (
                <div
                  aria-label={`${f.label} confirmed`}
                  className="flex items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: '#D6F5E5',
                  }}
                >
                  <Icon name="check" size={14} color="#1FB573" strokeWidth={2.6} />
                </div>
              ) : (
                <button
                  type="button"
                  className="font-semibold text-purple"
                  style={{
                    fontSize: 11,
                    background: 'none',
                    border: 'none',
                  }}
                >
                  Tap to set
                </button>
              )}
            </div>
          ))}
        </div>

        {/* LHDN tag */}
        <div
          className="flex items-center"
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 12,
            background: GRAD_LHDN,
            border: '1px solid rgba(91,71,168,0.10)',
            gap: 10,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#fff',
            }}
          >
            <Icon name="receipt" size={16} color="#5837C9" strokeWidth={2} />
          </div>
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
              Tag under <strong>{lhdn.category}</strong> · RM {lhdn.capLeft} left in cap
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={lhdnOn}
            aria-label="Tag as LHDN claimable"
            onClick={() => setLhdnOn((v) => !v)}
            style={{
              width: 36,
              height: 22,
              borderRadius: 11,
              background: lhdnOn ? '#6E4CE6' : '#D8D2E8',
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
                left: lhdnOn ? 16 : 2,
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

        {/* Points earned */}
        <div
          className="flex items-center text-white shadow-purpleGlow"
          style={{
            marginTop: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: GRAD_HERO,
            gap: 10,
            position: 'relative',
            overflow: 'hidden',
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
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.22)',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <Icon name="star" size={16} color="#fff" strokeWidth={2.4} />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div
              className="font-bold"
              style={{
                fontSize: 11,
                opacity: 0.9,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              You'll earn
            </div>
            <div
              className="font-bold"
              style={{ fontSize: 14, marginTop: 1, letterSpacing: -0.2 }}
            >
              +{points.total} points{' '}
              <span style={{ opacity: 0.75, fontWeight: 600, fontSize: 11 }}>
                · {points.base} base × {points.bonusMultiplier} {points.bonusReason}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex items-center"
          style={{ gap: 10, marginTop: 18 }}
        >
          <button
            type="button"
            className="font-semibold"
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: 14,
              background: '#F5F2FE',
              color: '#39314F',
              fontSize: 14,
              border: 'none',
              letterSpacing: -0.1,
            }}
          >
            Edit details
          </button>
          <button
            type="button"
            className="font-bold text-white shadow-purpleGlow"
            style={{
              flex: 1.4,
              padding: '14px 0',
              borderRadius: 14,
              background: GRAD_HERO,
              fontSize: 14,
              border: 'none',
              letterSpacing: -0.1,
            }}
          >
            Save expense
          </button>
        </div>
      </div>
    </div>
  );
}
