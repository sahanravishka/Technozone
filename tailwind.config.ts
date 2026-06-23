import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:    'rgb(var(--ink-rgb) / <alpha-value>)',
        paper:  'rgb(var(--paper-rgb) / <alpha-value>)',
        card:   'rgb(var(--card-rgb) / <alpha-value>)',
        line:   'var(--line)',
        volt:   { DEFAULT: 'rgb(var(--volt-rgb) / <alpha-value>)', deep: 'var(--volt-deep)', soft: 'var(--volt-soft)' },
        accent: 'var(--accent)',
        deep:   'rgb(var(--deep-rgb) / <alpha-value>)',
        ok:     'var(--ok)',
        warn:   { DEFAULT: 'var(--warn)', soft: 'var(--warn-soft)' },
        sale:   'rgb(var(--sale-rgb) / <alpha-value>)',
        muted:  'var(--muted)',
        tint: {
          sky: 'var(--tint-sky)', mint: 'var(--tint-mint)', lav: 'var(--tint-lav)',
          peach: 'var(--tint-peach)', tone: 'var(--tint-tone)'
        }
      },
      fontFamily: {
        body: ['var(--font-body)']
      },
      borderRadius: {
        btn: '14px',
        card: '26px',
        pill: '999px',
        blob: '30% 70% 70% 30% / 30% 30% 70% 70%'
      },
      boxShadow: {
        panel: '0 20px 48px -16px rgba(11,21,38,.2)',
        soft: '0 18px 50px -24px rgba(11,21,38,.28)',
        glow: '0 0 20px var(--glow-hover)',
        'glow-sm': '0 0 10px var(--glow-color)'
      },
      animation: {
        'float': 'badgeFloat 2.5s ease-in-out infinite',
        'pulse-glow': 'pulseOk .6s ease'
      }
    }
  },
  plugins: []
} satisfies Config;
