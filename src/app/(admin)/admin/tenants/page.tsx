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
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';

interface Tenant {
  _id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

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
      toast.error('Data admin barbershop wajib diisi'); return;
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
    <Box className="min-h-screen bg-gray-50 pb-8">
      <PageHeader
        title="Kelola Barbershop"
        right={
          <IconButton
            color="inherit"
            onClick={() => { logout(); router.push('/login'); }}
          >
            <LogoutIcon />
          </IconButton>
        }
      />

      <Box className="p-4 max-w-lg mx-auto">
        <Box className="flex items-center justify-between mb-4">
          <Typography variant="h6" fontWeight={700}>
            Total: {total} Barbershop
          </Typography>
        </Box>

        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : tenants.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <StoreIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="text.secondary" className="mt-2">
                Belum ada barbershop terdaftar
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} className="mt-4" onClick={openAdd}>
                Tambah Barbershop
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
                        <Typography fontWeight={700}>{t.name}</Typography>
                        <Chip
                          label={t.isActive ? 'Aktif' : 'Nonaktif'}
                          color={t.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">{t.address}</Typography>
                      <Typography variant="body2" color="text.secondary">{t.phone}</Typography>
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
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 16 }}
        onClick={openAdd}
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, editing: null })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700}>
          {dialog.editing ? 'Edit Barbershop' : 'Tambah Barbershop Baru'}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-3 pt-2">
          <TextField
            fullWidth label="Nama Barbershop" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth label="Alamat" multiline rows={2} value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <TextField
            fullWidth label="Telepon Barbershop" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            inputMode="tel"
          />
          {!dialog.editing && (
            <>
              <Typography variant="subtitle2" color="text.secondary" className="mt-2">
                Data Admin Barbershop
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
    </Box>
  );
}
