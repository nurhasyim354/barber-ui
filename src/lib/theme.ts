import { alpha, createTheme } from '@mui/material/styles';
import {
  aeroVistaBodyGradient,
  defaultBrandPalette,
  fontSmoothCss,
  muiBreakpointValues,
  uiFontStack,
} from '@/lib/uiStyleConfig';

const P = defaultBrandPalette;

const aeroInsetHighlight = `inset 0 1px 0 ${alpha('#ffffff', 0.55)}, inset 0 -1px 0 ${alpha('#0A3E7F', 0.12)}`;
const aeroOuterGlow = `0 4px 18px ${alpha('#1B6CBD', 0.22)}, 0 1px 0 ${alpha('#ffffff', 0.45)}`;

const theme = createTheme({
  breakpoints: { values: muiBreakpointValues },
  shape: { borderRadius: 8 },
  palette: {
    mode: 'light',
    primary: {
      main: P.primary,
      light: P.primaryLight,
      dark: P.primaryDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: P.secondary,
      light: P.secondaryLight,
      dark: P.secondaryDark,
      contrastText: '#ffffff',
    },
    background: {
      default: P.background,
      paper: P.paper,
    },
    text: {
      primary: P.textPrimary,
      secondary: P.textSecondary,
      disabled: P.textDisabled,
    },
    divider: P.divider,
    error: { main: P.error },
    warning: { main: P.warning, contrastText: '#ffffff' },
    success: { main: P.success },
    info: { main: P.info },
    action: {
      hover: alpha('#0A5194', 0.06),
      selected: alpha('#0A5194', 0.09),
    },
  },
  typography: {
    fontFamily: uiFontStack,
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { letterSpacing: '0.01em' },
    body2: { letterSpacing: '0.009em' },
    button: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundAttachment: 'fixed',
          backgroundColor: P.background,
          backgroundImage: aeroVistaBodyGradient,
          color: P.textPrimary,
          ...fontSmoothCss,
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
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        sizeLarge: {
          padding: '14px 28px',
          fontSize: '1rem',
          borderRadius: 10,
        },
        sizeSmall: {
          padding: '6px 14px',
          fontSize: '0.8125rem',
          borderRadius: 6,
        },
        containedPrimary: {
          border: `1px solid ${alpha(P.primaryDark, 0.52)}`,
          backgroundImage: `linear-gradient(180deg, ${P.primaryLight} 0%, ${P.primary} 48%, ${P.primaryDark} 52%, ${P.primary} 100%)`,
          boxShadow: `${aeroInsetHighlight}, ${alpha('#000822', 0.12)} 0px 2px 5px`,
          '&:hover': {
            filter: 'brightness(1.05)',
            backgroundImage: `linear-gradient(180deg, ${P.primaryLight} 0%, ${P.primary} 48%, ${P.primaryDark} 52%, ${P.primary} 100%)`,
          },
        },
        outlinedPrimary: {
          borderColor: alpha(P.primaryDark, 0.38),
          color: P.primaryDark,
          backgroundColor: alpha('#ffffff', 0.42),
          backdropFilter: 'blur(8px)',
          '&:hover': {
            borderColor: P.primary,
            backgroundColor: alpha(P.primary, 0.12),
          },
        },
        textPrimary: {
          '&:hover': { backgroundColor: alpha(P.primary, 0.1) },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#ffffff', 0.55),
          backdropFilter: 'blur(14px) saturate(155%)',
          WebkitBackdropFilter: 'blur(14px) saturate(155%)',
          border: `${alpha('#ffffff', 0.9)} solid 1px`,
          borderTopColor: alpha('#ffffff', 0.95),
          borderLeftColor: alpha('#ffffff', 0.85),
          boxShadow: aeroOuterGlow,
          borderRadius: 10,
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
            backgroundColor: alpha('#ffffff', 0.72),
            backdropFilter: 'blur(10px)',
            borderRadius: 8,
            '& fieldset': { borderColor: alpha(P.secondary, 0.18) },
            '&:hover fieldset': { borderColor: alpha(P.primary, 0.42) },
            '&.Mui-focused fieldset': { borderColor: P.primary, borderWidth: 1 },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: P.primaryDark },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: P.divider } },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#EAF4FE', 0.58),
          backdropFilter: 'blur(22px) saturate(165%)',
          WebkitBackdropFilter: 'blur(22px) saturate(165%)',
          borderTop: `1px solid ${alpha('#ffffff', 0.88)}`,
          boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.75)}`,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: P.textSecondary,
          '&.Mui-selected': { color: P.primaryDark },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          backgroundColor: alpha('#F5FBFF', 0.92),
          backdropFilter: 'blur(18px) saturate(150%)',
          WebkitBackdropFilter: 'blur(18px) saturate(150%)',
          border: `1px solid ${alpha('#ffffff', 0.85)}`,
          boxShadow: `0 22px 50px ${alpha('#0B4A91', 0.22)}, inset 0 1px 0 ${alpha('#ffffff', 0.9)}`,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: P.textSecondary,
          borderColor: alpha(P.secondary, 0.2),
          backgroundColor: alpha('#ffffff', 0.35),
          '&.Mui-selected': {
            color: P.primaryDark,
            backgroundColor: alpha(P.primary, 0.14),
            borderColor: alpha(P.primary, 0.32),
            '&:hover': { backgroundColor: alpha(P.primary, 0.18) },
          },
          '&:hover': { backgroundColor: alpha('#ffffff', 0.55) },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: P.primaryLight,
            '& + .MuiSwitch-track': { backgroundColor: `${P.primary} !important`, opacity: 0.55 },
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundImage: `linear-gradient(165deg, ${P.primaryLight} 0%, ${P.primaryDark} 100%)`,
          color: '#fff',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: alpha(P.primary, 0.12),
            border: `1px solid ${alpha(P.primary, 0.18)}`,
            '&:hover': { backgroundColor: alpha(P.primary, 0.16) },
          },
          '&:hover': { backgroundColor: alpha('#ffffff', 0.45) },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        colorPrimary: {
          backdropFilter: 'blur(26px) saturate(175%)',
          WebkitBackdropFilter: 'blur(26px) saturate(175%)',
          backgroundImage: `linear-gradient(180deg, ${alpha(P.primaryLight, 0.45)} 0%, ${alpha(P.primary, 0.85)} 54%, ${alpha(P.primaryDark, 0.88)} 100%)`,
          borderBottom: `1px solid ${alpha('#ffffff', 0.42)}`,
          boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.48)}, ${alpha('#0A4477', 0.25)} 0 4px 18px`,
        },
        colorTransparent: {
          backdropFilter: 'blur(26px) saturate(170%)',
          WebkitBackdropFilter: 'blur(26px) saturate(170%)',
          backgroundImage: `linear-gradient(180deg, ${alpha('#FFFFFF', 0.56)} 0%, ${alpha('#D7EBFA', 0.48)} 100%)`,
          borderBottom: `1px solid ${alpha('#FFFFFF', 0.85)}`,
          boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.75)}`,
          color: P.textPrimary,
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          backgroundImage: `linear-gradient(175deg, ${P.primaryLight} 0%, ${P.primaryDark} 100%)`,
          color: '#fff',
          border: `1px solid ${alpha('#ffffff', 0.42)}`,
          boxShadow: `0 8px 24px ${alpha(P.primaryDark, 0.5)}, inset 0 1px 0 ${alpha('#ffffff', 0.42)}`,
          '&:hover': {
            filter: 'brightness(1.06)',
            boxShadow: `0 12px 32px ${alpha(P.primaryDark, 0.55)}, inset 0 1px 0 ${alpha('#ffffff', 0.5)}`,
          },
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#0F3A61', 0.35),
          backdropFilter: 'blur(4px)',
        },
      },
    },
  },
});

export default theme;
