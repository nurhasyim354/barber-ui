'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import HomeMarketing from '@/components/marketing/HomeMarketing';

export default function Home() {
  const router = useRouter();
  const { user, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (user.role === 'super_admin') router.replace('/admin/tenants');
    else if (user.role === 'tenant_admin') router.replace('/dashboard');
    else if (user.role === 'barber') router.replace('/barber');
    else router.replace('/booking');
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return (
      <Box className="flex items-center justify-center" sx={{ minHeight: '100svh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return <HomeMarketing />;
}
