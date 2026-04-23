import { createTheme } from '@mui/material/styles';
import { defaultBrandPalette, muiBreakpointValues } from '@/lib/uiStyleConfig';

const P = defaultBrandPalette;

const theme = createTheme({
  breakpoints: { values: muiBreakpointValues },
  /** Satu langkah radius untuk input & modal (4px); komponen lain bisa pakai nilai berbeda */
  shape: { borderRadius: 1 },
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
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: P.background,
          color: P.textPrimary,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
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
          background: `linear-gradient(135deg, ${P.primary} 0%, ${P.primaryDark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${P.primaryLight} 0%, ${P.primary} 100%)`,
          },
        },
        outlinedPrimary: {
          borderColor: P.primary,
          color: P.primary,
          '&:hover': {
            borderColor: P.primaryLight,
            backgroundColor: 'rgba(139,58,42,0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: P.paper,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
          border: `1px solid ${P.divider}`,
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
            backgroundColor: '#FAFAF9',
            '& fieldset': { borderColor: P.divider },
            '&:hover fieldset': { borderColor: P.primary },
            '&.Mui-focused fieldset': { borderColor: P.primary },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: P.primary },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: P.divider } },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: P.paper,
          borderTop: `1px solid ${P.divider}`,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#888888',
          '&.Mui-selected': { color: P.primary },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          backgroundColor: P.paper,
          border: `1px solid ${P.divider}`,
        }),
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: '#555555',
          borderColor: P.divider,
          '&.Mui-selected': {
            color: '#ffffff',
            backgroundColor: P.primary,
            borderColor: P.primary,
            '&:hover': { backgroundColor: P.primaryDark },
          },
          '&:hover': { backgroundColor: 'rgba(139,58,42,0.06)' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: P.primary,
            '& + .MuiSwitch-track': { backgroundColor: P.primaryLight },
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { backgroundColor: P.primary },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(139,58,42,0.1)',
            '&:hover': { backgroundColor: 'rgba(139,58,42,0.15)' },
          },
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          background: `linear-gradient(135deg, ${P.primary} 0%, ${P.primaryDark} 100%)`,
          boxShadow: `0 2px 20px rgba(139,58,42,0.22)`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
});

export default theme;
