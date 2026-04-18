'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Avatar, Divider, LinearProgress, Checkbox,
  InputAdornment,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/EditCalendar';
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
import { UI_LAYOUT } from '@/lib/uiStyleConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantInfo { _id: string; name: string; address: string; theme?: { primaryColor?: string } | null; }

interface HaircutPhoto {
  _id: string;
  photos: string[];
  barberName?: string | null;
  createdAt: string;
}

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
  const [visitedTenants, setVisitedTenants] = useState<TenantInfo[]>([]);
  const [tenantSelectorOpen, setTenantSelectorOpen] = useState(false);

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
  const [lastHaircut, setLastHaircut] = useState<HaircutPhoto | null>(null);
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
        api.get('/bookings/history?limit=100'),
      ]);
      setServices(svcRes.data);
      const historyItems: (ActiveBooking & { tenantId?: string })[] = histRes.data?.data ?? [];
      const active = historyItems.find(
        (b) => b.status === 'waiting' || b.status === 'in_progress',
      );
      if (active) setActiveBooking(active);

      // Ambil foto  terakhir customer di tenant ini
      try {
        const photoRes = await api.get(`/haircut-photos/my-last?tenantId=${effectiveTenantId}`);
        setLastHaircut(photoRes.data ?? null);
      } catch { /* abaikan jika gagal */ }

      // Derive visited tenants from booking history for multi-tenant selector
      if (!isQrFlow) {
        const tenantIdSet = new Set(historyItems.map((b) => b.tenantId).filter(Boolean));
        const distinctTenantIds = Array.from(tenantIdSet) as string[];
        if (distinctTenantIds.length > 1) {
          const tenantInfos = await Promise.all(
            distinctTenantIds.map((tid) => api.get(`/tenants/${tid}`).then((r) => r.data).catch(() => null)),
          );
          setVisitedTenants(tenantInfos.filter(Boolean));
        }
      }
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setPageLoading(false);
    }
  }, [effectiveTenantId, isQrFlow]);

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
      // Kirim tenantId (dari URL param) agar BE menemukan record yang benar
      const res = await api.post('/auth/verify-otp', {
        phone,
        otp: otpCode,
        ...(effectiveTenantId && { tenantId: effectiveTenantId }),
      });
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
      .catch(() => toast.error('Gagal memuat daftar staff'))
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
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // ── QR Registration (not yet authenticated) ───────────────────────────────
  if (!user && isQrFlow) {
    return (
      <Box
        sx={{
          minHeight: '100svh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', p: 3,
          background: (t) =>
            `linear-gradient(160deg, ${t.palette.primary.light}22 0%, ${t.palette.background.default} 50%, ${t.palette.background.paper} 100%)`,
        }}
      >
        {/* Tenant branding */}
        <Box textAlign="center" mb={4}>
          <Box
            sx={{
              width: 76, height: 76, borderRadius: '22px',
              background: (t) =>
                `linear-gradient(145deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 50%, ${t.palette.primary.dark} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2.5,
              boxShadow: (t) => `0 12px 32px ${t.palette.primary.main}44, 0 4px 12px ${t.palette.primary.main}28`,
            }}
          >
            <ContentCutIcon sx={{ fontSize: 38, color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight={600} letterSpacing={-0.5}>
            {tenant?.name ?? '…'}
          </Typography>
          {tenant?.address && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{tenant.address}</Typography>
          )}
        </Box>

        <Card
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: UI_LAYOUT.loginCardMaxWidthPx },
            boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            borderRadius: 4,
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <CardContent sx={{ p: 3.5 }}>
            {regStep === 'form' ? (
              <>
                <Typography variant="h6" textAlign="center" fontWeight={500} mb={3}>
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
                  sx={{ borderRadius: 3, py: 1.5, fontWeight: 700 }}
                >
                  {regLoading ? <CircularProgress size={24} color="inherit" /> : 'Lanjutkan'}
                </Button>
              </>
            ) : (
              <>
                <Typography variant="h6" textAlign="center" fontWeight={500} mb={1}>Masukkan Kode OTP</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                  Kode 6 digit dikirim ke WA {phone}
                </Typography>

                <TextField
                  fullWidth label="Kode OTP" placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: 30, letterSpacing: 10 } }}
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><LockIcon color="action" /></InputAdornment>
                    ),
                  }}
                />

                <Button fullWidth variant="contained" size="large"
                  onClick={handleVerifyOtp} disabled={regLoading}
                  sx={{ borderRadius: 3, py: 1.5, fontWeight: 700, mb: 2 }}
                >
                  {regLoading ? <CircularProgress size={24} color="inherit" /> : 'Verifikasi'}
                </Button>

                <Button fullWidth variant="text" disabled={countdown > 0}
                  onClick={() => { setRegStep('form'); setOtpCode(''); }}
                  sx={{ color: 'text.secondary' }}
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
        <Typography color="text.secondary">Scan QR code di outlet untuk mulai booking</Typography>
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
          background: (t) =>
            `linear-gradient(160deg, ${t.palette.success.main}1A 0%, ${t.palette.background.default} 50%, ${t.palette.background.paper} 100%)`,
        }}
      >
        <Box
          sx={{
            width: 80, height: 80, borderRadius: '50%',
            background: (t) => `linear-gradient(145deg, ${t.palette.success.light}, ${t.palette.success.main})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mb: 2,
            boxShadow: (t) => `0 12px 32px ${t.palette.success.main}44`,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 44, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={600} letterSpacing={-0.5} mb={0.5}>Booking Berhasil!</Typography>
        <Typography color="text.secondary" mb={4}>{tenant?.name}</Typography>

        <Card
          sx={{
            mb: 3, width: '100%', maxWidth: 300,
            borderRadius: 4,
            background: (t) => `linear-gradient(145deg, ${t.palette.primary.main}12, ${t.palette.primary.dark}08)`,
            border: (t) => `1px solid ${t.palette.primary.main}22`,
            boxShadow: (t) => `0 8px 28px ${t.palette.primary.main}20`,
          }}
        >
          <CardContent sx={{ py: 3.5 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5} fontWeight={600} letterSpacing={1} sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Nomor Antrian
            </Typography>
            <Typography
              variant="h1" fontWeight={900} color="primary.main"
              sx={{ fontSize: '5.5rem', lineHeight: 1, letterSpacing: -4 }}
            >
              #{bookingResult.queueNumber}
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            width: '100%', maxWidth: 300, mb: 4,
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <CardContent sx={{ textAlign: 'left', px: 2.5 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Layanan</Typography>
              <Typography variant="body2" fontWeight={500}>{bookingResult.serviceName}</Typography>
            </Box>
            {bookingResult.barberName && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Barber</Typography>
                <Typography variant="body2" fontWeight={500}>{bookingResult.barberName}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 1.5, opacity: 0.5, borderColor: 'rgba(0,0,0,0.08)' }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label="Menunggu" size="small" color="warning" sx={{ fontWeight: 700 }} />
            </Box>
          </CardContent>
        </Card>

        <Button
          variant="contained" onClick={() => router.push('/history')}
          sx={{ mb: 1.5, borderRadius: 3, px: 4, py: 1.2, fontWeight: 700 }}
        >
          Lihat Riwayat
        </Button>
        <Button variant="text" color="inherit" sx={{ color: 'text.secondary' }} onClick={() => {
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
    <Box
      sx={{
        minHeight: '100svh', pb: 24,
        background: (t) =>
          `linear-gradient(180deg, ${t.palette.background.default} 0%, ${t.palette.background.paper} 100%)`,
      }}
    >
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
          ) : visitedTenants.length > 1 ? (
            <Button color="inherit" size="small" startIcon={<QrCodeScannerIcon />}
              onClick={() => setTenantSelectorOpen(true)}
            >
              Ganti Salon
            </Button>
          ) : undefined
        }
      />

      {/* Multi-tenant selector dialog */}
      <Dialog
        open={tenantSelectorOpen} onClose={() => setTenantSelectorOpen(false)}
        fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle fontWeight={500}>Pilih Outlet</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {visitedTenants.map((t) => (
            <Box
              key={t._id}
              sx={{
                display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 2,
                cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.06)',
                transition: 'background 0.15s',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' },
              }}
              onClick={() => {
                router.push(`/booking?tenantId=${t._id}&type=booking`);
                setTenantSelectorOpen(false);
              }}
            >
              <Avatar
                sx={{
                  background: (th) => `linear-gradient(135deg, ${th.palette.primary.main}, ${th.palette.primary.dark})`,
                  width: 42, height: 42, fontWeight: 700,
                  boxShadow: (th) => `0 4px 12px ${th.palette.primary.main}33`,
                }}
              >
                {t.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box flex={1}>
                <Typography fontWeight={500}>{t.name}</Typography>
                {t.address && <Typography variant="caption" color="text.secondary">{t.address}</Typography>}
              </Box>
              {effectiveTenantId === t._id && <Chip label="Aktif" size="small" color="primary" />}
            </Box>
          ))}
        </DialogContent>
      </Dialog>

      {pageLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 12 }}><CircularProgress /></Box>
      ) : !effectiveTenantId ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', p: 4, textAlign: 'center' }}>
          <QrCodeScannerIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">
            Scan QR code di outlet untuk mulai booking
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            maxWidth: { xs: '100%', sm: UI_LAYOUT.bookingColumnMaxWidthPx },
            mx: 'auto',
          }}
        >

          {/* Active booking banner */}
          {activeBooking && (
            <Card
              sx={{
                mb: 3,
                borderRadius: 3,
                background: (t) => `linear-gradient(135deg, ${t.palette.warning.main}18 0%, ${t.palette.warning.light}0A 100%)`,
                border: (t) => `1px solid ${t.palette.warning.main}40`,
                boxShadow: (t) => `0 4px 20px ${t.palette.warning.main}20, 0 1px 4px rgba(0,0,0,0.06)`,
              }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Typography variant="overline" sx={{ color: 'warning.dark', fontWeight: 700, letterSpacing: 1.2, fontSize: '0.65rem' }}>
                  Booking Aktif
                </Typography>
                <Typography variant="h4" fontWeight={900} color="primary" letterSpacing={-1}>
                  #{activeBooking.queueNumber}
                </Typography>
                <Typography variant="body1" fontWeight={600} sx={{ mt: 0.25 }}>{activeBooking.serviceName}</Typography>
                {activeBooking.barberName && (
                  <Typography variant="body2" color="text.secondary">
                    Barber: {activeBooking.barberName}
                  </Typography>
                )}
                <Chip
                  label={statusLabel(activeBooking.status)}
                  color={statusColor(activeBooking.status) as 'warning' | 'info' | 'success' | 'default'}
                  size="small"
                  sx={{ mt: 1.5, fontWeight: 700 }}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 1: Select Services */}
          {bookStep === 'service' && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 4, height: 22, borderRadius: 2,
                      background: (t) => `linear-gradient(180deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                    }}
                  />
                  <Typography variant="h6" fontWeight={600} letterSpacing={-0.3}>Pilih Layanan</Typography>
                </Box>
                {selectedServices.length > 0 && (
                  <Chip
                    icon={<ShoppingCartIcon sx={{ fontSize: '14px !important' }} />}
                    label={`${selectedServices.length} dipilih`}
                    color="primary" size="small"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>

              {services.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ContentCutIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                  <Typography color="text.secondary">Belum ada layanan tersedia</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {services.map((svc) => {
                    const selected = !!selectedServices.find((s) => s._id === svc._id);
                    return (
                      <Card
                        key={svc._id}
                        onClick={() => toggleService(svc)}
                        sx={{
                          cursor: activeBooking ? 'default' : 'pointer',
                          borderRadius: 3,
                          border: selected
                            ? (t) => `1.5px solid ${t.palette.primary.main}`
                            : '1.5px solid rgba(0,0,0,0.07)',
                          background: selected
                            ? (t) => `linear-gradient(135deg, ${t.palette.primary.main}10 0%, ${t.palette.primary.light}06 100%)`
                            : 'background.paper',
                          boxShadow: selected
                            ? (t) => `0 6px 24px ${t.palette.primary.main}24, 0 2px 6px rgba(0,0,0,0.06)`
                            : '0 2px 10px rgba(0,0,0,0.06)',
                          opacity: activeBooking ? 0.55 : 1,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '14px !important' }}>
                          <Checkbox
                            checked={selected} color="primary" sx={{ p: 0 }}
                            disabled={!!activeBooking} onChange={() => toggleService(svc)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar
                            sx={{
                              background: selected
                                ? (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`
                                : (t) => `linear-gradient(135deg, ${t.palette.primary.light}CC, ${t.palette.primary.main}88)`,
                              width: 46, height: 46,
                              boxShadow: selected
                                ? (t) => `0 4px 12px ${t.palette.primary.main}44`
                                : '0 2px 6px rgba(0,0,0,0.12)',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <ContentCutIcon sx={{ color: 'white', fontSize: 20 }} />
                          </Avatar>
                          <Box flex={1} minWidth={0}>
                            <Typography fontWeight={400} noWrap>{svc.name}</Typography>
                            {svc.description && (
                              <Typography variant="body2" color="text.secondary" noWrap>{svc.description}</Typography>
                            )}
                            <Chip
                              icon={<AccessTimeIcon sx={{ fontSize: '12px !important' }} />}
                              label={`${svc.durationMinutes} menit`}
                              size="small" variant="outlined"
                              sx={{ mt: 0.75, height: 22, fontSize: '0.7rem', borderRadius: 2, borderColor: 'rgba(0,0,0,0.15)' }}
                            />
                            <Typography
                            fontWeight={300} color="primary" variant="h6"
                            sx={{ whiteSpace: 'nowrap', letterSpacing: -0.5 }}
                          >
                            Rp {svc.price.toLocaleString('id-ID')}
                          </Typography>
                          </Box>
                          
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}

              {/* Cart summary */}
              {selectedServices.length > 0 && (
                <Box
                  sx={{
                    mt: 3, p: 2.5, borderRadius: 3,
                    background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}12 0%, ${t.palette.primary.light}06 100%)`,
                    border: (t) => `1px solid ${t.palette.primary.main}22`,
                    boxShadow: (t) => `0 4px 20px ${t.palette.primary.main}14`,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={500} mb={1.5} color="primary">
                    Layanan Dipilih ({selectedServices.length})
                  </Typography>
                  {selectedServices.map((s) => (
                    <Box key={s._id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="body2">{s.name}</Typography>
                      <Typography variant="body2" fontWeight={500}>Rp {s.price.toLocaleString('id-ID')}</Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1.5, opacity: 0.4, borderColor: 'rgba(0,0,0,0.12)' }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total waktu: ~{totalDuration} menit
                    </Typography>
                    <Typography fontWeight={600} color="primary">
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained" fullWidth onClick={handleGoToBarber}
                    sx={{ borderRadius: 2.5, py: 1.3, fontWeight: 700, letterSpacing: 0.3 }}
                  >
                    Pilih Staff →
                  </Button>
                </Box>
              )}

              {activeBooking && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3, opacity: 0.7 }}>
                  Anda sudah memiliki booking aktif
                </Typography>
              )}
            </>
          )}

          {/* Step 2: Select Barber */}
          {bookStep === 'barber' && selectedServices.length > 0 && (
            <>
              {/* Selected services summary */}
              <Card
                sx={{
                  mb: 3, borderRadius: 3,
                  background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}0D 0%, ${t.palette.primary.dark}06 100%)`,
                  border: (t) => `1px solid ${t.palette.primary.main}1A`,
                  boxShadow: (t) => `0 2px 12px ${t.palette.primary.main}0F`,
                }}
              >
                <CardContent sx={{ py: '12px !important', px: 2 }}>
                  <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2, fontSize: '0.62rem' }}>
                    Layanan dipilih ({selectedServices.length})
                  </Typography>
                  {selectedServices.map((s) => (
                    <Box key={s._id} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        Rp {s.price.toLocaleString('id-ID')}
                      </Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1, opacity: 0.35, borderColor: 'rgba(0,0,0,0.1)' }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Total</Typography>
                    <Typography fontWeight={600} color="primary">Rp {totalPrice.toLocaleString('id-ID')}</Typography>
                  </Box>
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 4, height: 22, borderRadius: 2,
                    background: (t) => `linear-gradient(180deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                  }}
                />
                <Typography variant="h6" fontWeight={600} letterSpacing={-0.3}>Pilih Barber</Typography>
              </Box>

              {barbersLoading ? (
                <Box sx={{ px: 1 }}>
                  <LinearProgress sx={{ borderRadius: 2, height: 3 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                    Memuat daftar staff...
                  </Typography>
                </Box>
              ) : barbers.length === 0 ? (
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <PersonIcon sx={{ fontSize: 52, color: 'text.disabled' }} />
                    <Typography color="text.secondary" sx={{ mt: 1.5, mb: 2 }}>Belum ada staff tersedia</Typography>
                    <Button
                      variant="outlined" sx={{ borderRadius: 2.5 }}
                      onClick={() => { setSelectedBarber(null); setDialogOpen(true); }}
                    >
                      Booking Tanpa Pilih Staf
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {barbers.map((b) => {
                    const sel = selectedBarber?.barberId === b.barberId;
                    return (
                      <Card
                        key={b.barberId}
                        onClick={() => { setSelectedBarber(b); setDialogOpen(true); }}
                        sx={{
                          cursor: 'pointer', borderRadius: 3,
                          border: sel
                            ? (t) => `1.5px solid ${t.palette.primary.main}`
                            : '1.5px solid rgba(0,0,0,0.07)',
                          background: sel
                            ? (t) => `linear-gradient(135deg, ${t.palette.primary.main}0E 0%, ${t.palette.primary.light}06 100%)`
                            : 'background.paper',
                          boxShadow: sel
                            ? (t) => `0 6px 24px ${t.palette.primary.main}24, 0 2px 6px rgba(0,0,0,0.06)`
                            : '0 2px 10px rgba(0,0,0,0.06)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CardContent sx={{ py: '14px !important' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                              src={b.photoUrl ?? undefined}
                              sx={{
                                width: 58, height: 58,
                                background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                                fontSize: 22, fontWeight: 800,
                                boxShadow: '0 4px 14px rgba(0,0,0,0.14)',
                                border: sel ? (t) => `2px solid ${t.palette.primary.main}` : '2px solid transparent',
                                transition: 'border 0.2s ease',
                              }}
                            >
                              {!b.photoUrl && b.barberName.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box flex={1}>
                              <Typography fontWeight={500} fontSize="0.97rem">{b.barberName}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                                <Typography variant="body2" fontWeight={500}>
                                  {b.rating > 0 ? b.rating.toFixed(1) : 'Baru'}
                                </Typography>
                                {b.totalReviews > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    ({b.totalReviews} ulasan)
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Chip
                                icon={<HourglassTopIcon sx={{ fontSize: '12px !important' }} />}
                                label={waitLabel(b.estimatedWaitMinutes)}
                                color={waitColor(b.estimatedWaitMinutes)} size="small"
                                sx={{ fontWeight: 700, height: 26 }}
                              />
                              {b.queueCount > 0 && (
                                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                  {b.queueCount} orang antri
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Box
                    onClick={() => { setSelectedBarber(null); setDialogOpen(true); }}
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      py: 2, borderRadius: 3, cursor: 'pointer',
                      border: '1.5px dashed rgba(0,0,0,0.15)',
                      color: 'text.secondary',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.025)', borderColor: 'rgba(0,0,0,0.25)' },
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>Tidak ada preferensi staff</Typography>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* Confirm Dialog */}
      <Dialog
        open={dialogOpen} onClose={() => setDialogOpen(false)}
        fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle fontWeight={600} sx={{ pb: 1, letterSpacing: -0.3 }}>Konfirmasi Booking</DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Box
            sx={{
              borderRadius: 3, p: 2.5, mb: 2.5,
              background: 'linear-gradient(135deg, #fafaf9 0%, #f5f3f0 100%)',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.2, fontSize: '0.62rem', color: 'text.secondary' }}>
              Layanan
            </Typography>
            {selectedServices.map((s) => (
              <Box key={s._id} sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                <Typography variant="body2" fontWeight={500} color="primary">
                  Rp {s.price.toLocaleString('id-ID')}
                </Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.5, opacity: 0.4, borderColor: 'rgba(0,0,0,0.1)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography fontWeight={600} color="primary" fontSize="1rem">Rp {totalPrice.toLocaleString('id-ID')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">Durasi</Typography>
              <Typography fontWeight={600} variant="body2">~{totalDuration} menit</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Barber</Typography>
              <Typography fontWeight={500} variant="body2">{selectedBarber?.barberName || 'Siapapun tersedia'}</Typography>
            </Box>
            {selectedBarber && selectedBarber.estimatedWaitMinutes > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Est. tunggu</Typography>
                <Chip
                  label={waitLabel(selectedBarber.estimatedWaitMinutes)} size="small"
                  color={waitColor(selectedBarber.estimatedWaitMinutes)}
                  sx={{ fontWeight: 700, height: 22 }}
                />
              </Box>
            )}
          </Box>

          {/* Foto  terakhir customer */}
          {lastHaircut && lastHaircut.photos.length > 0 && (
            <Box
              sx={{
                mb: 2.5, p: 2, borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(0,0,0,0.025) 0%, rgba(0,0,0,0.01) 100%)',
                border: '1px solid rgba(0,0,0,0.07)',
              }}
            >
              <Typography variant="overline" display="block" sx={{ fontWeight: 700, letterSpacing: 1, fontSize: '0.62rem', color: 'text.secondary', mb: 1 }}>
                Foto  Terakhir · {new Date(lastHaircut.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                {lastHaircut.photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i} src={src} alt={`foto--${i + 1}`}
                    style={{
                      height: 82, width: 82, objectFit: 'cover',
                      borderRadius: 10, flexShrink: 0,
                      border: '1.5px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <TextField
            fullWidth multiline rows={3} label="Catatan (opsional)"
            placeholder="Contoh: potong pendek bagian samping"
            value={notes} onChange={(e) => setNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                  <NoteAltIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1.5 }}>
          <Button
            onClick={() => setDialogOpen(false)} variant="outlined" fullWidth
            sx={{ borderRadius: 2.5, py: 1.2, borderColor: 'rgba(0,0,0,0.2)', color: 'text.secondary' }}
          >
            Batal
          </Button>
          <Button
            onClick={handleBook} variant="contained" fullWidth disabled={submitting}
            startIcon={submitting ? undefined : <CheckCircleIcon />}
            sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 700 }}
          >
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
