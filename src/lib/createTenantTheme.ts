import { createTheme, Theme } from '@mui/material/styles';

export interface TenantThemeColors {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  paperColor: string;
}

/** Matches DEFAULT_THEME in barber-api/src/models/Tenant.ts */
export const DEFAULT_TENANT_THEME: TenantThemeColors = {
  primaryColor: '#8B3A2A',
  accentColor: '#2C3A47',
  bgColor: '#F0EDE8',
  paperColor: '#FFFFFF',
};

/** Returns relative luminance [0..1] from a hex color string */
function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isLight(hex: string): boolean {
  return luminance(hex) >= 0.5;
}

/** Lightens or darkens a hex color by a given amount (-255 to 255) */
function adjustHex(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(c.substring(0, 2), 16) + amount);
  const g = clamp(parseInt(c.substring(2, 4), 16) + amount);
  const b = clamp(parseInt(c.substring(4, 6), 16) + amount);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function createTenantTheme(colors: TenantThemeColors): Theme {
  const mode = isLight(colors.bgColor) ? 'light' : 'dark';
  const primary = colors.primaryColor;
  const primaryLight = adjustHex(primary, 30);
  const primaryDark = adjustHex(primary, -30);

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary,
        light: primaryLight,
        dark: primaryDark,
        contrastText: isLight(primary) ? '#1a1a1a' : '#ffffff',
      },
      secondary: {
        main: colors.accentColor,
        contrastText: isLight(colors.accentColor) ? '#1a1a1a' : '#ffffff',
      },
      background: {
        default: colors.bgColor,
        paper: colors.paperColor,
      },
    },
    typography: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          colorPrimary: {
            background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
            boxShadow: `0 2px 20px ${primary}38`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            padding: '12px 24px',
          },
          sizeLarge: {
            padding: '16px 32px',
            fontSize: '1.1rem',
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${primaryLight} 0%, ${primary} 100%)`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow:
              mode === 'dark'
                ? '0 2px 16px rgba(0,0,0,0.4)'
                : '0 2px 16px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': { borderRadius: 12 },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
    },
  });
}
