'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Chip, Fab, Avatar, Pagination,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StoreIcon from '@mui/icons-material/Store';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChatIcon from '@mui/icons-material/Chat';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import {
  TENANT_TYPE_OPTIONS,
  TENANT_STATUS_OPTIONS,
  type TenantType,
  type TenantLifecycleStatus,
} from '@/lib/tenantLabels';

interface Tenant {
  _id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  tenantStatus?: TenantLifecycleStatus | string;
  createdAt: string;
  tenantType?: TenantType | string;
  pendingAdminName?: string | null;
  pendingAdminPhone?: string | null;
  adminName?: string;
  adminPhone?: string;
}

const PAGE_SIZE = 20;

const STATUS_TABS: { label: string; filter?: TenantLifecycleStatus }[] = [
  { label: 'Semua' },
  { label: 'Menunggu', filter: 'menunggu_approval' },
  { label: 'Aktif', filter: 'aktif' },
  { label: 'Tidak aktif', filter: 'tidak_aktif' },
];

const defaultForm = {
  name: '', address: '', phone: '',
  adminPhone: '', adminName: '',
  tenantType: 'barbershop' as TenantType,
};

function statusChip(t: Tenant) {
  const s = (t.tenantStatus as TenantLifecycleStatus) || (t.isActive ? 'aktif' : 'tidak_aktif');
  const meta = TENANT_STATUS_OPTIONS.find((o) => o.value === s);
  return <Chip label={meta?.label ?? s} color={meta?.color ?? 'default'} size="small" />;
}

