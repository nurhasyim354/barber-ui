'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Chip, Switch, FormControlLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';

interface Plan {
  _id: string;
  name: string;
  displayName: string;
  minTransactions: number;
  maxTransactions: number | null;
  pricePerMonth: number;
  isActive: boolean;
}

export default function SubscriptionPlansPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });
  const [form, setForm] = useState({
    displayName: '', minTransactions: 0, maxTransactions: '', pricePerMonth: 0, isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin') { router.replace('/login'); return; }
    loadPlans();
  }, [user, isLoading]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscription/plans');
      setPlans(res.data);
    } catch {
      toast.error('Gagal memuat paket');
    } finally {
      setLoading(false);
    }
  }, []);

  const openEdit = (p: Plan) => {
    setForm({
      displayName: p.displayName,
      minTransactions: p.minTransactions,
      maxTransactions: p.maxTransactions == null ? '' : String(p.maxTransactions),
      pricePerMonth: p.pricePerMonth,
      isActive: p.isActive,
    });
    setDialog({ open: true, plan: p });
  };

  const handleSave = async () => {
    if (!dialog.plan) return;
    if (!form.displayName.trim()) { toast.error('Nama paket wajib diisi'); return; }
    setSaving(true);
    try {
      await api.patch(`/admin/subscription/plans/${dialog.plan._id}`, {
        displayName: form.displayName.trim(),
        minTransactions: Number(form.minTransactions),
        maxTransactions: form.maxTransactions === '' ? null : Number(form.maxTransactions),
        pricePerMonth: Number(form.pricePerMonth),
        isActive: form.isActive,
      });
      toast.success('Paket berhasil diupdate');
      setDialog({ open: false, plan: null });
      loadPlans();
    } catch {
      toast.error('Gagal menyimpan paket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPageShell variant="adminFooter">
      <PageHeader
        title="Konfigurasi Paket"
        back
        right={
          <IconButton color="inherit" onClick={() => { logout(); router.push('/login'); }}>
            <LogoutIcon />
          </IconButton>
        }
      />

      <PageContainer>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Atur harga dan batas transaksi untuk setiap paket berlangganan.
          Perubahan akan diterapkan saat penghitungan tagihan berikutnya.
        </Typography>

        {loading ? (
          <Box className="flex justify-center mt-8"><CircularProgress /></Box>
        ) : (
          <Box className="flex flex-col gap-3">
            {plans.map((p) => (
              <Card key={p._id} className={p.isActive ? '' : 'opacity-60'}>
                <CardContent>
                  <Box className="flex items-start justify-between">
                    <Box>
                      <Box className="flex items-center gap-2 mb-1">
                        <Typography variant="h6" fontWeight={500}>{p.displayName}</Typography>
                        <Chip
                          label={p.isActive ? 'Aktif' : 'Nonaktif'}
                          color={p.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Transaksi:</strong>{' '}
                        {p.minTransactions}
                        {p.maxTransactions != null ? ` – ${p.maxTransactions}` : '+'} /bulan
                      </Typography>
                      <Typography variant="body2" color={p.pricePerMonth === 0 ? 'success.main' : 'primary.main'} fontWeight={500}>
                        {p.pricePerMonth === 0 ? 'Gratis' : `Rp ${p.pricePerMonth.toLocaleString('id-ID')} / bulan`}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </PageContainer>

      {/* Edit Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, plan: null })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>
          Edit Paket — {dialog.plan?.name}
        </DialogTitle>
        <DialogContent>
          <Box className="flex flex-col gap-3 pt-2">
            <TextField
              fullWidth label="Nama Tampilan *" value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
            <TextField
              fullWidth label="Min. Transaksi *" type="number"
              value={form.minTransactions}
              onChange={(e) => setForm({ ...form, minTransactions: Number(e.target.value) })}
              helperText="Jumlah transaksi minimum agar paket ini berlaku"
            />
            <TextField
              fullWidth label="Maks. Transaksi (kosongkan = tidak terbatas)"
              type="number" value={form.maxTransactions}
              onChange={(e) => setForm({ ...form, maxTransactions: e.target.value })}
            />
            <TextField
              fullWidth label="Harga / Bulan (Rp) *" type="number"
              value={form.pricePerMonth}
              onChange={(e) => setForm({ ...form, pricePerMonth: Number(e.target.value) })}
              helperText="Isi 0 untuk paket gratis"
            />
            <FormControlLabel
              control={
                <Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              }
              label="Aktif"
            />
          </Box>
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button fullWidth variant="outlined" onClick={() => setDialog({ open: false, plan: null })}>Batal</Button>
          <Button fullWidth variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppPageShell>
  );
}
