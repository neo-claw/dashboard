import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#00ff9d',
          glow: 'rgba(0, 255, 157, 0.3)',
        },
        bg: {
          DEFAULT: '#0a0a0a',
        },
        fg: {
          DEFAULT: '#f5f5f5',
        },
        surface: {
          DEFAULT: '#0f0f0f',
          hover: '#1a1a1a',
          card: '#111111',
        },
        muted: {
          DEFAULT: '#6b7280',
        },
        border: {
          DEFAULT: '#262626',
          glow: 'rgba(0, 255, 157, 0.15)',
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 255, 157, 0.15)',
        'glow-sm': '0 0 10px rgba(0, 255, 157, 0.1)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
