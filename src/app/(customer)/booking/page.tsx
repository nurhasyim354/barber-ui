'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Avatar, Divider, LinearProgress, Checkbox,
  InputAdornment,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import StarIcon from '@mui/icons-material/Star';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { CustomerBottomNav } from '@/components/layout/BottomNav';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantInfo { _id: string; name: string; address: string; }

interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
}

// Shape matches BarberQueueInfo returned by GET /tenants/:id/barbers/queue
interface Barber {
  barberId: string;
  barberName: string;
  photoUrl: string | null;
  rating: number;
  totalReviews: number;
  queueCount: number;
  estimatedWaitMinutes: number;
}

interface ActiveBooking {
  _id: string;
  serviceName: string;
  barberName?: string;
  queueNumber: number;
  status: string;
  date: string;
}

interface BookingResult {
  _id: string;
  queueNumber: number;
  serviceName: string;
  barberName: string | null;
  servicePrice: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const waitLabel = (m: number) => {
  if (m === 0) return 'Langsung dilayani';
  if (m < 60) return `~${m} menit`;
  const h = Math.floor(m / 60), rem = m % 60;
  return rem > 0 ? `~${h} jam ${rem} menit` : `~${h} jam`;
};
const waitColor = (m: number): 'success' | 'warning' | 'error' =>
  m === 0 ? 'success' : m <= 15 ? 'warning' : 'error';
const statusColor = (s: string) =>
  s === 'waiting' ? 'warning' : s === 'in_progress' ? 'info' : s === 'done' ? 'success' : 'default';
const statusLabel = (s: string) =>
  s === 'waiting' ? 'Menunggu' : s === 'in_progress' ? 'Sedang dilayani' : s === 'done' ? 'Selesai' : s;

// ── Main content ──────────────────────────────────────────────────────────────

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tenantIdParam = searchParams.get('tenantId');
  const customerPhoneParam = searchParams.get('customerPhone');
  const isQrFlow = !!(tenantIdParam && searchParams.get('type') === 'booking');

  const { user, isLoading: authLoading, loadFromStorage, setAuth } = useAuthStore();

  // Effective tenant ID: URL param wins over user profile
  const effectiveTenantId = tenantIdParam ?? user?.tenantId ?? null;

