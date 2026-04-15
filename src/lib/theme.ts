import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c0392b',       // merah tua
      light: '#e74c3c',      // merah terang
      dark: '#922b21',       // merah gelap
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1a237e',       // biru tua/navy
      light: '#3949ab',      // biru medium
      dark: '#0d1642',       // biru sangat gelap
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f0f0f',    // hitam hampir gelap
      paper: '#1c1c1e',      // hitam kartu
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#a0a0a0',
      disabled: '#555555',
    },
    divider: '#2a2a2e',
    error: {
      main: '#e53935',
    },
    warning: {
      main: '#ffa726',
      contrastText: '#1a1a1a',
    },
    success: {
      main: '#43a047',
    },
    info: {
      main: '#1565c0',
    },
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
          backgroundColor: '#0f0f0f',
          color: '#f5f5f5',
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
          background: 'linear-gradient(135deg, #c0392b 0%, #922b21 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          },
        },
        outlinedPrimary: {
          borderColor: '#c0392b',
          color: '#e74c3c',
          '&:hover': {
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(192,57,43,0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#1c1c1e',
          boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
          border: '1px solid #2a2a2e',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#141418',
            color: '#f5f5f5',
            '& fieldset': { borderColor: '#3a3a3e' },
            '&:hover fieldset': { borderColor: '#c0392b' },
            '&.Mui-focused fieldset': { borderColor: '#c0392b' },
          },
          '& .MuiInputLabel-root': { color: '#a0a0a0' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#e74c3c' },
          '& .MuiInputBase-input': { color: '#f5f5f5' },
          '& .MuiFormHelperText-root': { color: '#a0a0a0' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#2a2a2e' },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#141418',
          borderTop: '1px solid #2a2a2e',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#666670',
          '&.Mui-selected': { color: '#e74c3c' },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1c1c1e',
          border: '1px solid #2a2a2e',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: '#a0a0a0',
          borderColor: '#3a3a3e',
          '&.Mui-selected': {
            color: '#ffffff',
            backgroundColor: '#c0392b',
            borderColor: '#c0392b',
            '&:hover': { backgroundColor: '#922b21' },
          },
          '&:hover': { backgroundColor: 'rgba(192,57,43,0.1)' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#e74c3c',
            '& + .MuiSwitch-track': { backgroundColor: '#c0392b' },
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: '#c0392b',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(192,57,43,0.15)',
            '&:hover': { backgroundColor: 'rgba(192,57,43,0.2)' },
          },
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
