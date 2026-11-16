import type { Config } from 'tailwindcss';

/** Map a token to a Tailwind color that supports opacity modifiers (bg-x/50). */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Raw monochrome ladder — prefer semantic tokens; for edge cases only */
        shade: {
          0: token('shade-0'),
          50: token('shade-50'),
          100: token('shade-100'),
          150: token('shade-150'),
          200: token('shade-200'),
          300: token('shade-300'),
          400: token('shade-400'),
          500: token('shade-500'),
          600: token('shade-600'),
          700: token('shade-700'),
          800: token('shade-800'),
          850: token('shade-850'),
          900: token('shade-900'),
          950: token('shade-950'),
          1000: token('shade-1000'),
        },

        /* Canvas & surfaces */
        background: token('background'),
        surface: {
          DEFAULT: token('surface'),
          muted: token('surface-muted'),
          elevated: token('surface-elevated'),
          hover: token('surface-hover'),
        },

        /* Lines */
        border: {
          DEFAULT: token('border'),
          strong: token('border-strong'),
          subtle: token('border-subtle'),
        },

        /* Ink */
        'text-primary': token('text-primary'),
        'text-secondary': token('text-secondary'),
        'text-tertiary': token('text-tertiary'),
        'text-disabled': token('text-disabled'),
        'text-inverse': token('text-inverse'),

        /* Brand */
        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          active: token('primary-active'),
          foreground: token('primary-foreground'),
          muted: token('primary-muted'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          hover: token('secondary-hover'),
          foreground: token('secondary-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },

        /* Status */
        success: {
          DEFAULT: token('success'),
          muted: token('success-muted'),
          foreground: token('success-foreground'),
        },
        warning: {
          DEFAULT: token('warning'),
          muted: token('warning-muted'),
          foreground: token('warning-foreground'),
        },
        danger: {
          DEFAULT: token('danger'),
          muted: token('danger-muted'),
          foreground: token('danger-foreground'),
        },
        info: {
          DEFAULT: token('info'),
          muted: token('info-muted'),
          foreground: token('info-foreground'),
        },

        /* Interaction chrome */
        'focus-ring': token('focus-ring'),
        overlay: token('overlay'),

        /* Charts */
        chart: {
          1: token('chart-1'),
          2: token('chart-2'),
          3: token('chart-3'),
          4: token('chart-4'),
          5: token('chart-5'),
          6: token('chart-6'),
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        popover: 'var(--shadow-popover)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'dialog-in': {
          from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.97)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'popover-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'dialog-in': 'dialog-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'popover-in': 'popover-in 140ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
