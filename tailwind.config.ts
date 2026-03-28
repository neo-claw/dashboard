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
        accent: '#00ff9d',
        bg: '#0a0a0a',
        muted: '#555',
        card: '#111',
        border: '#222',
      },
    },
  },
  plugins: [],
} satisfies Config;
