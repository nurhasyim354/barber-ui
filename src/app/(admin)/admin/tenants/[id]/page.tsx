'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, TextField, Button, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Alert, Divider,
  FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import {
  TENANT_TYPE_OPTIONS,
  TENANT_STATUS_OPTIONS,
  type TenantType,
  type TenantLifecycleStatus,
} from '@/lib/tenantLabels';

interface TenantDetail {
  _id: string;
  name: string;
  address: string;
  phone: string;
  tenantType?: TenantType | string;
  tenantStatus?: TenantLifecycleStatus | string;
  isActive: boolean;
  pendingAdminPhone?: string | null;
  pendingAdminName?: string | null;
  registrationNote?: string | null;
  resolvedStatus: TenantLifecycleStatus;
  serviceCount: number;
  adminName?: string;
  adminPhone?: string;
  waMessagingEnabled?: boolean | null;
}

export default function AdminTenantDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, isLoading, loadFromStorage, setAuth } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [enteringTenant, setEnteringTenant] = useState(false);
  const [row, setRow] = useState<TenantDetail | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    tenantType: 'barbershop' as TenantType,
    tenantStatus: 'aktif' as TenantLifecycleStatus,
    pendingAdminPhone: '',
    pendingAdminName: '',
    registrationNote: '',
    waMessagingEnabled: true,
  });

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin') { router.replace(user.delegatedFromSuperAdmin ? '/dashboard' : '/login'); return; }
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/tenants/${id}`);
      const t: TenantDetail = res.data;
      setRow(t);
      setForm({
        name: t.name,
        address: t.address,
        phone: t.phone,
        tenantType: (t.tenantType as TenantType) || 'barbershop',
        tenantStatus: (t.tenantStatus as TenantLifecycleStatus) || t.resolvedStatus || 'aktif',
        pendingAdminPhone: t.pendingAdminPhone || '',
        pendingAdminName: t.pendingAdminName || '',
        registrationNote: t.registrationNote || '',
        waMessagingEnabled: t.waMessagingEnabled !== false,
      });
    } catch {
      toast.error('Gagal memuat tenant');
      router.push('/admin/tenants');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.phone.trim()) {
      toast.error('Nama, alamat, dan telepon wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/tenants/${id}`, {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        tenantType: form.tenantType,
        tenantStatus: form.tenantStatus,
        pendingAdminPhone: form.pendingAdminPhone.trim() || null,
        pendingAdminName: form.pendingAdminName.trim() || null,
        registrationNote: form.registrationNote.trim() || null,
        waMessagingEnabled: form.waMessagingEnabled,
      });
      toast.success('Tenant diperbarui');
      await load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTenant = async () => {
    setRemoving(true);
    try {
      await api.delete(`/admin/tenants/${id}`);
      toast.success('Tenant dihapus permanen');
      setRemoveDialogOpen(false);
      router.replace('/admin/tenants');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus tenant');
    } finally {
      setRemoving(false);
    }
  };

  const handleEnterAsTenantAdmin = async () => {
    setEnteringTenant(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/super-admin/enter-tenant', { tenantId: id });
      setAuth(res.data.user, res.data.token);
      toast.success(`Membuka dashboard: ${row?.name ?? 'outlet'}`);
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal membuka outlet');
    } finally {
      setEnteringTenant(false);
    }
  };

  if (loading || !row) {
    return (
      <AppPageShell variant="adminFooter">
        <PageHeader title="Detail tenant" back backHref="/admin/tenants" />
        <Box className="flex justify-center mt-16"><CircularProgress /></Box>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell variant="adminFooter">
      <PageHeader title={row.name} back backHref="/admin/tenants" />
      <PageContainer>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Ringkasan
            </Typography>
            <Typography variant="body2">
              Status: <strong>{TENANT_STATUS_OPTIONS.find((o) => o.value === row.resolvedStatus)?.label ?? row.resolvedStatus}</strong>
              {' · '}
              Layanan terdaftar: <strong>{row.serviceCount}</strong>
            </Typography>
            {(row.adminName || row.adminPhone) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Admin terhubung: {row.adminName ?? '—'} {row.adminPhone ? `· ${row.adminPhone}` : ''}
              </Typography>
            )}
          </CardContent>
        </Card>

        {row.resolvedStatus === 'menunggu_approval' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Setujui dengan mengubah status ke <strong>Aktif</strong>. Pastikan nomor WA PIC benar — akun tenant_admin akan dibuat
            dan layanan default di-seed otomatis.
          </Alert>
        )}

        <Button
          variant="outlined"
          color="primary"
          fullWidth
          sx={{ mb: 2 }}
          disabled={enteringTenant}
          onClick={() => void handleEnterAsTenantAdmin()}
        >
          {enteringTenant ? <CircularProgress size={22} /> : 'Kelola fitur outlet (seperti admin outlet)'}
        </Button>

        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" fontWeight={600}>Data & status</Typography>
            <TextField label="Nama outlet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
            <TextField label="Alamat" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth multiline minRows={2} required />
            <TextField label="Telepon outlet" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth required inputMode="tel" />

            <FormControl fullWidth>
              <InputLabel>Jenis bisnis</InputLabel>
              <Select
                label="Jenis bisnis"
                value={form.tenantType}
                onChange={(e) => setForm({ ...form, tenantType: e.target.value as TenantType })}
              >
                {TENANT_TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={(
                <Switch
                  checked={form.waMessagingEnabled}
                  onChange={(e) => setForm({ ...form, waMessagingEnabled: e.target.checked })}
                />
              )}
              label="WhatsApp untuk outlet ini (OTP pelanggan, pengingat)"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -1 }}>
              Jika platform mematikan WA secara global, pesan tetap tidak terkirim. Nonaktifkan di sini hanya untuk outlet ini.
            </Typography>

            <Divider />

            <FormControl fullWidth>
              <InputLabel>Status tenant</InputLabel>
              <Select
                label="Status tenant"
                value={form.tenantStatus}
                onChange={(e) => setForm({ ...form, tenantStatus: e.target.value as TenantLifecycleStatus })}
              >
                {TENANT_STATUS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2" color="text.secondary">PIC / admin (penting saat menyetujui)</Typography>
            <TextField
              label="Nama PIC"
              value={form.pendingAdminName}
              onChange={(e) => setForm({ ...form, pendingAdminName: e.target.value })}
              fullWidth
              helperText="Digunakan saat status pertama kali diubah ke Aktif dari Menunggu persetujuan"
            />
            <TextField
              label="Nomor WA PIC"
              value={form.pendingAdminPhone}
              onChange={(e) => setForm({ ...form, pendingAdminPhone: e.target.value.replace(/\D/g, '') })}
              fullWidth
              inputMode="tel"
            />

            <TextField
              label="Catatan pendaftaran"
              value={form.registrationNote}
              onChange={(e) => setForm({ ...form, registrationNote: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              disabled={row.resolvedStatus !== 'menunggu_approval'}
              helperText={row.resolvedStatus !== 'menunggu_approval' ? 'Hanya baca dari pengajuan awal' : undefined}
            />

            <Button variant="contained" size="large" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <CircularProgress size={22} color="inherit" /> : 'Simpan perubahan'}
            </Button>

            <Divider sx={{ my: 1 }} />
            <Button
              variant="outlined"
              color="error"
              onClick={() => setRemoveDialogOpen(true)}
            >
              Hapus tenant permanen
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Menghapus outlet beserta semua data terkait di database. Tidak dapat dikembalikan.
            </Typography>
          </CardContent>
        </Card>
      </PageContainer>

      <Dialog open={removeDialogOpen} onClose={() => !removing && setRemoveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={500}>Hapus tenant permanen?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Semua data outlet <strong>{row.name}</strong> akan dihapus dari database. Tindakan ini tidak dapat dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button onClick={() => setRemoveDialogOpen(false)} variant="outlined" fullWidth disabled={removing}>
            Batal
          </Button>
          <Button
            onClick={() => void handleRemoveTenant()}
            variant="contained"
            color="error"
            fullWidth
            disabled={removing}
          >
            {removing ? <CircularProgress size={20} color="inherit" /> : 'Hapus permanen'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppPageShell>
  );
}
