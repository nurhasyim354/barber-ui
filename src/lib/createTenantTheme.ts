import { alpha, createTheme, Theme } from '@mui/material/styles';
import { fontSmoothCss, muiBreakpointValues, uiFontStack } from '@/lib/uiStyleConfig';

export interface TenantThemeColors {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  paperColor: string;
}

/** Matches DEFAULT_THEME in barber-api — Aero Glass biru sebagai fallback */
export const DEFAULT_TENANT_THEME: TenantThemeColors = {
  primaryColor: '#3788D9',
  accentColor: '#1E4873',
  bgColor: '#BFD8EF',
  paperColor: '#F7FBFF',
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

/** #RRGGBB + alfa hex 2 digit untuk background frosted */
function hexWithAlpha(hex: string, alphaHex: string): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  return `#${c}${alphaHex}`;
}

/** Gradien latar Aero ringan untuk mode terang outlet */
function tenantLightBodyGradient(colors: TenantThemeColors): string {
  const hi = adjustHex(colors.bgColor, 18);
  const mid = colors.bgColor;
  const lo = adjustHex(colors.paperColor, -14);
  return `linear-gradient(175deg, ${hi} 0%, ${mid} 48%, ${lo} 100%)`;
}

export function createTenantTheme(colors: TenantThemeColors): Theme {
  const mode = isLight(colors.bgColor) ? 'light' : 'dark';
  const primary = colors.primaryColor;
  const primaryGlow = adjustHex(primary, 32);
  const primaryDark = adjustHex(primary, -28);

  const divider =
    mode === 'dark' ? 'rgba(255,255,255,0.14)' : alpha(primary, 0.22);
  const textPrimary = mode === 'dark' ? '#F2F8FF' : '#102A43';
  const textSecondary = mode === 'dark' ? '#AAC4DC' : '#3E5F7C';

  const glossyBtnLight =
    mode === 'light' && luminance(primary) < 0.72
      ? {
          border: `1px solid ${alpha(primaryDark, 0.5)}`,
          backgroundImage: `linear-gradient(180deg, ${primaryGlow} 0%, ${primary} 48%, ${primaryDark} 53%, ${primary} 100%)`,
          boxShadow: `${`inset 0 1px 0 ${alpha('#ffffff', 0.52)}`}, inset 0 -1px 0 ${alpha('#051C3A', 0.08)}, ${alpha('#000822', 0.1)} 0px 2px 6px`,
          '&:hover': {
            filter: 'brightness(1.05)',
            backgroundImage: `linear-gradient(180deg, ${primaryGlow} 0%, ${primary} 48%, ${primaryDark} 53%, ${primary} 100%)`,
          },
        }
      : {
          backgroundColor: primary,
          '&:hover': { backgroundColor: primaryDark },
        };

  const cardLightGlass =
    mode === 'light'
      ? {
          backgroundColor: alpha(colors.paperColor, 0.58),
          backdropFilter: 'blur(14px) saturate(155%)',
          WebkitBackdropFilter: 'blur(14px) saturate(155%)',
          border: `${alpha('#ffffff', 0.88)} solid 1px`,
          borderTopColor: alpha('#ffffff', 0.95),
          boxShadow: `${`0 4px 16px ${alpha(primaryDark, 0.14)}`}, inset 0 1px 0 ${alpha('#ffffff', 0.65)}`,
        }
      : {
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          border: `1px solid ${divider}`,
        };

  return createTheme({
    breakpoints: { values: muiBreakpointValues },
    shape: { borderRadius: 8 },
    palette: {
      mode,
      primary: {
        main: primary,
        light: primaryGlow,
        dark: primaryDark,
        contrastText:
          luminance(primary) >= 0.55 && isLight(primary) ? '#0D1F33' : '#ffffff',
      },
      secondary: {
        main: colors.accentColor,
        contrastText: isLight(colors.accentColor) ? '#102A43' : '#ffffff',
      },
      background: {
        default: colors.bgColor,
        paper: colors.paperColor,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider,
      action: {
        hover:
          mode === 'dark' ? 'rgba(255,255,255,0.08)' : alpha(primaryDark, 0.06),
        selected:
          mode === 'dark' ? 'rgba(255,255,255,0.12)' : alpha(primaryDark, 0.09),
      },
    },
    typography: {
      fontFamily: uiFontStack,
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body:
            mode === 'light'
              ? {
                  ...fontSmoothCss,
                  backgroundAttachment: 'fixed',
                  backgroundColor: colors.bgColor,
                  backgroundImage: tenantLightBodyGradient(colors),
                  color: textPrimary,
                }
              : { ...fontSmoothCss, color: textPrimary },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          colorPrimary: {
            backdropFilter: mode === 'light' ? 'blur(26px) saturate(175%)' : undefined,
            WebkitBackdropFilter: mode === 'light' ? 'blur(26px) saturate(175%)' : undefined,
            ...(mode === 'light'
              ? {
                  borderBottom: `1px solid ${alpha('#ffffff', 0.42)}`,
                  boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.42)}, ${alpha(primaryDark, 0.26)} 0 4px 18px`,
                  backgroundImage: `linear-gradient(180deg, ${alpha(primaryGlow, 0.42)} 0%, ${hexWithAlpha(primary, 'D9')} 55%, ${alpha(primaryDark, 0.92)} 100%)`,
                }
              : {
                  backgroundImage: undefined,
                  backgroundColor: `${primary}E8`,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }),
          },
          colorTransparent: {
            backdropFilter: 'blur(26px) saturate(170%)',
            WebkitBackdropFilter: 'blur(26px) saturate(170%)',
            ...(mode === 'light'
              ? {
                  backgroundImage: `linear-gradient(180deg, ${alpha('#FFFFFF', 0.58)} 0%, ${alpha(colors.bgColor, 0.5)} 100%)`,
                  borderBottom: `1px solid ${alpha('#FFFFFF', 0.82)}`,
                  boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.65)}`,
                }
              : {
                  backgroundColor: 'rgba(44,44,46,0.72)',
                  borderBottom: `1px solid ${divider}`,
                  boxShadow: 'none',
                  backgroundImage: 'none',
                }),
            color: textPrimary,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem',
            padding: '10px 20px',
            borderRadius: 8,
          },
          sizeLarge: { padding: '14px 28px', fontSize: '1rem', borderRadius: 10 },
          sizeSmall: {
            padding: '6px 14px',
            fontSize: '0.8125rem',
            borderRadius: 6,
          },
          containedPrimary: glossyBtnLight,
          outlinedPrimary: {
            borderColor:
              mode === 'dark' ? 'rgba(255,255,255,0.32)' : alpha(primaryDark, 0.38),
            color: mode === 'dark' ? '#E8F2FF' : primaryDark,
            backgroundColor:
              mode === 'light' ? alpha('#ffffff', 0.42) : alpha('#ffffff', 0.08),
            ...(mode === 'light' ? { backdropFilter: 'blur(8px)' } : {}),
            '&:hover': {
              borderColor: primary,
              backgroundColor:
                mode === 'light' ? alpha(primary, 0.14) : alpha('#ffffff', 0.14),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundImage: 'none',
            ...cardLightGlass,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
          }),
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
            borderTopLeftRadius: theme.shape.borderRadius,
            borderTopRightRadius: theme.shape.borderRadius,
          }),
        },
      },
      MuiInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
          }),
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              ...(mode === 'light'
                ? {
                    backgroundColor: alpha(colors.paperColor, 0.72),
                    backdropFilter: 'blur(10px)',
                  }
                : {
                    backgroundColor:
                      luminance(colors.paperColor) < 0.2
                        ? 'rgba(255,255,255,0.06)'
                        : colors.paperColor,
                  }),
              '& fieldset': {
                borderColor:
                  mode === 'dark' ? 'rgba(255,255,255,0.14)' : alpha(primary, 0.2),
              },
              '&:hover fieldset': {
                borderColor:
                  mode === 'dark' ? 'rgba(255,255,255,0.26)' : alpha(primary, 0.42),
              },
              '&.Mui-focused fieldset': { borderColor: primary },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            ...(mode === 'light'
              ? {
                  backgroundColor: alpha(colors.paperColor, 0.9),
                  backdropFilter: 'blur(18px) saturate(155%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(155%)',
                  border: `1px solid ${alpha('#ffffff', 0.88)}`,
                  boxShadow: `0 22px 50px ${alpha(primaryDark, 0.2)}, inset 0 1px 0 ${alpha('#ffffff', 0.85)}`,
                }
              : {
                  border: `1px solid ${divider}`,
                  boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                  backgroundColor: colors.paperColor,
                }),
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            ...(mode === 'light'
              ? {
                  backgroundColor: alpha(colors.paperColor, 0.54),
                  backdropFilter: 'blur(22px) saturate(162%)',
                  WebkitBackdropFilter: 'blur(22px) saturate(162%)',
                  borderTop: `1px solid ${alpha('#ffffff', 0.85)}`,
                  boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.72)}`,
                }
              : {
                  backgroundColor: 'rgba(44,44,46,0.72)',
                  borderTop: `1px solid ${divider}`,
                }),
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: textSecondary,
            '&.Mui-selected': { color: mode === 'light' ? primaryDark : primaryGlow },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: mode === 'light' ? primaryGlow : primary,
              '& + .MuiSwitch-track': {
                backgroundColor: `${primary} !important`,
                opacity: mode === 'light' ? 0.5 : 0.42,
              },
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&.Mui-selected': {
              backgroundColor: hexWithAlpha(primary, '22'),
              border:
                mode === 'light'
                  ? `1px solid ${alpha(primary, 0.28)}`
                  : `1px solid ${hexWithAlpha(primary, '33')}`,
              '&:hover': { backgroundColor: hexWithAlpha(primary, '33') },
            },
            '&:hover': {
              backgroundColor:
                mode === 'light' ? alpha('#ffffff', 0.35) : 'rgba(255,255,255,0.06)',
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            ...(mode === 'light'
              ? {
                  border: `1px solid ${alpha('#ffffff', 0.45)}`,
                  backgroundImage: `linear-gradient(175deg, ${primaryGlow} 0%, ${primaryDark} 100%)`,
                  color: '#fff',
                  boxShadow: `0 8px 24px ${alpha(primaryDark, 0.42)}, inset 0 1px 0 ${alpha('#ffffff', 0.38)}`,
                  '&:hover': { filter: 'brightness(1.06)' },
                }
              : { boxShadow: `0 4px 14px ${hexWithAlpha(primary, '55')}` }),
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root:
            mode === 'light'
              ? {
                  backgroundColor: alpha(primaryDark, 0.22),
                  backdropFilter: 'blur(3px)',
                }
              : { backgroundColor: 'rgba(0,0,0,0.6)' },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
    },
  });
}
