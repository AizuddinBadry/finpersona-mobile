/**
 * Finpersona design tokens — ported from
 * aexlora/Finpersona-mobile-build/tokens.jsx (the JSX mockup source of truth).
 * Keep colors / gradients / radii / shadows in sync with that file.
 */
export const tokens = {
  color: {
    white: '#FFFFFF',
    bg: '#FAF8FF',
    surface: '#FFFFFF',
    mist: '#F5F2FE',
    mistDeep: '#EDE7FB',
    hairline: 'rgba(91, 71, 168, 0.10)',
    divider: 'rgba(91, 71, 168, 0.07)',
    ink: '#1A1530',
    ink2: '#3A3458',
    muted: '#7A7392',
    faint: '#A8A2BD',
    purple: '#6E4CE6',
    purpleDeep: '#5837C9',
    purpleSoft: '#8E73F0',
    purpleLight: '#B8A6F5',
    lavender: '#C9BAFB',
    green: '#1FB573',
    greenSoft: '#E5F6EE',
    red: '#E5484D',
    redSoft: '#FCE9EA',
    amber: '#E89B2A',
    amberSoft: '#FBEFD6',
  },
  gradient: {
    hero: 'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)',
    card: 'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)',
    mist: 'linear-gradient(180deg, #F5F2FE 0%, #FAF8FF 100%)',
    glow: 'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)',
  },
  font: {
    sans: '-apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
    mono: '"SF Mono", ui-monospace, "JetBrains Mono", monospace',
  },
  radius: { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, pill: 9999 },
  shadow: {
    card: '0 1px 2px rgba(40,20,90,0.04), 0 8px 24px rgba(60,40,140,0.06)',
    raised: '0 4px 12px rgba(60,40,140,0.10), 0 24px 48px rgba(60,40,140,0.10)',
    purple: '0 12px 32px rgba(110,76,230,0.32), 0 4px 12px rgba(110,76,230,0.20)',
    glass: '0 8px 24px rgba(60,40,140,0.10), 0 2px 6px rgba(60,40,140,0.06)',
    fab: '0 8px 24px rgba(110,76,230,0.45), 0 2px 6px rgba(60,40,140,0.18)',
  },
} as const;

export type Tokens = typeof tokens;
