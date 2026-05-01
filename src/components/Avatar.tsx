/**
 * Initials avatar with optional gradient ring. Ported from
 * Finpersona-mobile-build/shell.jsx. Used by Home header today and by
 * profile / settings / advisor surfaces in later Phase 2 tasks.
 */
const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

type Props = {
  initials?: string;
  size?: number;
  ring?: boolean;
};

export function Avatar({ initials = 'AY', size = 36, ring = false }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {ring && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: '50%',
            background: GRAD_HERO,
            padding: 2,
          }}
        />
      )}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#E8DFFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: size * 0.36,
          color: '#5837C9',
          position: 'relative',
          border: ring ? '2px solid #fff' : 'none',
          boxSizing: 'border-box',
        }}
      >
        {initials}
      </div>
    </div>
  );
}
