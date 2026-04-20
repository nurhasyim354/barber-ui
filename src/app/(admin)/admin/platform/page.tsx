'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress, Switch, FormControlLabel, Alert, } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';

export default function AdminPlatformPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const [waMessagingEnabled, setWaMessagingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/platform-settings');
      setWaMessagingEnabled(!!res.data?.waMessagingEnabled);
    } catch {
      toast.error('Gagal memuat pengaturan platform');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin') { router.replace('/login'); return; }
    load();
  }, [user, isLoading, load, router]);

  const handleChange = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await api.patch('/admin/platform-settings', { waMessagingEnabled: enabled });
      setWaMessagingEnabled(!!res.data?.waMessagingEnabled);
      toast.success(enabled ? 'WhatsApp diaktifkan' : 'WhatsApp dinonaktifkan');
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user || user.role !== 'super_admin') {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AppPageShell variant="adminFooter">
      <PageHeader title="Pengaturan platform" back />
      <PageContainer>
        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : (
          <Card>
            <CardContent>
              <Box className="flex items-center gap-2 mb-2">
                <ChatIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  WhatsApp (OTP & pengingat)
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Matikan jika gateway WA sedang maintenance atau untuk menghentikan semua pesan keluar
                (OTP login, pengingat kunjungan ulang, pengingat antrian). Saat nonaktif, OTP login
                tetap bisa dipakai lewat kode yang dikembalikan di respons API (<code>devOtp</code>).
              </Typography>
              <Alert severity={waMessagingEnabled ? 'success' : 'warning'} sx={{ mb: 2 }}>
                {waMessagingEnabled
                  ? 'Pesan WhatsApp dikirim seperti biasa (jika WA_API_KEY terisi dan WA_DEV_MODE bukan true).'
                  : 'Tidak ada pesan yang dikirim ke Fonnte / gateway. Pastikan aplikasi menampilkan OTP untuk pengguna.'}
              </Alert>
              <FormControlLabel
                control={
                  <Switch
                    checked={waMessagingEnabled}
                    onChange={(_, v) => void handleChange(v)}
                    disabled={saving}
                    color="primary"
                  />
                }
                label={waMessagingEnabled ? 'WhatsApp aktif' : 'WhatsApp dinonaktifkan'}
              />
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </AppPageShell>
  );
}
