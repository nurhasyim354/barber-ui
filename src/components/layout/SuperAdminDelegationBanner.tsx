'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/authStore';

export default function SuperAdminDelegationBanner() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!user?.delegatedFromSuperAdmin) return null;

  const handleExit = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/super-admin/exit-tenant', {});
      setAuth(res.data.user, res.data.token);
      toast.success('Kembali ke panel super admin');
      router.replace('/admin/tenants');
    } catch {
      toast.error('Gagal keluar dari mode kelola outlet');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (t) => t.zIndex.appBar + 1,
        px: { xs: 1.5, sm: 2 },
        pt: 1,
        pb: 0,
      }}
    >
      <Alert
        severity="info"
        icon={<AdminPanelSettingsIcon fontSize="inherit" />}
        action={
          <Button
            color="inherit"
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={() => void handleExit()}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {busy ? <CircularProgress size={18} color="inherit" /> : 'Kembali ke admin platform'}
          </Button>
        }
      >
        Anda masuk sebagai <strong>super admin</strong> mengelola outlet ini (sama seperti admin outlet).
      </Alert>
    </Box>
  );
}
