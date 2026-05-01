import { Link, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

/**
 * Glassmorphic bottom nav with raised center FAB. Ported from
 * Finpersona-mobile-build/shell.jsx. Active tab is determined by exact
 * pathname match against item.to (so `/` only matches Home).
 */
const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';
const GRAD_GLOW =
  'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%)';

type Item = {
  id: string;
  icon: IconName;
  label: string;
  to: string;
  fab?: boolean;
};

const ITEMS: Item[] = [
  { id: 'home', icon: 'home', label: 'Home', to: '/' },
  { id: 'chart', icon: 'chart', label: 'Insights', to: '/insights' },
  { id: 'fab', icon: 'camera', label: 'Capture', to: '/capture', fab: true },
  { id: 'cards', icon: 'cards', label: 'Cards', to: '/cards' },
  { id: 'bot', icon: 'bot', label: 'Advisor', to: '/advisor' },
];

const PURPLE = '#6E4CE6';
const MUTED = '#6B6584';

export default function BottomNav({ dark = false }: { dark?: boolean }) {
  const { pathname } = useLocation();
  const ic = dark ? 'rgba(255,255,255,0.65)' : MUTED;
  const acc = dark ? '#fff' : PURPLE;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 18,
        left: 16,
        right: 16,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: 72,
          borderRadius: 36,
          background: dark ? 'rgba(26,21,48,0.55)' : 'rgba(255,255,255,0.62)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          boxShadow: dark
            ? '0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
            : '0 12px 32px rgba(60,40,140,0.14), 0 2px 6px rgba(60,40,140,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
          border: dark
            ? '0.5px solid rgba(255,255,255,0.10)'
            : '0.5px solid rgba(91,71,168,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 8px',
          pointerEvents: 'auto',
        }}
      >
        {ITEMS.map((it) => {
          if (it.fab) {
            return (
              <Link
                key={it.id}
                to={it.to}
                aria-label={it.label}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  marginTop: -28,
                  position: 'relative',
                  background: GRAD_HERO,
                  boxShadow:
                    '0 14px 28px rgba(110,76,230,0.42), 0 4px 10px rgba(110,76,230,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid rgba(255,255,255,0.92)',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 3,
                    borderRadius: 30,
                    background: GRAD_GLOW,
                    pointerEvents: 'none',
                  }}
                />
                <Icon name="plus" size={28} color="#fff" strokeWidth={2.4} />
                <span
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                    clip: 'rect(0 0 0 0)',
                  }}
                >
                  {it.label}
                </span>
              </Link>
            );
          }
          const isActive = pathname === it.to;
          return (
            <Link
              key={it.id}
              to={it.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                minWidth: 56,
                padding: '8px 0',
                color: isActive ? acc : ic,
                textDecoration: 'none',
              }}
            >
              <Icon
                name={it.icon}
                size={22}
                color={isActive ? acc : ic}
                strokeWidth={isActive ? 2 : 1.7}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: -0.1,
                }}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
