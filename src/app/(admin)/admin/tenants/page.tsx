'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Chip, Fab, Avatar, Switch, FormControlLabel, Pagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import StoreIcon from '@mui/icons-material/Store';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';

interface Tenant {
  _id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  adminName?: string;
  adminPhone?: string;
}

const PAGE_SIZE = 20;

const defaultForm = {
  name: '', address: '', phone: '',
  adminPhone: '', adminName: '',
};

export default function AdminTenantsPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; editing: Tenant | null }>({ open: false, editing: null });
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin') { router.replace('/login'); return; }
    loadTenants();
  }, [user, isLoading]);

  const loadTenants = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/tenants?page=${p}&limit=${PAGE_SIZE}`);
      setTenants(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);
    } catch {
      toast.error('Gagal memuat tenant');
    } finally {
      setLoading(false);
    }
  }, []);

  const openAdd = () => {
    setForm(defaultForm);
    setDialog({ open: true, editing: null });
  };

  const openEdit = (t: Tenant) => {
    setForm({ name: t.name, address: t.address, phone: t.phone, adminPhone: '', adminName: '' });
    setDialog({ open: true, editing: t });
  };

  const handleSave = async () => {
    if (!form.name || !form.address || !form.phone) {
      toast.error('Nama, alamat, dan telepon wajib diisi'); return;
    }
    if (!dialog.editing && (!form.adminPhone || !form.adminName)) {
      toast.error('Data admin tenant wajib diisi'); return;
    }
    setSaving(true);
    try {
      if (dialog.editing) {
        await api.patch(`/admin/tenants/${dialog.editing._id}`, {
          name: form.name,
          address: form.address,
          phone: form.phone,
        });
        toast.success('Tenant diupdate');
      } else {
        await api.post('/admin/tenants', form);
        toast.success('Tenant berhasil ditambahkan');
      }
      setDialog({ open: false, editing: null });
      loadTenants(page);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: Tenant) => {
    try {
      await api.patch(`/admin/tenants/${t._id}`, { isActive: !t.isActive });
      toast.success(`${t.name} ${t.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      loadTenants(page);
    } catch {
      toast.error('Gagal update status');
    }
  };

  return (
    <AppPageShell variant="adminFooter">
      <PageHeader
        title="Kelola Tenant"
        right={
          <Box className="flex items-center">
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
        <Box className="flex items-center justify-between mb-4">
          <Typography variant="h6" fontWeight={500}>
            Total: {total} Tenants
          </Typography>
        </Box>

        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : tenants.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <StoreIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="text.secondary" className="mt-2">
                Belum ada tenant terdaftar
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} className="mt-4" onClick={openAdd}>
                Tambah Tenant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
          <Box className="flex flex-col gap-3">
            {tenants.map((t) => (
              <Card key={t._id} className={t.isActive ? '' : 'opacity-60'}>
                <CardContent>
                  <Box className="flex items-start gap-3">
                    <Avatar sx={{ bgcolor: t.isActive ? 'primary.main' : 'grey.400', width: 48, height: 48 }}>
                      <StoreIcon />
                    </Avatar>
                    <Box className="flex-1">
                      <Box className="flex items-center gap-2">
                        <Typography fontWeight={500}>{t.name}</Typography>
                        <Chip
                          label={t.isActive ? 'Aktif' : 'Nonaktif'}
                          color={t.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">{t.address}</Typography>
                      <Typography variant="body2" color="text.secondary">{t.phone}</Typography>
                      {(t.adminName || t.adminPhone) && (
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
                      <Typography variant="caption" color="text.disabled">
                        Didaftarkan {new Date(t.createdAt).toLocaleDateString('id-ID')}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => openEdit(t)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <FormControlLabel
                    className="mt-1"
                    control={
                      <Switch
                        checked={t.isActive}
                        onChange={() => handleToggle(t)}
                        color="primary"
                        size="small"
                      />
                    }
                    label={t.isActive ? 'Aktif' : 'Nonaktif'}
                  />
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

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, editing: null })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>
          {dialog.editing ? 'Edit Tenant' : 'Tambah Tenant Baru'}
        </DialogTitle>
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
          {!dialog.editing && (
            <>
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
            </>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDialog({ open: false, editing: null })} variant="outlined" fullWidth>
            Batal
          </Button>
          <Button onClick={handleSave} variant="contained" fullWidth disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppPageShell>
  );
}
