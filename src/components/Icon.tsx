/**
 * Stroke-based inline icon set, ported from
 * Finpersona-mobile-build/tokens.jsx. Add icons here as screens need them
 * rather than pulling in a full icon library.
 */
import type { ReactElement } from 'react';

export type IconName =
  | 'arrowLeft'
  | 'arrowRight'
  | 'chevronDown'
  | 'chevronRight'
  | 'sparkle'
  | 'receipt'
  | 'lock'
  | 'user'
  | 'shield';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};

export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.8,
  className,
}: Props) {
  const stroke = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const paths: Record<IconName, ReactElement> = {
    arrowLeft: (
      <g {...stroke}>
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </g>
    ),
    arrowRight: (
      <g {...stroke}>
        <path d="M5 12h14M12 5l7 7-7 7" />
      </g>
    ),
    chevronDown: <path {...stroke} d="M6 9l6 6 6-6" />,
    chevronRight: <path {...stroke} d="M9 6l6 6-6 6" />,
    sparkle: (
      <g {...stroke}>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
      </g>
    ),
    receipt: (
      <g {...stroke}>
        <path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </g>
    ),
    lock: (
      <g {...stroke}>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 018 0v4" />
      </g>
    ),
    user: (
      <g {...stroke}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
      </g>
    ),
    shield: (
      <g {...stroke}>
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </g>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
