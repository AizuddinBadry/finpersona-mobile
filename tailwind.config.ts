import type { Config } from 'tailwindcss';
import { tokens } from './src/styles/tokens';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: tokens.color.bg,
        surface: tokens.color.surface,
        mist: tokens.color.mist,
        mistDeep: tokens.color.mistDeep,
        ink: tokens.color.ink,
        ink2: tokens.color.ink2,
        muted: tokens.color.muted,
        faint: tokens.color.faint,
        purple: {
          DEFAULT: tokens.color.purple,
          deep: tokens.color.purpleDeep,
          soft: tokens.color.purpleSoft,
          light: tokens.color.purpleLight,
        },
        lavender: tokens.color.lavender,
        success: tokens.color.green,
        successSoft: tokens.color.greenSoft,
        danger: tokens.color.red,
        dangerSoft: tokens.color.redSoft,
        warning: tokens.color.amber,
        warningSoft: tokens.color.amberSoft,
      },
      borderRadius: {
        xs: `${tokens.radius.xs}px`,
        sm: `${tokens.radius.sm}px`,
        md: `${tokens.radius.md}px`,
        lg: `${tokens.radius.lg}px`,
        xl: `${tokens.radius.xl}px`,
      },
      backgroundImage: {
        'grad-hero': tokens.gradient.hero,
        'grad-card': tokens.gradient.card,
        'grad-mist': tokens.gradient.mist,
      },
      boxShadow: {
        card: tokens.shadow.card,
        raised: tokens.shadow.raised,
        purpleGlow: tokens.shadow.purple,
        glass: tokens.shadow.glass,
        fab: tokens.shadow.fab,
      },
      fontFamily: {
        sans: tokens.font.sans.split(', ').map((s) => s.replace(/['"]/g, '')),
        mono: tokens.font.mono.split(', ').map((s) => s.replace(/['"]/g, '')),
      },
    },
  },
  plugins: [],
};

export default config;
