'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export type SwitchableTenantRow = {
  tenantId: string;
  name: string;
  tenantType?: string;
  role: string;
  current: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  tenant_admin: 'Admin outlet',
  staff: 'Staff',
  customer: 'Pelanggan',
};

type Props = {
  /** Dipanggil setelah token & outlet aktif berganti */
  onSwitched?: () => void;
  /**
   * Untuk halaman staff: ikon selalu tampil jika ada minimal satu outlet di daftar,
   * agar bisa membuka dialog meski hanya satu salon (mis. melihat status aktif).
   */
  alwaysShowIcon?: boolean;
};

export default function SwitchOutletControl({ onSwitched, alwaysShowIcon }: Props) {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [rows, setRows] = useState<SwitchableTenantRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const u = useAuthStore.getState().user;
    if (!u || u.role === 'super_admin') {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoadingList(true);
    api
      .get<SwitchableTenantRow[]>('/auth/my-switchable-tenants')
      .then((res) => {
        if (!cancelled) setRows(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.tenantId, user?.role]);

  const showIcon =
    user &&
    user.role !== 'super_admin' &&
    rows.length > 0 &&
    (alwaysShowIcon ||
      rows.length > 1 ||
      (rows.length === 1 && !rows[0].current));

  const handleOpen = () => {
    setOpen(true);
    const u = useAuthStore.getState().user;
    if (!u || u.role === 'super_admin') return;
    setLoadingList(true);
    api
      .get<SwitchableTenantRow[]>('/auth/my-switchable-tenants')
      .then((res) => setRows(res.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoadingList(false));
  };

  const handlePick = async (tenantId: string) => {
    const name = rows.find((r) => r.tenantId === tenantId)?.name;
    setBusyId(tenantId);
    try {
      const res = await api.post('/auth/switch-tenant', { tenantId });
      setAuth(res.data.user, res.data.token);
      toast.success(name ? `Outlet aktif: ${name}` : 'Outlet diperbarui');
      setOpen(false);
      onSwitched?.();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Gagal ganti outlet',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!showIcon) return null;

  const roleHint = ROLE_LABEL[user!.role] ?? user!.role;

  return (
    <>
      <Tooltip title="Ganti outlet">
        <IconButton color="inherit" size="small" onClick={handleOpen} aria-label="Ganti outlet">
          <StorefrontIcon />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => !busyId && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorefrontIcon color="primary" />
          Pilih outlet aktif
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Akun Anda dengan peran <strong>{roleHint}</strong> terhubung ke beberapa outlet. Pilih outlet yang ingin
            digunakan sekarang:
          </Typography>
          {loadingList && rows.length === 0 && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={28} />
            </Box>
          )}
          <List disablePadding>
            {rows.map((r) => (
              <ListItemButton
                key={r.tenantId}
                selected={r.current}
                disabled={!!busyId || r.current}
                onClick={() => void handlePick(r.tenantId)}
                sx={{ borderRadius: 2, mb: 1, border: '1px solid', borderColor: 'divider' }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <span>{r.name}</span>
                      <Chip label={ROLE_LABEL[r.role] ?? r.role} size="small" variant="outlined" />
                      {r.current ? (
                        <Chip label="Aktif" size="small" color="primary" />
                      ) : null}
                    </Box>
                  }
                />
                {busyId === r.tenantId ? <CircularProgress size={20} sx={{ ml: 1 }} /> : null}
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
