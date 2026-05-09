/**
 * Advisor — AI financial advisor chat at /advisor.
 *
 * AI responses arrive as markdown (** bold **, • bullets, newlines).
 * renderMarkdown converts that into React nodes so text renders correctly.
 * The composer is fixed above the BottomNav, so the wrapper needs extra
 * paddingBottom to prevent chips from hiding behind the composer bar.
 */
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { CatIcon } from '@/components/CatIcon';
import { Sparkline } from '@/components/Sparkline';
import { useAdvisor } from '@/hooks/useAdvisor';
import { useAdvisorSend } from '@/hooks/useAdvisorSend';
import { advisorMock } from '@/mocks/seed';

const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

// ─── Markdown renderer ────────────────────────────────────────────────────────

/** Converts **bold** spans within a line into React nodes. */
function inlineBold(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} style={{ fontWeight: 700 }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Renders a markdown string (** bold **, • / - bullets, newlines) as React.
 * Supports the subset the AI advisor actually produces — no tables or headings.
 */
function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isBullet = /^[•\-*]\s/.test(line);
    if (isBullet) {
      // Collect consecutive bullet lines into a list.
      const items: string[] = [];
      while (i < lines.length && /^[•\-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[•\-*]\s/, ''));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: '4px 0 4px 0', paddingLeft: 16 }}>
          {items.map((item, j) => (
            <li key={j} style={{ marginBottom: 3, lineHeight: 1.45 }}>
              {inlineBold(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.trim() === '') {
      nodes.push(<div key={`sp-${i}`} style={{ height: 6 }} />);
    } else {
      nodes.push(
        <div key={`ln-${i}`} style={{ lineHeight: 1.45 }}>
          {inlineBold(line)}
        </div>,
      );
    }
    i++;
  }
  return <>{nodes}</>;
}

export default function Advisor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data = advisorMock } = useAdvisor();
  const { greeting, chart, messages, recs, suggestions } = data;
  const send = useAdvisorSend();
  const [draft, setDraft] = useState('');
  const autoFired = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const autoMessage = (location.state as { autoMessage?: string } | null)?.autoMessage ?? null;

  useEffect(() => {
    if (!autoMessage || autoFired.current) return;
    autoFired.current = true;
    send.mutate(autoMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMessage]);

  // Auto-scroll the thread to the bottom on mount, on every new message, and
  // while the assistant is typing — so the user always sees the latest turn
  // without having to scroll past the suggestion chips and recommendation list.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, send.isPending]);

  // Cap suggestion chips so the chip strip stays compact even after a long chat.
  const visibleSuggestions = suggestions.slice(0, 3);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    setDraft('');
    send.mutate(trimmed);
  };

  const onComposerSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(draft);
  };

  return (
    <div className="text-ink" style={{ paddingTop: 'calc(60px + env(safe-area-inset-top))', paddingBottom: 190 }}>
      {/* Header — fixed at top */}
      <div
        className="flex items-center bg-surface"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingTop: 'calc(env(safe-area-inset-top) + 4px)',
          paddingRight: 20,
          paddingBottom: 14,
          paddingLeft: 20,
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
              FinAdvisor
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
            }}
          >
            {renderMarkdown(greeting)}
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
                    }}
                  >
                    {renderMarkdown(m.text)}
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
                        onClick={() => submit(r.title)}
                        disabled={send.isPending}
                        className="flex items-center justify-center"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          background: '#F5F2FE',
                          border: 'none',
                          cursor: send.isPending ? 'not-allowed' : 'pointer',
                          opacity: send.isPending ? 0.6 : 1,
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
              }}
            >
              {renderMarkdown(m.text)}
            </div>
          );
        })}

        {/* Typing indicator while the assistant turn is in flight. */}
        {send.isPending && (
          <div
            aria-label="FinAdvisor is typing"
            role="status"
            className="bg-surface shadow-card text-muted font-medium"
            style={{
              alignSelf: 'flex-start',
              maxWidth: '60%',
              padding: '11px 14px',
              borderRadius: '16px 16px 16px 4px',
              border: '0.5px solid rgba(91,71,168,0.10)',
              fontSize: 13.5,
              lineHeight: 1.4,
            }}
          >
            FinAdvisor is thinking…
          </div>
        )}

        {/* Suggestion chips */}
        <div
          className="flex items-center"
          style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}
        >
          {visibleSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              disabled={send.isPending}
              className="font-semibold"
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                background: '#F5F2FE',
                color: '#5837C9',
                fontSize: 11.5,
                border: '0.5px solid rgba(91,71,168,0.10)',
                cursor: send.isPending ? 'not-allowed' : 'pointer',
                opacity: send.isPending ? 0.6 : 1,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Bottom sentinel — scrollIntoView target so the thread auto-pins
            to the latest message on mount and as the conversation grows. */}
        <div ref={bottomRef} aria-hidden style={{ height: 1 }} />
      </div>

      {/* Error banner — shows the last failed send. Manually dismissable so
          repeated failures don't pile up. */}
      {send.isError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 158,
            left: 16,
            right: 16,
            maxWidth: 392,
            margin: '0 auto',
            padding: '8px 12px',
            borderRadius: 12,
            background: '#FDECEE',
            border: '0.5px solid rgba(214,52,64,0.20)',
            color: '#9B1F2A',
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>
            {send.error instanceof Error ? send.error.message : 'Send failed'}
          </span>
          <button
            type="button"
            onClick={() => send.reset()}
            aria-label="Dismiss error"
            style={{
              background: 'none',
              border: 'none',
              color: '#9B1F2A',
              fontSize: 16,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={onComposerSubmit}
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
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask FinAdvisor…"
          aria-label="Message FinAdvisor"
          disabled={send.isPending}
          className="font-medium"
          style={{
            flex: 1,
            fontSize: 14,
            color: '#39314F',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: 0,
          }}
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={send.isPending || draft.trim().length === 0}
          className="flex items-center justify-center shadow-purpleGlow"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: GRAD_HERO,
            border: 'none',
            opacity: send.isPending || draft.trim().length === 0 ? 0.55 : 1,
            cursor:
              send.isPending || draft.trim().length === 0
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          <Icon name="arrowUp" size={16} color="#fff" strokeWidth={2.4} />
        </button>
      </form>
    </div>
  );
}