  // ── State: tenant meta ─────────────────────────────────────────────────────
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  // ── State: QR registration ─────────────────────────────────────────────────
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(customerPhoneParam ?? '');
  const [otpCode, setOtpCode] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // ── State: booking flow ────────────────────────────────────────────────────
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [notes, setNotes] = useState('');
  const [bookStep, setBookStep] = useState<'service' | 'barber'>('service');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [barbersLoading, setBarbersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  // Fetch public tenant info for QR flow
  useEffect(() => {
    if (!tenantIdParam) return;
    api.get(`/tenants/${tenantIdParam}`)
      .then((r) => setTenant(r.data))
      .catch(() => {});
  }, [tenantIdParam]);

  // Auth routing
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (!isQrFlow) router.replace('/login');
      // QR flow: stay on page, show registration
      return;
    }
    if (user.role !== 'customer') { router.replace('/dashboard'); return; }
    loadBookingData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isQrFlow]);

  // OTP countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const loadBookingData = useCallback(async () => {
    if (!effectiveTenantId) {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    try {
      const [svcRes, histRes] = await Promise.all([
        api.get(`/tenants/${effectiveTenantId}/services`),
        api.get('/bookings/history?limit=50'),
      ]);
      setServices(svcRes.data);
      const historyItems: ActiveBooking[] = histRes.data?.data ?? [];
      const active = historyItems.find(
        (b) => b.status === 'waiting' || b.status === 'in_progress',
      );
      if (active) setActiveBooking(active);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setPageLoading(false);
    }
  }, [effectiveTenantId]);

  // Reload booking data when effectiveTenantId becomes available (after OTP login)
  useEffect(() => {
    if (user && effectiveTenantId) loadBookingData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTenantId]);

  // ── Registration actions ───────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) { toast.error('Masukkan nomor HP yang valid'); return; }
    if (isNewUser && !name.trim()) { toast.error('Masukkan nama Anda'); return; }
    setRegLoading(true);
    try {
      const res = await api.post('/auth/send-otp', {
        phone,
        name: name.trim() || undefined,
        tenantId: tenantIdParam ?? undefined,
      });
      toast.success(res.data.message);
      if (res.data.devOtp) toast(`🔐 Dev OTP: ${res.data.devOtp}`, { duration: 15000 });
      setRegStep('otp');
      setCountdown(60);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('Nama wajib')) {
        setIsNewUser(true);
        toast('Masukkan nama Anda untuk daftar', { icon: '👤' });
      } else {
        toast.error(msg ?? 'Gagal mengirim OTP');
      }
    } finally {
      setRegLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { toast.error('Kode OTP harus 6 angka'); return; }
    setRegLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp: otpCode });
      setAuth(res.data.user, res.data.token);
      toast.success(`Selamat datang, ${res.data.user.name}!`);
      // useEffect for [user] will trigger loadBookingData
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'OTP salah',
      );
    } finally {
      setRegLoading(false);
    }
  };

  // ── Booking actions ────────────────────────────────────────────────────────
  const toggleService = (svc: Service) => {
    if (activeBooking) return;
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s._id === svc._id);
      return exists ? prev.filter((s) => s._id !== svc._id) : [...prev, svc];
    });
  };

  const handleGoToBarber = () => {
    if (selectedServices.length === 0) { toast.error('Pilih minimal satu layanan'); return; }
    setSelectedBarber(null);
    setBookStep('barber');
    setBarbersLoading(true);
    api.get(`/tenants/${effectiveTenantId}/barbers/queue`)
      .then((r) => setBarbers(r.data))
      .catch(() => toast.error('Gagal memuat daftar barber'))
      .finally(() => setBarbersLoading(false));
  };

  const handleBook = async () => {
    if (selectedServices.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        tenantId: effectiveTenantId,
        serviceIds: selectedServices.map((s) => s._id),
        barberId: selectedBarber?.barberId,
        notes,
      });
      const result = Array.isArray(res.data) ? res.data[0] : res.data;
      setDialogOpen(false);
      setNotes('');

      if (isQrFlow) {
        // QR flow: show dedicated confirmed screen
        setBookingResult(result);
      } else {
        // Regular flow: show queue number + reload
        toast.success(`Booking berhasil! Nomor antrian Anda: #${result.queueNumber}`, { duration: 6000 });
        setBookStep('service');
        setSelectedServices([]);
        setSelectedBarber(null);
        loadBookingData();
      }
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal booking',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // ── QR Registration (not yet authenticated) ───────────────────────────────
  if (!user && isQrFlow) {
    const bgGradient = 'linear-gradient(160deg, #1a0000 0%, #0f0f0f 65%)';
    return (
      <Box
        sx={{
          minHeight: '100svh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', p: 3,
          background: bgGradient,
        }}
      >
        {/* Tenant branding */}
        <Box textAlign="center" mb={4}>
          <Box
            sx={{
              width: 64, height: 64, borderRadius: '18px',
              background: 'linear-gradient(135deg, #c0392b 0%, #922b21 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2, boxShadow: '0 6px 24px rgba(192,57,43,0.45)',
            }}
          >
            <ContentCutIcon sx={{ fontSize: 36, color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight={800}>
            {tenant?.name ?? '…'}
          </Typography>
          {tenant?.address && (
            <Typography variant="caption" color="text.secondary">{tenant.address}</Typography>
          )}
        </Box>

        <Card sx={{ width: '100%', maxWidth: 380 }}>
          <CardContent sx={{ p: 3 }}>
            {regStep === 'form' ? (
              <>
                <Typography variant="h6" textAlign="center" mb={3}>
                  {isNewUser ? 'Daftar untuk Booking' : 'Masuk untuk Booking'}
                </Typography>

                {isNewUser && (
                  <TextField
                    fullWidth label="Nama Lengkap" value={name}
                    onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>
                      ),
                    }}
                  />
                )}

                <TextField
                  fullWidth label="Nomor HP" placeholder="08xx xxxx xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  inputMode="tel" sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment>
                    ),
                  }}
                />

                <Button fullWidth variant="contained" size="large"
                  onClick={handleSendOtp} disabled={regLoading}
                >
                  {regLoading ? <CircularProgress size={24} color="inherit" /> : 'Lanjutkan'}
                </Button>
              </>
            ) : (
              <>
                <Typography variant="h6" textAlign="center" mb={1}>Masukkan Kode OTP</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                  Kode 6 digit dikirim ke WA {phone}
                </Typography>

                <TextField
                  fullWidth label="Kode OTP" placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: 28, letterSpacing: 8 } }}
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><LockIcon color="action" /></InputAdornment>
                    ),
                  }}
                />

                <Button fullWidth variant="contained" size="large"
                  onClick={handleVerifyOtp} disabled={regLoading} sx={{ mb: 2 }}
                >
                  {regLoading ? <CircularProgress size={24} color="inherit" /> : 'Verifikasi'}
                </Button>

                <Button fullWidth variant="text" disabled={countdown > 0}
                  onClick={() => { setRegStep('form'); setOtpCode(''); }}
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

  // ── No tenant and no QR → redirect already handled; safety fallback ────────
  if (!user) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
        <QrCodeScannerIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography color="text.secondary">Scan QR code di barbershop untuk mulai booking</Typography>
      </Box>
    );
  }

  // ── QR Flow Confirmed Screen ───────────────────────────────────────────────
  if (isQrFlow && bookingResult) {
    return (
      <Box
        sx={{
          minHeight: '100svh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center',
          background: 'linear-gradient(160deg, #1a0000 0%, #0f0f0f 65%)',
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={800} mb={0.5}>Booking Berhasil!</Typography>
        <Typography color="text.secondary" mb={4}>{tenant?.name}</Typography>

        <Card sx={{ mb: 3, width: '100%', maxWidth: 300 }}>
          <CardContent sx={{ py: 3 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Nomor Antrian
            </Typography>
            <Typography
              variant="h1" fontWeight={900} color="primary.main"
              sx={{ fontSize: '5rem', lineHeight: 1 }}
            >
              #{bookingResult.queueNumber}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ width: '100%', maxWidth: 300, mb: 4 }}>
          <CardContent sx={{ textAlign: 'left' }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Layanan</Typography>
              <Typography variant="body2" fontWeight={600}>{bookingResult.serviceName}</Typography>
            </Box>
            {bookingResult.barberName && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Barber</Typography>
                <Typography variant="body2" fontWeight={600}>{bookingResult.barberName}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 1.5 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label="Menunggu" size="small" color="warning" />
            </Box>
          </CardContent>
        </Card>

        <Button variant="contained" onClick={() => router.push('/history')} sx={{ mb: 1.5 }}>
          Lihat Riwayat
        </Button>
        <Button variant="text" onClick={() => {
          setSelectedServices([]); setSelectedBarber(null);
          setNotes(''); setBookingResult(null); setBookStep('service');
        }}>
          Booking Lagi
        </Button>
      </Box>
    );
  }

  // ── Authenticated Booking Flow ────────────────────────────────────────────
  return (
    <Box className="min-h-screen pb-24" sx={{ bgcolor: 'background.default' }}>
      <PageHeader
        title="💈 Booking"
        back={bookStep === 'barber'}
        right={
          bookStep === 'barber' ? (
            <Button color="inherit" size="small" startIcon={<ArrowBackIcon />}
              onClick={() => setBookStep('service')}
            >
              Ganti Layanan
            </Button>
          ) : undefined
        }
      />

      {pageLoading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : !effectiveTenantId ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', p: 4, textAlign: 'center' }}>
          <QrCodeScannerIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">
            Scan QR code di barbershop untuk mulai booking
          </Typography>
        </Box>
      ) : (
        <Box className="p-4 max-w-lg mx-auto">

          {/* Active booking banner */}
          {activeBooking && (
            <Card className="mb-6" sx={{ border: '2px solid', borderColor: 'warning.main' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Booking Aktif</Typography>
                <Typography variant="h5" fontWeight={800} color="primary">
                  Antrian #{activeBooking.queueNumber}
                </Typography>
                <Typography variant="body1" className="mt-1">{activeBooking.serviceName}</Typography>
                {activeBooking.barberName && (
                  <Typography variant="body2" color="text.secondary">
                    Barber: {activeBooking.barberName}
                  </Typography>
                )}
                <Chip
                  label={statusLabel(activeBooking.status)}
                  color={statusColor(activeBooking.status) as 'warning' | 'info' | 'success' | 'default'}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          )}

          {/* Step 1: Select Services */}
          {bookStep === 'service' && (
            <>
              <Box className="flex justify-between items-center mb-4">
                <Typography variant="h6" fontWeight={700}>Pilih Layanan</Typography>
                {selectedServices.length > 0 && (
                  <Chip icon={<ShoppingCartIcon />} label={`${selectedServices.length} dipilih`}
                    color="primary" size="small" />
                )}
              </Box>

              {services.length === 0 ? (
                <Typography color="text.secondary" className="text-center py-8">
                  Belum ada layanan tersedia
                </Typography>
              ) : (
                <Box className="flex flex-col gap-3">
                  {services.map((svc) => {
                    const selected = !!selectedServices.find((s) => s._id === svc._id);
                    return (
                      <Card key={svc._id} className="cursor-pointer"
                        sx={{
                          borderColor: selected ? 'primary.main' : 'transparent',
                          border: '2px solid',
                          opacity: activeBooking ? 0.6 : 1,
                        }}
                        onClick={() => toggleService(svc)}
                      >
                        <CardContent className="flex items-center gap-3 py-4">
                          <Checkbox checked={selected} color="primary" sx={{ p: 0 }}
                            disabled={!!activeBooking} onChange={() => toggleService(svc)}
                            onClick={(e) => e.stopPropagation()} />
                          <Avatar sx={{ bgcolor: selected ? 'primary.main' : 'primary.light', width: 44, height: 44 }}>
                            <ContentCutIcon sx={{ color: 'white' }} />
                          </Avatar>
                          <Box className="flex-1">
                            <Typography fontWeight={700}>{svc.name}</Typography>
                            {svc.description && (
                              <Typography variant="body2" color="text.secondary">{svc.description}</Typography>
                            )}
                            <Chip icon={<AccessTimeIcon />} label={`${svc.durationMinutes} menit`}
                              size="small" variant="outlined" className="mt-1" />
                          </Box>
                          <Typography fontWeight={800} color="primary" variant="h6">
                            Rp {svc.price.toLocaleString('id-ID')}
                          </Typography>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}

              {/* Cart summary */}
              {selectedServices.length > 0 && (
                <Box className="mt-4 p-4 rounded-xl" sx={{ bgcolor: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)' }}>
                  <Typography variant="subtitle2" fontWeight={700} className="mb-2">
                    Layanan Dipilih ({selectedServices.length})
                  </Typography>
                  {selectedServices.map((s) => (
                    <Box key={s._id} className="flex justify-between text-sm mb-1">
                      <Typography variant="body2">{s.name}</Typography>
                      <Typography variant="body2" fontWeight={600}>Rp {s.price.toLocaleString('id-ID')}</Typography>
                    </Box>
                  ))}
                  <Divider className="my-2" />
                  <Box className="flex justify-between">
                    <Typography variant="body2" color="text.secondary">
                      Total waktu: ~{totalDuration} menit
                    </Typography>
                    <Typography fontWeight={800} color="primary">
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </Typography>
                  </Box>
                  <Button variant="contained" fullWidth className="mt-3" onClick={handleGoToBarber}>
                    Pilih Barber
                  </Button>
                </Box>
              )}

              {activeBooking && (
                <Typography variant="body2" color="text.secondary" className="text-center mt-4">
                  Anda sudah memiliki booking aktif
                </Typography>
              )}
            </>
          )}

          {/* Step 2: Select Barber */}
          {bookStep === 'barber' && selectedServices.length > 0 && (
            <>
              {/* Selected services summary */}
              <Card className="mb-4" sx={{ bgcolor: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)' }}>
                <CardContent className="py-3">
                  <Typography variant="body2" color="text.secondary" className="mb-1">
                    Layanan dipilih ({selectedServices.length})
                  </Typography>
                  {selectedServices.map((s) => (
                    <Box key={s._id} className="flex justify-between">
                      <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        Rp {s.price.toLocaleString('id-ID')}
                      </Typography>
                    </Box>
                  ))}
                  <Divider className="my-1" />
                  <Box className="flex justify-between">
                    <Typography variant="body2" color="text.secondary">Total</Typography>
                    <Typography fontWeight={800} color="primary">Rp {totalPrice.toLocaleString('id-ID')}</Typography>
                  </Box>
                </CardContent>
              </Card>

              <Typography variant="h6" fontWeight={700} className="mb-4">Pilih Barber</Typography>

              {barbersLoading ? (
                <Box>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" className="text-center mt-3">
                    Memuat daftar barber...
                  </Typography>
                </Box>
              ) : barbers.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <PersonIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography color="text.secondary" className="mt-2">Belum ada barber tersedia</Typography>
                    <Button variant="outlined" className="mt-3"
                      onClick={() => { setSelectedBarber(null); setDialogOpen(true); }}>
                      Booking Tanpa Pilih Barber
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Box className="flex flex-col gap-3">
                  {barbers.map((b) => (
                    <Card key={b.barberId} className="cursor-pointer"
                      sx={{ border: '2px solid', borderColor: selectedBarber?.barberId === b.barberId ? 'primary.main' : 'transparent' }}
                      onClick={() => { setSelectedBarber(b); setDialogOpen(true); }}
                    >
                      <CardContent>
                        <Box className="flex items-center gap-3">
                          <Avatar src={b.photoUrl ?? undefined}
                            sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontSize: 24, fontWeight: 700 }}>
                            {!b.photoUrl && b.barberName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box className="flex-1">
                            <Typography fontWeight={700}>{b.barberName}</Typography>
                            <Box className="flex items-center gap-1 mt-0.5">
                              <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                              <Typography variant="body2" fontWeight={600}>
                                {b.rating > 0 ? b.rating.toFixed(1) : 'Baru'}
                              </Typography>
                              {b.totalReviews > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  ({b.totalReviews} ulasan)
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Box className="text-right">
                            <Chip icon={<HourglassTopIcon />} label={waitLabel(b.estimatedWaitMinutes)}
                              color={waitColor(b.estimatedWaitMinutes)} size="small" />
                            {b.queueCount > 0 && (
                              <Typography variant="caption" color="text.secondary" className="block mt-1">
                                {b.queueCount} orang antri
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}

                  <Divider className="my-2" />
                  <Button variant="text" color="inherit"
                    onClick={() => { setSelectedBarber(null); setDialogOpen(true); }}>
                    Tidak ada preferensi barber
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* Confirm Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700}>Konfirmasi Booking</DialogTitle>
        <DialogContent>
          <Box className="rounded-xl p-3 mb-4" sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" className="mb-2">Layanan</Typography>
            {selectedServices.map((s) => (
              <Box key={s._id} className="flex justify-between mb-1">
                <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                <Typography variant="body2" fontWeight={700} color="primary">
                  Rp {s.price.toLocaleString('id-ID')}
                </Typography>
              </Box>
            ))}
            <Divider className="my-2" />
            <Box className="flex justify-between mb-1">
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography fontWeight={800} color="primary">Rp {totalPrice.toLocaleString('id-ID')}</Typography>
            </Box>
            <Box className="flex justify-between mb-1">
              <Typography variant="body2" color="text.secondary">Durasi</Typography>
              <Typography fontWeight={600}>~{totalDuration} menit</Typography>
            </Box>
            <Box className="flex justify-between">
              <Typography variant="body2" color="text.secondary">Barber</Typography>
              <Typography fontWeight={700}>{selectedBarber?.barberName || 'Siapapun tersedia'}</Typography>
            </Box>
            {selectedBarber && selectedBarber.estimatedWaitMinutes > 0 && (
              <Box className="flex justify-between mt-1">
                <Typography variant="body2" color="text.secondary">Est. tunggu</Typography>
                <Chip label={waitLabel(selectedBarber.estimatedWaitMinutes)} size="small"
                  color={waitColor(selectedBarber.estimatedWaitMinutes)} />
              </Box>
            )}
          </Box>
          <TextField fullWidth multiline rows={3} label="Catatan (opsional)"
            placeholder="Contoh: potong pendek bagian samping"
            value={notes} onChange={(e) => setNotes(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                  <NoteAltIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button onClick={() => setDialogOpen(false)} variant="outlined" fullWidth>Batal</Button>
          <Button onClick={handleBook} variant="contained" fullWidth disabled={submitting}
            startIcon={submitting ? undefined : <CheckCircleIcon />}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Booking!'}
          </Button>
        </DialogActions>
      </Dialog>

      <CustomerBottomNav />
    </Box>
  );
}

// ── Page export (Suspense required for useSearchParams) ───────────────────────

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress color="primary" />
        </Box>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
