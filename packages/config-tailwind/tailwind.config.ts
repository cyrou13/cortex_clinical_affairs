import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    '../../apps/web/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cortex: {
          primary: '#1e40af',
          secondary: '#3b82f6',
          accent: '#06b6d4',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};

export default config;
