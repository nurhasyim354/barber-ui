import { createTheme } from '@mui/material/styles';

// Palette matches DEFAULT_TENANT_THEME — consistent with tenant light theme
const PRIMARY = '#8B3A2A';       // brick red
const PRIMARY_LIGHT = '#B5503D';
const PRIMARY_DARK = '#5C2218';
const SECONDARY = '#2C3A47';     // dark navy
const BG_DEFAULT = '#F0EDE8';    // warm off-white
const BG_PAPER = '#FFFFFF';
const DIVIDER = '#DDD9D3';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: PRIMARY,
      light: PRIMARY_LIGHT,
      dark: PRIMARY_DARK,
      contrastText: '#ffffff',
    },
    secondary: {
      main: SECONDARY,
      light: '#3E5268',
      dark: '#1A2530',
      contrastText: '#ffffff',
    },
    background: {
      default: BG_DEFAULT,
      paper: BG_PAPER,
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#555555',
      disabled: '#AAAAAA',
    },
    divider: DIVIDER,
    error: { main: '#C62828' },
    warning: { main: '#E65100', contrastText: '#ffffff' },
    success: { main: '#2E7D32' },
    info: { main: '#1565C0' },
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
          backgroundColor: BG_DEFAULT,
          color: '#1A1A1A',
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
          background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, ${PRIMARY} 100%)`,
          },
        },
        outlinedPrimary: {
          borderColor: PRIMARY,
          color: PRIMARY,
          '&:hover': {
            borderColor: PRIMARY_LIGHT,
            backgroundColor: 'rgba(139,58,42,0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: BG_PAPER,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
          border: `1px solid ${DIVIDER}`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#FAFAF9',
            '& fieldset': { borderColor: DIVIDER },
            '&:hover fieldset': { borderColor: PRIMARY },
            '&.Mui-focused fieldset': { borderColor: PRIMARY },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: PRIMARY },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: DIVIDER } },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: BG_PAPER,
          borderTop: `1px solid ${DIVIDER}`,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#888888',
          '&.Mui-selected': { color: PRIMARY },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_PAPER,
          border: `1px solid ${DIVIDER}`,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: '#555555',
          borderColor: DIVIDER,
          '&.Mui-selected': {
            color: '#ffffff',
            backgroundColor: PRIMARY,
            borderColor: PRIMARY,
            '&:hover': { backgroundColor: PRIMARY_DARK },
          },
          '&:hover': { backgroundColor: 'rgba(139,58,42,0.06)' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: PRIMARY,
            '& + .MuiSwitch-track': { backgroundColor: PRIMARY_LIGHT },
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { backgroundColor: PRIMARY },
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
          background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
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
