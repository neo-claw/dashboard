import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-space)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      },
      fontSize: {
        'display': ['2.5rem', { lineHeight: '1.1', fontWeight: '600' }],
        'hero': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
      },
      colors: {
        accent: {
          DEFAULT: '#00ff9d',
          glow: 'rgba(0, 255, 157, 0.25)',
          dim: 'rgba(0, 255, 157, 0.1)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          foreground: 'var(--color-success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          foreground: 'var(--color-warning-foreground)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          foreground: 'var(--color-error-foreground)',
        },
        bg: {
          DEFAULT: '#050505',
          card: '#0a0a0a',
          hover: '#0f0f0f',
        },
        fg: {
          DEFAULT: '#f5f5f5',
          muted: '#9ca3af',
        },
        surface: {
          DEFAULT: '#0a0a0a',
          elevated: '#111111',
          glass: 'rgba(17, 17, 17, 0.7)',
        },
        muted: {
          DEFAULT: '#6b7280',
          subtle: '#374151',
        },
        border: {
          DEFAULT: '#262626',
          light: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(0, 255, 157, 0.15)',
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 255, 157, 0.15)',
        'glow-sm': '0 0 10px rgba(0, 255, 157, 0.1)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'inner-glow': 'inset 0 0 12px rgba(0, 255, 157, 0.05)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 3s infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 255, 157, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 255, 157, 0.25)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config;
