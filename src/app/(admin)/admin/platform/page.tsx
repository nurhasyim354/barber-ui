'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Switch,
  FormControlLabel,
  Alert,
  TextField,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import QrCodeIcon from '@mui/icons-material/QrCode';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';

interface PlatformSnapshot {
  waMessagingEnabled: boolean;
  superAdminNotificationPhone: string | null;
  subscriptionPaymentBankName: string | null;
  subscriptionPaymentBankAccount: string | null;
  subscriptionPaymentAccountHolder: string | null;
  subscriptionPaymentQrisImageBase64: string | null;
}

export default function AdminPlatformPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const qrisInputRef = useRef<HTMLInputElement>(null);

  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [waMessagingEnabled, setWaMessagingEnabled] = useState(true);
  const [superAdminPhone, setSuperAdminPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [qrisImage, setQrisImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingWa, setSavingWa] = useState(false);
  const [savingRest, setSavingRest] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const applySnapshot = useCallback((d: PlatformSnapshot) => {
    setSnapshot(d);
    setWaMessagingEnabled(!!d.waMessagingEnabled);
    setSuperAdminPhone(d.superAdminNotificationPhone || '');
    setBankName(d.subscriptionPaymentBankName || '');
    setBankAccount(d.subscriptionPaymentBankAccount || '');
    setAccountHolder(d.subscriptionPaymentAccountHolder || '');
    setQrisImage(d.subscriptionPaymentQrisImageBase64 || null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/platform-settings');
      applySnapshot(res.data as PlatformSnapshot);
    } catch {
      toast.error('Gagal memuat pengaturan platform');
    } finally {
      setLoading(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'super_admin') {
      router.replace(user.delegatedFromSuperAdmin ? '/dashboard' : '/login');
      return;
    }
    void load();
  }, [user, isLoading, load, router]);

  const handleChangeWa = async (enabled: boolean) => {
    setSavingWa(true);
    try {
      const res = await api.patch('/admin/platform-settings', { waMessagingEnabled: enabled });
      applySnapshot(res.data as PlatformSnapshot);
      toast.success(enabled ? 'WhatsApp diaktifkan' : 'WhatsApp dinonaktifkan');
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setSavingWa(false);
    }
  };

  const handleSaveNotifyAndPayment = async () => {
    setSavingRest(true);
    try {
      const body: Record<string, unknown> = {
        superAdminNotificationPhone: superAdminPhone.trim() || null,
        subscriptionPaymentBankName: bankName.trim() || null,
        subscriptionPaymentBankAccount: bankAccount.trim() || null,
        subscriptionPaymentAccountHolder: accountHolder.trim() || null,
      };
      if (qrisImage === '') {
        body.subscriptionPaymentQrisImageBase64 = null;
      } else if (qrisImage && qrisImage.startsWith('data:image/')) {
        body.subscriptionPaymentQrisImageBase64 = qrisImage;
      }
      const res = await api.patch('/admin/platform-settings', body);
      applySnapshot(res.data as PlatformSnapshot);
      toast.success('Pengaturan disimpan');
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setSavingRest(false);
    }
  };

  const onPickQris: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Pilih file gambar');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Gambar terlalu besar (maks. ~1,5 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result || '');
      if (r.startsWith('data:image/')) setQrisImage(r);
    };
    reader.readAsDataURL(file);
  };

  const approxKb = qrisImage
    ? Math.round((qrisImage.length * 0.75) / 1024)
    : 0;

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
          <Box className="flex justify-center mt-12">
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Box className="flex items-center gap-2 mb-2">
                  <ChatIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    WhatsApp (OTP & pengingat)
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Matikan jika gateway WA sedang maintenance atau untuk menghentikan semua pesan keluar (OTP login,
                  pengingat). Saat nonaktif, OTP login tetap bisa lewat <code>devOtp</code> di respons API.
                </Typography>
                <Alert severity={waMessagingEnabled ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  {waMessagingEnabled
                    ? 'Pesan WhatsApp dikirim seperti biasa (jika WA_API_KEY terisi dan WA_DEV_MODE bukan true).'
                    : 'Tidak ada pesan yang dikirim ke gateway.'}
                </Alert>
                <FormControlLabel
                  control={
                    <Switch
                      checked={waMessagingEnabled}
                      onChange={(_, v) => void handleChangeWa(v)}
                      disabled={savingWa}
                      color="primary"
                    />
                  }
                  label={waMessagingEnabled ? 'WhatsApp aktif' : 'WhatsApp dinonaktifkan'}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box className="flex items-center gap-2 mb-2">
                  <NotificationsActiveIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Notifikasi pendaftaran tenant
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Nomor WhatsApp yang menerima pesan otomatis setiap ada pengajuan tenant baru dari halaman daftar
                  (menggunakan gateway WA yang sama).
                </Typography>
                <TextField
                  fullWidth
                  label="Nomor WA super admin"
                  value={superAdminPhone}
                  onChange={(e) => setSuperAdminPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  sx={{ mb: 2 }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box className="flex items-center gap-2 mb-2">
                  <AccountBalanceIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Pembayaran langganan (tenant)
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ditampilkan di halaman Langganan untuk admin tenant: transfer bank dan QRIS platform.
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Nama bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Mis. BCA, BRI"
                  />
                  <TextField
                    fullWidth
                    label="Nomor rekening"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Atas nama rekening"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                  />
                </Stack>

                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 3, mb: 1 }} className="flex items-center gap-1">
                  <QrCodeIcon fontSize="small" color="primary" />
                  Gambar QRIS
                </Typography>
                <input ref={qrisInputRef} type="file" accept="image/*" className="hidden" onChange={onPickQris} />
                {qrisImage ? (
                  <Box>
                    <Box className="flex items-center gap-2 mb-2">
                      <Chip label={`~${approxKb} KB`} size="small" variant="outlined" />
                      <Button size="small" onClick={() => setQrisImage('')}>
                        Hapus gambar
                      </Button>
                    </Box>
                    <Box className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrisImage}
                        alt="QRIS"
                        className="max-w-[200px] rounded border border-gray-200"
                      />
                    </Box>
                  </Box>
                ) : (
                  <Button variant="outlined" size="small" onClick={() => qrisInputRef.current?.click()}>
                    Unggah QRIS
                  </Button>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={() => void handleSaveNotifyAndPayment()}
                  disabled={savingRest}
                >
                  {savingRest ? 'Menyimpan…' : 'Simpan notifikasi & instruksi pembayaran'}
                </Button>
              </CardContent>
            </Card>

            {snapshot && (
              <Typography variant="caption" color="text.disabled" display="block" sx={{ px: 1 }}>
                Terakhir dimuat dari server. Pastikan variabel lingkungan WA_API_KEY dan WA_API_URL sudah benar di server
                API.
              </Typography>
            )}
          </Stack>
        )}
      </PageContainer>
    </AppPageShell>
  );
}
