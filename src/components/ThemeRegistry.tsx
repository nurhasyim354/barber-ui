'use client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import theme from '@/lib/theme';
import TenantThemeProvider from './TenantThemeProvider';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    // Base tema aplikasi — TenantThemeProvider menimpa palet saat tenantId aktif (warna outlet).
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: 10,
            fontWeight: 600,
            fontSize: '0.9375rem',
            padding: '14px 18px',
            backgroundColor: 'rgba(247, 251, 255, 0.95)',
            color: '#102A43',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow:
              '0 8px 32px rgba(11, 85, 150, 0.18), inset 0 1px 0 rgba(255,255,255,0.85)',
            backdropFilter: 'blur(14px)',
          },
        }}
      />
      <TenantThemeProvider>{children}</TenantThemeProvider>
    </ThemeProvider>
  );
}
