/**
 * Advisor — visual port of Finpersona-mobile-build/screens-6.jsx.
 *
 * AI financial advisor chat. Header with persona avatar (online dot),
 * scripted message thread (text bubbles, embedded sparkline chart bubble,
 * recommendations card list), suggestion chips, and a non-functional
 * composer field. No real LLM yet — messages come from advisorMock.
 *
 * Route /advisor (BottomNav 'Advisor' tab).
 */
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { CatIcon } from '@/components/CatIcon';
import { Sparkline } from '@/components/Sparkline';
import { advisorMock } from '@/mocks/seed';

const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

export default function Advisor() {
  const navigate = useNavigate();
  const { greeting, chart, messages, recs, suggestions } = advisorMock;

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div
        className="flex items-center"
        style={{
          padding: '4px 20px 14px',
          gap: 12,
          borderBottom: '0.5px solid rgba(91,71,168,0.10)',
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate('/')}
          className="flex items-center justify-center bg-surface shadow-card"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          <Icon name="arrowLeft" size={18} color="#39314F" />
        </button>
        <div className="flex items-center" style={{ flex: 1, gap: 10 }}>
          <div
            className="flex items-center justify-center shadow-purpleGlow"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: GRAD_HERO,
              position: 'relative',
            }}
          >
            <Icon name="sparkle" size={18} color="#fff" strokeWidth={2.2} />
            <span
              aria-label="online"
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 12,
                height: 12,
                borderRadius: 6,
                background: '#1FB573',
                border: '2px solid #fff',
              }}
            />
          </div>
          <div>
            <h1
              className="font-bold text-ink"
              style={{ fontSize: 15, letterSpacing: -0.2 }}
            >
              Finpersona
            </h1>
            <div className="text-muted" style={{ fontSize: 11 }}>
              Your financial analyst · online
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="More options"
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            color: '#7E7491',
          }}
        >
          <Icon name="moreV" size={18} color="#7E7491" />
        </button>
      </div>

      {/* Thread */}
      <div
        style={{
          padding: '16px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Greeting bubble */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
          <div
            className="flex items-center text-muted font-semibold"
            style={{
              gap: 6,
              marginBottom: 4,
              fontSize: 10,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            <span>FINPERSONA</span>
          </div>
          <div
            className="bg-surface shadow-card text-ink font-medium"
            style={{
              padding: '12px 14px',
              borderRadius: '4px 16px 16px 16px',
              border: '0.5px solid rgba(91,71,168,0.10)',
              fontSize: 13.5,
              lineHeight: 1.4,
            }}
          >
            {greeting}
          </div>
        </div>

        {messages.map((m, i) => {
          if (m.kind === 'chart') {
            return (
              <div
                key={`chart-${i}`}
                style={{ alignSelf: 'flex-start', maxWidth: '88%' }}
              >
                <div
                  className="bg-surface shadow-card"
                  style={{
                    padding: 14,
                    borderRadius: '4px 18px 18px 18px',
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
                    {chart.label}
                  </div>
                  <div
                    className="flex items-baseline"
                    style={{ gap: 4, marginTop: 4 }}
                  >
                    <span
                      className="font-bold text-ink"
                      style={{
                        fontSize: 20,
                        letterSpacing: -0.4,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      RM {chart.valueRm.toLocaleString('en-MY')}
                    </span>
                    <span
                      className="font-bold"
                      style={{ fontSize: 11, color: '#D63440' }}
                    >
                      +{chart.deltaPct}%
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Sparkline
                      points={chart.points}
                      width={240}
                      height={60}
                      stroke="#6E4CE6"
                      gradientId="advisor-spark"
                    />
                  </div>
                  <div
                    className="flex items-center justify-between font-medium"
                    style={{ fontSize: 9, color: '#A89DC1', marginTop: 4 }}
                  >
                    {chart.axis.map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          if (m.kind === 'recs') {
            return (
              <Fragment key={`recs-${i}`}>
                <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                  <div
                    className="bg-surface shadow-card text-ink font-medium"
                    style={{
                      padding: '12px 14px',
                      borderRadius: '4px 16px 16px 16px',
                      border: '0.5px solid rgba(91,71,168,0.10)',
                      fontSize: 13.5,
                      lineHeight: 1.4,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
                <div
                  style={{
                    alignSelf: 'flex-start',
                    width: '92%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {recs.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center bg-surface shadow-card"
                      style={{
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: '0.5px solid rgba(91,71,168,0.10)',
                      }}
                    >
                      <CatIcon name={r.icon} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="font-semibold text-ink"
                          style={{ fontSize: 13, letterSpacing: -0.1 }}
                        >
                          {r.title}
                        </div>
                        <div
                          className="text-muted"
                          style={{ fontSize: 11, marginTop: 1 }}
                        >
                          {r.subtitle}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Add ${r.title}`}
                        className="flex items-center justify-center"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          background: '#F5F2FE',
                          border: 'none',
                        }}
                      >
                        <Icon name="plus" size={14} color="#6E4CE6" strokeWidth={2.4} />
                      </button>
                    </div>
                  ))}
                </div>
              </Fragment>
            );
          }
          if (m.from === 'user') {
            return (
              <div
                key={`u-${i}`}
                className="text-white shadow-purpleGlow font-medium"
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '78%',
                  padding: '11px 14px',
                  borderRadius: '16px 16px 4px 16px',
                  background: GRAD_HERO,
                  fontSize: 13.5,
                  lineHeight: 1.4,
                  letterSpacing: -0.1,
                }}
              >
                {m.text}
              </div>
            );
          }
          return (
            <div
              key={`a-${i}`}
              className="bg-surface shadow-card text-ink font-medium"
              style={{
                alignSelf: 'flex-start',
                maxWidth: '85%',
                padding: '12px 14px',
                borderRadius: '16px 16px 16px 4px',
                border: '0.5px solid rgba(91,71,168,0.10)',
                fontSize: 13.5,
                lineHeight: 1.4,
              }}
            >
              {m.text}
            </div>
          );
        })}

        {/* Suggestion chips */}
        <div
          className="flex items-center"
          style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="font-semibold"
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                background: '#F5F2FE',
                color: '#5837C9',
                fontSize: 11.5,
                border: '0.5px solid rgba(91,71,168,0.10)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div
        className="flex items-center bg-surface shadow-card"
        style={{
          position: 'fixed',
          bottom: 110,
          left: 16,
          right: 16,
          padding: '8px 8px 8px 16px',
          borderRadius: 24,
          border: '0.5px solid rgba(91,71,168,0.10)',
          gap: 8,
          maxWidth: 392,
          margin: '0 auto',
        }}
      >
        <span
          className="text-muted font-medium"
          style={{ flex: 1, fontSize: 14, color: '#A89DC1' }}
        >
          Ask Finpersona…
        </span>
        <button
          type="button"
          aria-label="Send message"
          className="flex items-center justify-center shadow-purpleGlow"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: GRAD_HERO,
            border: 'none',
          }}
        >
          <Icon name="arrowUp" size={16} color="#fff" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
