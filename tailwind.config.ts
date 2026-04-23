import type { Config } from 'tailwindcss';
import { defaultBrandPalette, tailwindScreens } from './src/lib/uiStyleConfig';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      borderRadius: {
        'app-button': 'var(--app-radius-button)',
        'app-card': 'var(--app-radius-card)',
        'app-box': 'var(--app-radius-box)',
      },
      screens: tailwindScreens,
      colors: {
        brand: {
          50: '#fff8f0',
          100: '#ffe8d0',
          500: defaultBrandPalette.primary,
          600: defaultBrandPalette.primaryDark,
          700: defaultBrandPalette.primaryDark,
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};

export default config;
