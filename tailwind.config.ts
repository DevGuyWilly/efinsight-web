import type { Config } from 'tailwindcss';
import fs from 'node:fs';
import path from 'node:path';

// Colour utilities (bg-surface-gray-2, text-ink-gray-8, border-outline-gray-1 ...) are generated from the
// variable names in src/styles/tokens.css, so the design tokens have a single source of truth.
const tokens = fs.readFileSync(path.resolve(__dirname, 'src/styles/tokens.css'), 'utf8');
const names = [...new Set([...tokens.matchAll(/--((?:surface|ink|outline)-[a-z0-9-]+):/g)].map((m) => m[1]))];
const colors = Object.fromEntries(names.map((n) => [n, `var(--${n})`]));

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ...colors,
    },
    fontFamily: {
      sans: ['InterVar', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },
    fontSize: {
      '2xs': ['11px', { lineHeight: '1.4' }],
      xs: ['12px', { lineHeight: '1.5' }],
      sm: ['13px', { lineHeight: '1.5' }],
      base: ['14px', { lineHeight: '1.5' }],
      md: ['15px', { lineHeight: '1.6' }],
      lg: ['16px', { lineHeight: '1.4' }],
      xl: ['18px', { lineHeight: '1.6' }],
      '2xl': ['22px', { lineHeight: '1.25' }],
      kpi: ['24px', { lineHeight: '1.1' }],
      '3xl': ['32px', { lineHeight: '1.15' }],
      '4xl': ['36px', { lineHeight: '1.15' }],
      display: ['56px', { lineHeight: '1.08' }],
    },
    borderRadius: {
      none: '0',
      sm: '6px',
      DEFAULT: '8px',
      md: '8px',
      lg: '10px',
      xl: '12px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      sm: 'var(--shadow-sm)',
    },
    extend: {
      letterSpacing: { display: '-0.02em', heading: '-0.01em', body: '0.02em' },
      fontWeight: { body: '420' },
      keyframes: {
        'efs-pulse': { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
        'efs-slide': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(350%)' } },
        'efs-spin': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'efs-pulse': 'efs-pulse 1.4s ease-in-out infinite',
        'efs-slide': 'efs-slide 1.6s ease-in-out infinite',
        'efs-spin': 'efs-spin .8s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
