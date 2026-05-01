/**
 * DonutRing — pure SVG circular progress. Used for LHDN cap usage and
 * Rewards tier progress. Renders a track + foreground stroke; children
 * slot into the centre for percentage labels or icons.
 */
import type { ReactNode } from 'react';

type Props = {
  pct: number; // 0..100
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  fillColor?: string;
  children?: ReactNode;
};

export function DonutRing({
  pct,
  size = 88,
  strokeWidth = 6,
  trackColor = 'rgba(255,255,255,0.18)',
  fillColor = '#ffffff',
  children,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = `${(c * Math.max(0, Math.min(100, pct))) / 100} ${c}`;
  const center = size / 2;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={dash}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      {children !== undefined && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
