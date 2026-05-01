/**
 * Stroke-based inline icon set, ported from
 * Finpersona-mobile-build/tokens.jsx. Add icons here as screens need them
 * rather than pulling in a full icon library.
 */
import type { ReactElement } from 'react';

export type IconName =
  | 'arrowLeft'
  | 'arrowRight'
  | 'arrowUp'
  | 'arrowDown'
  | 'chevronDown'
  | 'chevronRight'
  | 'sparkle'
  | 'receipt'
  | 'lock'
  | 'user'
  | 'shield'
  | 'home'
  | 'chart'
  | 'camera'
  | 'cards'
  | 'bot'
  | 'plus'
  | 'bell'
  | 'eye'
  | 'star'
  | 'transfer'
  | 'food'
  | 'book'
  | 'medical'
  | 'coffee'
  | 'bag'
  | 'car'
  | 'home2'
  | 'gift'
  | 'bank'
  | 'filter'
  | 'download'
  | 'search';

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
    arrowUp: (
      <g {...stroke}>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </g>
    ),
    arrowDown: (
      <g {...stroke}>
        <path d="M12 5v14M5 12l7 7 7-7" />
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
    home: (
      <path
        {...stroke}
        d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z"
      />
    ),
    chart: (
      <g {...stroke}>
        <path d="M4 20V10M10 20V4M16 20V14M22 20H2" />
      </g>
    ),
    camera: (
      <g {...stroke}>
        <path d="M4 8h3l2-2h6l2 2h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
        <circle cx="12" cy="13" r="3.5" />
      </g>
    ),
    cards: (
      <g {...stroke}>
        <rect x="2" y="6" width="20" height="13" rx="2.5" />
        <path d="M2 10h20M6 15h3" />
      </g>
    ),
    bot: (
      <g {...stroke}>
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 4v3M9 13h.01M15 13h.01M9 17h6" />
      </g>
    ),
    plus: (
      <g {...stroke}>
        <path d="M12 5v14M5 12h14" />
      </g>
    ),
    bell: (
      <g {...stroke}>
        <path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8z" />
        <path d="M10 21a2 2 0 004 0" />
      </g>
    ),
    eye: (
      <g {...stroke}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </g>
    ),
    star: (
      <path
        {...stroke}
        d="M12 2l3 7 7 .5-5 5 1.5 7L12 18l-6.5 3.5L7 14.5 2 9.5 9 9z"
      />
    ),
    transfer: (
      <g {...stroke}>
        <path d="M7 4l-4 4 4 4M3 8h18M17 12l4 4-4 4M21 16H3" />
      </g>
    ),
    food: (
      <g {...stroke}>
        <path d="M3 11h18l-2 9H5l-2-9z" />
        <path d="M3 11l1-3h16l1 3" />
      </g>
    ),
    book: (
      <g {...stroke}>
        <path d="M4 4h7v16H6a2 2 0 01-2-2V4zM20 4h-7v16h5a2 2 0 002-2V4z" />
      </g>
    ),
    medical: (
      <g {...stroke}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M12 9v6M9 12h6M9 5V3h6v2" />
      </g>
    ),
    coffee: (
      <g {...stroke}>
        <path d="M3 8h13v6a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
        <path d="M16 10h2a3 3 0 010 6h-2M7 2v3M11 2v3M15 2v3" />
      </g>
    ),
    bag: (
      <g {...stroke}>
        <path d="M5 8h14l-1 13H6L5 8z" />
        <path d="M9 8V5a3 3 0 016 0v3" />
      </g>
    ),
    car: (
      <g {...stroke}>
        <path d="M5 17h14l-1.5-7H6.5L5 17z" />
        <circle cx="8" cy="17" r="2" />
        <circle cx="16" cy="17" r="2" />
      </g>
    ),
    home2: (
      <g {...stroke}>
        <path d="M3 12l9-8 9 8v8a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-8z" />
      </g>
    ),
    gift: (
      <g {...stroke}>
        <rect x="3" y="9" width="18" height="11" rx="1" />
        <path d="M3 13h18M12 9v11M12 9c-1.5-3-5-3-5-1s2 1 5 1zM12 9c1.5-3 5-3 5-1s-2 1-5 1z" />
      </g>
    ),
    bank: (
      <g {...stroke}>
        <path d="M3 10l9-6 9 6v2H3zM5 12v6M9 12v6M15 12v6M19 12v6M3 19h18" />
      </g>
    ),
    filter: (
      <g {...stroke}>
        <path d="M3 5h18M6 12h12M10 19h4" />
      </g>
    ),
    download: (
      <g {...stroke}>
        <path d="M12 4v12M6 12l6 6 6-6M4 20h16" />
      </g>
    ),
    search: (
      <g {...stroke}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
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
