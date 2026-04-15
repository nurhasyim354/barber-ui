'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, TextField,
  Button, InputAdornment, CircularProgress,
  Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import StorefrontIcon from '@mui/icons-material/Storefront';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, user, loadFromStorage } = useAuthStore();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pendingAuth, setPendingAuth] = useState<{ token: string; user: object } | null>(null);
  const [tenantOptions, setTenantOptions] = useState<{ _id: string; name: string }[]>([]);
  const [switchingTenant, setSwitchingTenant] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') router.replace('/admin/tenants');
      else if (user.role === 'tenant_admin') router.replace('/dashboard');
      else if (user.role === 'barber') router.replace('/barber');
      else router.replace('/booking');
    }
  }, [user, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) { toast.error('Masukkan nomor HP yang valid'); return; }
    if (isNewUser && !name.trim()) { toast.error('Masukkan nama Anda'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone, name: name || undefined });
      toast.success(res.data.message);
      if (res.data.devOtp) toast(`🔐 Dev OTP: ${res.data.devOtp}`, { duration: 15000 });
      setStep('otp');
      setCountdown(60);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('Nama wajib')) {
        setIsNewUser(true);
        toast('Masukkan nama Anda untuk daftar', { icon: '👤' });
      } else {
        toast.error(msg || 'Gagal mengirim OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Kode OTP harus 6 angka'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp });
      if (res.data.allTenants && res.data.allTenants.length > 1) {
        // Simpan sementara, tunjukkan dialog pilih salon
        setPendingAuth({ token: res.data.token, user: res.data.user });
        setTenantOptions(res.data.allTenants);
      } else {
        setAuth(res.data.user, res.data.token);
        toast.success(`Selamat datang, ${res.data.user.name}!`);
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'OTP salah');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = async (tenantId: string) => {
    if (!pendingAuth) return;
    setSwitchingTenant(true);
    try {
      // Login dulu dengan token sementara, lalu switch ke tenant yang dipilih
      setAuth(pendingAuth.user, pendingAuth.token);
      const res = await api.post(
        '/auth/switch-customer-tenant',
        { tenantId },
        { headers: { Authorization: `Bearer ${pendingAuth.token}` } },
      );
      setAuth(res.data.user, res.data.token);
      toast.success(`Selamat datang! Salon aktif: ${tenantOptions.find((t) => t._id === tenantId)?.name}`);
      setTenantOptions([]);
      setPendingAuth(null);
    } catch {
      toast.error('Gagal memilih salon');
    } finally {
      setSwitchingTenant(false);
    }
  };

  return (
    <Box className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-white">
      <Box className="mb-8 text-center">
        <Box className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <ContentCutIcon sx={{ fontSize: 44, color: 'white' }} />
        </Box>
        <Typography variant="h4" color="primary" fontWeight={800}>
          Barbershop
        </Typography>
        <Typography variant="body1" color="text.secondary" className="mt-1">
          Masuk untuk melanjutkan
        </Typography>
      </Box>

      {/* Dialog pilih salon untuk customer multi-tenant */}
      <Dialog open={tenantOptions.length > 1} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorefrontIcon color="primary" />
          Pilih Barbershop
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nomor Anda terdaftar di beberapa barbershop. Pilih barbershop yang ingin Anda kunjungi:
          </Typography>
          <List disablePadding>
            {tenantOptions.map((t) => (
              <ListItemButton
                key={t._id}
                onClick={() => handleSelectTenant(t._id)}
                disabled={switchingTenant}
                sx={{ borderRadius: 2, mb: 1, border: '1px solid', borderColor: 'divider' }}
              >
                <ListItemText primary={t.name} />
                {switchingTenant && <CircularProgress size={18} />}
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-sm shadow-xl">
        <CardContent className="p-6">
          {step === 'phone' ? (
            <>
              <Typography variant="h6" className="mb-6 text-center">
                {isNewUser ? 'Daftar Akun Baru' : 'Masuk dengan WhatsApp'}
              </Typography>

              {isNewUser && (
                <TextField
                  fullWidth
                  label="Nama Lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mb-4"
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">👤</InputAdornment>
                    ),
                  }}
                />
              )}

              <TextField
                fullWidth
                label="Nomor HP"
                placeholder="08xx xxxx xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="tel"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSendOtp}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Kirim Kode via WA'}
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h6" className="mb-2 text-center">
                Masukkan Kode OTP
              </Typography>
              <Typography variant="body2" color="text.secondary" className="mb-6 text-center">
                Kode 6 digit telah dikirim ke WA {phone}
              </Typography>

              <TextField
                fullWidth
                label="Kode OTP"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: 28, letterSpacing: 8 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleVerifyOtp}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Verifikasi'}
              </Button>

              <Button
                fullWidth
                variant="text"
                disabled={countdown > 0}
                onClick={() => { setStep('phone'); setOtp(''); }}
              >
                {countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Ganti nomor / Kirim ulang'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
