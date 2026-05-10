'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Avatar, Switch,
  FormControlLabel, Divider, Button, CircularProgress,
  Chip, Alert,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { StaffBottomNav } from '@/components/layout/BottomNav';
import PhoneChangeSection from '@/components/account/PhoneChangeSection';
import { getTenantUiLabels } from '@/lib/tenantLabels';

export default function StaffSettingsPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const pendingLoginPhone = useAuthStore((s) => s.user?.pendingPhone);
  const router = useRouter();

  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [availLoading, setAvailLoading] = useState(false);
  const [currentTenantName, setCurrentTenantName] = useState<string | null>(null);

  const ui = getTenantUiLabels(user?.tenantType);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'staff') { router.replace('/'); return; }
  }, [isLoading, user, router]);

  const loadStaffAvailability = useCallback(async () => {
    if (!user?.staffId) return;
    setAvailLoading(true);
    try {
      const res = await api.get(`/barbers/${user.staffId}`);
      setIsAvailable(res.data.isAvailable ?? true);
    } catch {
      /* biarkan default true */
    } finally {
      setAvailLoading(false);
    }
  }, [user?.staffId]);

  useEffect(() => {
    if (!user?.tenantId) return;
    api.get(`/tenants/${user.tenantId}`)
      .then((r) => setCurrentTenantName(r.data?.name ?? null))
      .catch(() => {});
  }, [user?.tenantId]);

  useEffect(() => {
    if (user?.staffId) void loadStaffAvailability();
  }, [user?.staffId, loadStaffAvailability]);

  const handleToggleAvailability = async () => {
    if (!user?.staffId) return;
    setTogglingAvail(true);
    try {
      const res = await api.patch(`/staff/${user.staffId}/availability`);
      setIsAvailable(res.data.isAvailable);
      toast.success(res.data.isAvailable ? 'Status: Tersedia' : 'Status: Tidak Tersedia');
    } catch {
      toast.error('Gagal mengubah status');
    } finally {
      setTogglingAvail(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading || !user) {
    return (
      <AppPageShell variant="withBottomNav">
        <Box className="flex justify-center mt-16"><CircularProgress /></Box>
        <StaffBottomNav />
      </AppPageShell>
    );
  }

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title="Pengaturan" />

      <PageContainer>
        {/* Profil & ketersediaan */}
        <Card
          variant="outlined"
          sx={{
            mb: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: isAvailable ? 'success.light' : 'warning.light',
            bgcolor: isAvailable ? 'rgba(46,125,50,0.05)' : 'rgba(230,81,0,0.05)',
          }}
        >
          <CardContent>
            <Box className="flex items-center gap-3 mb-3">
              <Avatar sx={{ bgcolor: 'primary.main', width: 52, height: 52, fontWeight: 700, fontSize: 22 }}>
                {user.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography fontWeight={600} variant="subtitle1">{user.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <StorefrontIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {ui.staffSingular}
                    {currentTenantName ? ` · ${currentTenantName}` : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>Status Ketersediaan</Typography>
                <Typography variant="caption" color="text.secondary">
                  Jika tidak tersedia, pelanggan tidak dapat memilih Anda saat booking
                </Typography>
              </Box>
              {availLoading ? (
                <CircularProgress size={24} />
              ) : (
                <FormControlLabel
                  control={
                    <Switch
                      checked={isAvailable}
                      onChange={handleToggleAvailability}
                      disabled={togglingAvail || !user.staffId}
                      color="success"
                    />
                  }
                  label={
                    <Chip
                      label={isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
                      color={isAvailable ? 'success' : 'warning'}
                      size="small"
                      variant="outlined"
                    />
                  }
                  labelPlacement="start"
                  sx={{ m: 0, gap: 1 }}
                />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Ubah Nomor WhatsApp */}
        <Card variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Ubah Nomor WhatsApp (Login)
              </Typography>
              {pendingLoginPhone && (
                <Chip size="small" label="Menunggu verifikasi" color="info" />
              )}
            </Box>
            <PhoneChangeSection hideIntro />
          </CardContent>
        </Card>

        {/* Langganan (jika overdue) */}
        {user.isOverdue && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => router.push('/subscription')}>
                Tagihan
              </Button>
            }
          >
            Tagihan berlangganan outlet melewati jatuh tempo.
          </Alert>
        )}

        {/* Logout */}
        <Button
          fullWidth
          variant="outlined"
          color="error"
          size="large"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ borderRadius: 3, py: 1.5, mt: 1 }}
        >
          Keluar
        </Button>
      </PageContainer>

      <StaffBottomNav />
    </AppPageShell>
  );
}
