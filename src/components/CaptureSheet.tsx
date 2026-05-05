import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

/**
 * Bottom sheet shown when the user taps the BottomNav `+` FAB. Offers two
 * choices: scan a receipt with the camera (→ /capture) or add an expense
 * manually (→ /capture/manual). Backdrop click and Escape both close it.
 *
 * Hand-rolled (no Radix dep). Fixed-position overlay; not portaled — the
 * AppShell that hosts BottomNav already covers the viewport.
 *
 * The sheet is *always mounted* so it can animate up from the bottom on open
 * (transform translateY(100%) → translateY(0)). When closed we toggle
 * aria-hidden + pointerEvents off so it neither traps focus, blocks taps,
 * nor announces itself to assistive tech.
 */

const PURPLE = '#6E4CE6';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CaptureSheet({ open, onClose }: Props) {
  const navigate = useNavigate();

  // Escape-to-close. Only attach the listener while the sheet is visible to
  // avoid stealing Escape when the sheet isn't on screen.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <>
      <div
        data-testid="capture-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,16,40,0.42)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 200,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 220ms ease-out',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add receipt"
        aria-hidden={open ? 'false' : 'true'}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          background: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '20px 20px calc(28px + env(safe-area-inset-bottom)) 20px',
          boxShadow: '0 -10px 40px rgba(60,40,140,0.18)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 220ms ease-out',
          pointerEvents: open ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: 'rgba(60,40,140,0.18)',
            margin: '0 auto 12px',
          }}
          aria-hidden="true"
        />
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#1A1530',
          }}
        >
          Add receipt
        </h2>
        <button
          type="button"
          onClick={() => go('/capture')}
          tabIndex={open ? 0 : -1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 16,
            border: 'none',
            background: PURPLE,
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Icon name="camera" size={20} color="#fff" strokeWidth={2} />
          Scan receipt
        </button>
        <button
          type="button"
          onClick={() => go('/capture/manual')}
          tabIndex={open ? 0 : -1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 16,
            border: '1px solid rgba(91,71,168,0.18)',
            background: 'rgba(110,76,230,0.06)',
            color: '#1A1530',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Icon name="plus" size={20} color={PURPLE} strokeWidth={2} />
          Add manually
        </button>
      </div>
    </>
  );
}
