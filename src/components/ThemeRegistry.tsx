'use client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import theme from '@/lib/theme';
import TenantThemeProvider from './TenantThemeProvider';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    // Base dark theme — TenantThemeProvider overrides this when a tenantId is active
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: 12, fontWeight: 500 },
        }}
      />
      <TenantThemeProvider>{children}</TenantThemeProvider>
    </ThemeProvider>
  );
}