export default function AdminTenantsPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  const loadTenants = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const st = STATUS_TABS[tab].filter;
      const q = st ? `&tenantStatus=${st}` : '';
      const res = await api.get(`/admin/tenants?page=${p}&limit=${PAGE_SIZE}${q}`);
      setTenants(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);
    } catch {
      toast.error('Gagal memuat tenant');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin') { router.replace('/login'); return; }
    loadTenants(1);
  }, [user, isLoading, loadTenants]);

  const openAdd = () => {
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address || !form.phone) {
      toast.error('Nama, alamat, dan telepon wajib diisi'); return;
    }
    if (!form.adminPhone || !form.adminName) {
      toast.error('Data admin tenant wajib diisi'); return;
    }
    setSaving(true);
    try {
      await api.post('/admin/tenants', {
        name: form.name,
        address: form.address,
        phone: form.phone,
        adminPhone: form.adminPhone,
        adminName: form.adminName,
        tenantType: form.tenantType,
      });
      toast.success('Tenant berhasil ditambahkan (langsung aktif)');
      setDialogOpen(false);
      loadTenants(page);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    setDeletingTenant(true);
    try {
      await api.delete(`/admin/tenants/${tenantToDelete._id}`);
      toast.success('Tenant dihapus permanen');
      setTenantToDelete(null);
      await loadTenants(page);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus tenant');
    } finally {
      setDeletingTenant(false);
    }
  };

  return (
    <AppPageShell variant="adminFooter">
      <PageHeader
        title="Kelola Tenant"
        right={
          <Box className="flex items-center">
            <IconButton color="inherit" onClick={() => router.push('/admin/platform')} title="WhatsApp platform">
              <ChatIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => router.push('/admin/subscriptions')} title="Tagihan">
              <CreditCardIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => router.push('/admin/report')} title="Laporan">
              <BarChartIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => { logout(); router.push('/login'); }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        }
      />

      <PageContainer>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setPage(1); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {STATUS_TABS.map((t, i) => (
            <Tab key={t.label} label={t.label} value={i} />
          ))}
        </Tabs>

        <Box className="flex items-center justify-between mb-4">
          <Typography variant="h6" fontWeight={500}>
            {STATUS_TABS[tab].label}: {total} tenant
          </Typography>
        </Box>

        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : tenants.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <StoreIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="text.secondary" className="mt-2">
                {tab === 0 ? 'Belum ada tenant' : 'Tidak ada tenant pada filter ini'}
              </Typography>
              {tab === 0 && (
                <Button variant="contained" startIcon={<AddIcon />} className="mt-4" onClick={openAdd}>
                  Tambah Tenant
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
          <Box className="flex flex-col gap-3">
            {tenants.map((t) => (
              <Card
                key={t._id}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => router.push(`/admin/tenants/${t._id}`)}
              >
                <CardContent>
                  <Box className="flex items-start gap-3">
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                      <StoreIcon />
                    </Avatar>
                    <Box className="flex-1 min-w-0">
                      <Box className="flex items-center gap-2 flex-wrap">
                        <Typography fontWeight={500}>{t.name}</Typography>
                        {statusChip(t)}
                        {t.tenantType && (
                          <Chip
                            label={TENANT_TYPE_OPTIONS.find((o) => o.value === t.tenantType)?.label ?? t.tenantType}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">{t.address}</Typography>
                      <Typography variant="body2" color="text.secondary">{t.phone}</Typography>
                      {t.tenantStatus === 'menunggu_approval' && (t.pendingAdminName || t.pendingAdminPhone) && (
                        <Box className="flex flex-col gap-0.5 mt-1 p-1.5 rounded border" sx={{ bgcolor: 'rgba(237, 108, 2, 0.1)', borderColor: 'warning.light' }}>
                          <Typography variant="caption" color="warning.dark" fontWeight={600}>PIC pengajuan</Typography>
                          {t.pendingAdminName && (
                            <Typography variant="caption" color="text.secondary">{t.pendingAdminName}</Typography>
                          )}
                          {t.pendingAdminPhone && (
                            <Typography variant="caption" color="text.secondary">{t.pendingAdminPhone}</Typography>
                          )}
                        </Box>
                      )}
                      {(t.adminName || t.adminPhone) && t.tenantStatus !== 'menunggu_approval' && (
                        <Box className="flex flex-col gap-0.5 mt-1 p-1.5 rounded bg-gray-50 border border-gray-100">
                          {t.adminName && (
                            <Box className="flex items-center gap-1">
                              <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                              <Typography variant="caption" color="text.secondary">{t.adminName}</Typography>
                            </Box>
                          )}
                          {t.adminPhone && (
                            <Box className="flex items-center gap-1">
                              <PhoneIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                              <Typography variant="caption" color="text.secondary">{t.adminPhone}</Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                      <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                        Didaftarkan {new Date(t.createdAt).toLocaleDateString('id-ID')}
                      </Typography>
                    </Box>
                    <Box className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => { setTenantToDelete(t); }}
                        aria-label="Hapus tenant permanen"
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => router.push(`/admin/tenants/${t._id}`)} aria-label="Detail">
                        <ChevronRightIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
          {totalPages > 1 && (
            <Box className="flex justify-center mt-4">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => loadTenants(v)}
                color="primary"
                size="small"
              />
            </Box>
          )}
          </>
        )}
      </PageContainer>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 16 }}
        onClick={openAdd}
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>Tambah Tenant Baru (langsung aktif)</DialogTitle>
        <DialogContent className="flex flex-col gap-3 pt-2">
          <TextField
            fullWidth label="Nama Tenant" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth label="Alamat" multiline rows={2} value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <TextField
            fullWidth label="Telepon Outlet" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            inputMode="tel"
          />
          <FormControl fullWidth sx={{ mt: 0.5 }}>
            <InputLabel id="tenant-type-label">Jenis bisnis</InputLabel>
            <Select
              labelId="tenant-type-label"
              label="Jenis bisnis"
              value={form.tenantType}
              onChange={(e) => setForm({ ...form, tenantType: e.target.value as TenantType })}
            >
              {TENANT_TYPE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="subtitle2" color="text.secondary" className="mt-2">
            Data Admin Tenant
          </Typography>
          <TextField
            fullWidth label="Nama Admin" value={form.adminName}
            onChange={(e) => setForm({ ...form, adminName: e.target.value })}
          />
          <TextField
            fullWidth label="No. HP Admin (WA)" value={form.adminPhone}
            onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
            inputMode="tel"
          />
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDialogOpen(false)} variant="outlined" fullWidth>
            Batal
          </Button>
          <Button onClick={() => void handleSave()} variant="contained" fullWidth disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!tenantToDelete} onClose={() => !deletingTenant && setTenantToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={500}>Hapus tenant permanen?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Outlet <strong>{tenantToDelete?.name}</strong> beserta semua data outlet ini akan dihapus dari database: booking, pembayaran, pelanggan, staff, layanan, tagihan, pengingat, dan sejenisnya. Tindakan ini tidak dapat dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button onClick={() => setTenantToDelete(null)} variant="outlined" fullWidth disabled={deletingTenant}>
            Batal
          </Button>
          <Button
            onClick={() => void handleConfirmDeleteTenant()}
            variant="contained"
            color="error"
            fullWidth
            disabled={deletingTenant}
          >
            {deletingTenant ? <CircularProgress size={20} color="inherit" /> : 'Hapus permanen'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppPageShell>
  );
}
