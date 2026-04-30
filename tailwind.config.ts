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
          50: '#e9f5ff',
          100: '#cde9fc',
          500: defaultBrandPalette.primary,
          600: defaultBrandPalette.primaryDark,
          700: defaultBrandPalette.secondaryDark,
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
