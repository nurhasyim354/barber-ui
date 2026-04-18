/**
 * Konfigurasi UI terpusat: breakpoint, warna default, dan layout.
 * Dipakai oleh MUI theme, Tailwind, dan komponen layout — jangan duplikasi di file lain.
 */

/** Nilai breakpoint (px) — selaras dengan default MUI v5 */
export const BREAKPOINTS_PX = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const;

/** Untuk `createTheme({ breakpoints: { values } })` */
export const muiBreakpointValues = BREAKPOINTS_PX;

/** Untuk `tailwind.config` → `theme.extend.screens` */
export const tailwindScreens = {
  sm: `${BREAKPOINTS_PX.sm}px`,
  md: `${BREAKPOINTS_PX.md}px`,
  lg: `${BREAKPOINTS_PX.lg}px`,
  xl: `${BREAKPOINTS_PX.xl}px`,
};

/**
 * Palette default aplikasi (selaras dengan DEFAULT_TENANT_THEME / theme.ts).
 * Warna tenant dinamis tetap dari API; ini untuk tema dasar & Tailwind `brand`.
 */
export const defaultBrandPalette = {
  primary: '#8B3A2A',
  primaryLight: '#B5503D',
  primaryDark: '#5C2218',
  secondary: '#2C3A47',
  secondaryLight: '#3E5268',
  secondaryDark: '#1A2530',
  background: '#F0EDE8',
  paper: '#FFFFFF',
  divider: '#DDD9D3',
  textPrimary: '#1A1A1A',
  textSecondary: '#555555',
  textDisabled: '#AAAAAA',
  error: '#C62828',
  warning: '#E65100',
  success: '#2E7D32',
  info: '#1565C0',
} as const;

/** Layout halaman — maxWidth mengikuti prop MUI `Container` */
export const UI_LAYOUT = {
  contentMaxWidth: 'lg' as const,
  mediumMaxWidth: 'md' as const,
  narrowMaxWidth: 'sm' as const,
  wideMaxWidth: 'xl' as const,

  /** Form login / kartu sempit */
  loginCardMaxWidthPx: 380,
  /** Kolom utama booking (mobile-first) */
  bookingColumnMaxWidthPx: 520,

  containerGutters: {
    px: { xs: 2, sm: 3, md: 4 },
  },

  pageShell: {
    withBottomNav: {
      minHeight: '100svh',
      bgcolor: 'background.default' as const,
      pb: 12,
    },
    adminFooter: {
      minHeight: '100svh',
      bgcolor: 'background.default' as const,
      pb: 8,
    },
    reportFooter: {
      minHeight: '100svh',
      bgcolor: 'background.default' as const,
      pb: 10,
    },
  },
} as const;
