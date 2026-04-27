'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Switch, FormControlLabel, Fab, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCutIcon from '@mui/icons-material/EditCalendar';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { compressImage } from '@/lib/imageUtils';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';
import { getTenantUiLabels } from '@/lib/tenantLabels';

interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  photoUrl?: string | null;
}

const defaultForm = { name: '', description: '', price: '', durationMinutes: '30', photoUrl: '' };

export default function ServicesPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const ui = getTenantUiLabels(user?.tenantType);
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; editing: Service | null }>({ open: false, editing: null });
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
    loadServices();
  }, [user, isLoading]);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/services');
      setServices(res.data);
    } catch {
      toast.error('Gagal memuat layanan');
    } finally {
      setLoading(false);
    }
  }, []);

  const openAdd = () => {
    setForm(defaultForm);
    setDialog({ open: true, editing: null });
  };

  const openEdit = (svc: Service) => {
    setForm({
      name: svc.name,
      description: svc.description,
      price: String(svc.price),
      durationMinutes: String(svc.durationMinutes),
      photoUrl: svc.photoUrl || '',
    });
    setDialog({ open: true, editing: svc });
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const base64 = await compressImage(file);
      setForm((prev) => ({ ...prev, photoUrl: base64 }));
    } catch {
      toast.error('Gagal memproses foto');
    } finally {
      setPhotoUploading(false);
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Nama dan harga wajib diisi'); return; }
    setSaving(true);
    try {
      const photoPayload = form.photoUrl.trim() ? form.photoUrl : null;
      if (dialog.editing) {
        await api.patch(`/services/${dialog.editing._id}`, {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          durationMinutes: Number(form.durationMinutes),
          photoUrl: photoPayload,
        });
        toast.success('Layanan diupdate');
      } else {
        await api.post('/services', {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          durationMinutes: Number(form.durationMinutes),
          ...(photoPayload ? { photoUrl: photoPayload } : {}),
        });
        toast.success('Layanan ditambahkan');
      }
      setDialog({ open: false, editing: null });
      loadServices();
    } catch {
      toast.error('Gagal menyimpan layanan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (svc: Service) => {
    try {
      await api.patch(`/services/${svc._id}`, { isActive: !svc.isActive });
      toast.success(`Layanan ${svc.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      loadServices();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    setDeletingService(true);
    try {
      await api.delete(`/services/${serviceToDelete._id}`);
      toast.success('Layanan dihapus permanen');
      setServiceToDelete(null);
      loadServices();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus layanan');
    } finally {
      setDeletingService(false);
    }
  };

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title={`Kelola ${ui.navServices}`}
      
      right={
                    <Box className="flex items-center">
                        <IconButton color="inherit" onClick={() => { logout(); router.push('/login'); }}>
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                }
            />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <PageContainer>
          {services.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Typography color="text.secondary">Belum ada layanan</Typography>
                <Button variant="contained" startIcon={<AddIcon />} className="mt-4" onClick={openAdd}>
                  Tambah Layanan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box className="flex flex-col gap-3">
              {services.map((svc) => (
                <Card
                  key={svc._id}
                  variant="outlined"
                  sx={
                    svc.isActive
                      ? { borderColor: 'divider' }
                      : (theme) => ({
                          borderStyle: 'dashed',
                          borderColor: 'text.disabled',
                          bgcolor:
                            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.100',
                          boxShadow: 'none',
                        })
                  }
                >
                  <CardContent>
                    <Box className="flex justify-between items-start gap-2">
                      <Avatar
                        src={svc.photoUrl || undefined}
                        variant="rounded"
                        sx={{
                          width: 56,
                          height: 56,
                          flexShrink: 0,
                          bgcolor: 'primary.light',
                          ...(!svc.isActive
                            ? { filter: 'grayscale(0.6)', opacity: 0.85 }
                            : {}),
                        }}
                      >
                        {!svc.photoUrl && <ContentCutIcon />}
                      </Avatar>
                      <Box className="flex-1 min-w-0">
                        <Box className="flex items-center gap-1 flex-wrap">
                          <Typography fontWeight={500} color={svc.isActive ? 'text.primary' : 'text.secondary'}>
                            {svc.name}
                          </Typography>
                          {!svc.isActive && (
                            <Chip label="Dinonaktifkan" size="small" color="default" variant="outlined" />
                          )}
                        </Box>
                        {svc.description && (
                          <Typography
                            variant="body2"
                            color={svc.isActive ? 'text.secondary' : 'text.disabled'}
                          >
                            {svc.description}
                          </Typography>
                        )}
                        <Typography
                          color={svc.isActive ? 'primary' : 'text.disabled'}
                          fontWeight={600}
                          className="mt-1"
                        >
                          Rp {svc.price.toLocaleString('id-ID')} · {svc.durationMinutes} menit
                        </Typography>
                      </Box>
                      <Box className="flex items-center gap-1">
                        <IconButton size="small" onClick={() => openEdit(svc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setServiceToDelete(svc)}
                          aria-label="Hapus layanan"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={svc.isActive}
                          onChange={() => handleToggle(svc)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={svc.isActive ? 'Aktif' : 'Nonaktif'}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </PageContainer>
      )}

      <Fab
        color="primary"
        className="fixed bottom-20 right-4"
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
        onClick={openAdd}
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, editing: null })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>
          {dialog.editing ? 'Edit Layanan' : 'Tambah Layanan'}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4 pt-2">
          <Box className="flex flex-col items-center gap-2">
            <Box className="relative">
              <Avatar
                src={form.photoUrl || undefined}
                variant="rounded"
                sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 36 }}
              >
                {!form.photoUrl && <ContentCutIcon sx={{ fontSize: 40 }} />}
              </Avatar>
              {photoUploading && (
                <Box className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                  <CircularProgress size={28} sx={{ color: 'white' }} />
                </Box>
              )}
              {form.photoUrl && (
                <IconButton
                  size="small"
                  onClick={() => setForm((p) => ({ ...p, photoUrl: '' }))}
                  sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
                    width: 26,
                    height: 26,
                  }}
                >
                  <ClearIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhotoPick}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<PhotoCameraIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
            >
              {form.photoUrl ? 'Ganti foto layanan' : 'Foto layanan (opsional)'}
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              JPG/PNG · otomatis dikompresi
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Nama Layanan"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Deskripsi (opsional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            fullWidth
            label="Harga (Rp)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            inputProps={{ min: 0 }}
          />
          <TextField
            fullWidth
            label="Durasi (menit)"
            type="number"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            inputProps={{ min: 5, step: 5 }}
          />
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

      <Dialog open={!!serviceToDelete} onClose={() => !deletingService && setServiceToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={500}>Hapus layanan permanen?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Layanan <strong>{serviceToDelete?.name}</strong> akan dihapus dari katalog. Tindakan ini tidak dapat dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button onClick={() => setServiceToDelete(null)} variant="outlined" fullWidth disabled={deletingService}>
            Batal
          </Button>
          <Button
            onClick={() => void confirmDeleteService()}
            variant="contained"
            color="error"
            fullWidth
            disabled={deletingService}
          >
            {deletingService ? <CircularProgress size={20} color="inherit" /> : 'Hapus permanen'}
          </Button>
        </DialogActions>
      </Dialog>

      <TenantAdminBottomNav />
    </AppPageShell>
  );
}
