'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeProvider, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from '@/store/authStore';
import {
  createTenantTheme,
  TenantThemeColors,
  DEFAULT_TENANT_THEME,
} from '@/lib/createTenantTheme';
import api from '@/lib/api';

function TenantThemeInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { user, loadFromStorage } = useAuthStore();
  const [tenantTheme, setTenantTheme] = useState<Theme | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // URL param takes priority over JWT tenantId
  const tenantId = useMemo(
    () => searchParams.get('tenantId') ?? user?.tenantId ?? null,
    [searchParams, user?.tenantId],
  );

  useEffect(() => {
    if (!tenantId) {
      setTenantTheme(null);
      document.documentElement.classList.add('dark-mode');
      return;
    }

    let cancelled = false;
    api
      .get(`/tenants/${tenantId}`)
      .then((res) => {
        if (cancelled) return;
        const t = res.data.theme as TenantThemeColors | null | undefined;
        // Use tenant's custom theme if set, otherwise fall back to DEFAULT_TENANT_THEME
        const colors: TenantThemeColors = t?.primaryColor ? t : DEFAULT_TENANT_THEME;
        setTenantTheme(createTenantTheme(colors));
        document.documentElement.classList.remove('dark-mode');
      })
      .catch(() => {
        if (!cancelled) {
          // Tenant fetch failed — still apply default tenant theme so UX is consistent
          setTenantTheme(createTenantTheme(DEFAULT_TENANT_THEME));
          document.documentElement.classList.remove('dark-mode');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (!tenantTheme) return <>{children}</>;

  return (
    <ThemeProvider theme={tenantTheme}>
      {/* Re-apply CssBaseline so body background updates to tenant colors */}
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

/**
 * Reads tenantId from URL search params or the auth store, fetches the
 * tenant's theme, and overrides the MUI ThemeProvider for all children.
 * Falls back silently to the default dark theme when no tenantId is found
 * or the tenant has no custom theme configured.
 */
export default function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <TenantThemeInner>{children}</TenantThemeInner>
    </Suspense>
  );
}
