'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { CircularProgress, Box } from '@mui/material';

export default function Home() {
  const router = useRouter();
  const { user, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'super_admin') router.replace('/admin/tenants');
    else if (user.role === 'tenant_admin') router.replace('/dashboard');
    else if (user.role === 'barber') router.replace('/barber');
    else router.replace('/booking');
  }, [user, isLoading, router]);

  return (
    <Box className="flex items-center justify-center" sx={{ minHeight: '100svh' }}>
      <CircularProgress color="primary" />
    </Box>
  );
}
