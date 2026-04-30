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
 * Palette default — Windows Vista Aero Glass: biru langit, blur kaca,
 * tepi kilap putih halus (tanpa tema tenant eksplisit).
 */
export const defaultBrandPalette = {
  primary: '#3788D9',
  primaryLight: '#8FD0FF',
  primaryDark: '#2563AE',
  secondary: '#1E4873',
  secondaryLight: '#2B5F8F',
  secondaryDark: '#163A59',
  background: '#BFD8EF',
  paper: '#F7FBFF',
  divider: 'rgba(58, 132, 210, 0.28)',
  textPrimary: '#102A43',
  textSecondary: '#3E5F7C',
  textDisabled: '#8AA3B8',
  error: '#C42B1F',
  warning: '#CC5500',
  success: '#1F8438',
  info: '#2E8FD9',
} as const;

/** Latar bergaya Aero (gradient besar di body; warna fallback = background palette) */
export const aeroVistaBodyGradient =
  'linear-gradient(175deg, #9BC1E8 0%, #BEDDF7 42%, #D9EDFB 72%, #EAF6FF 100%)';

/** Stack font — Vista/Windows pertama */
export const uiFontStack =
  '"Segoe UI", "Segoe UI Variable", "Candara", "DejaVu Sans", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';

export const fontSmoothCss = {
  WebkitFontSmoothing: 'antialiased' as const,
  MozOsxFontSmoothing: 'grayscale' as const,
};

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
