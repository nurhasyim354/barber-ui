'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Avatar, Divider, LinearProgress, Checkbox,
  InputAdornment, Alert, Fab, Tooltip, Paper, IconButton,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/EditCalendar';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import StarIcon from '@mui/icons-material/Star';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { CustomerBottomNav } from '@/components/layout/BottomNav';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';
import { getTenantUiLabels } from '@/lib/tenantLabels';
import { QUEUE_AUTO_RELOAD_MS } from '@/lib/queueReload';
import {
  bookingServicesLabel,
  bookingSubtotalOrLegacy,
  formatBookingQueueDate,
  type UiBooking,
} from '@/lib/bookingDisplay';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantInfo {
  _id: string;
  name: string;
  address: string;
  theme?: { primaryColor?: string } | null;
  /** 0 = reminder WA mati; dari GET /tenants/:id publik */
  customerReturnReminderDays?: number;
  tenantType?: string;
  /** true jika ada tagihan langganan outlet yang overdue */
  subscriptionOverdue?: boolean;
  /** Max slot aktif (waiting + sedang dilayani) per hari; null = tidak dibatasi */
  dailyBookingQuota?: number | null;
  /** Slot aktif saat ini (hari ini) */
  todayActiveBookingCount?: number;
  /** Tampilkan qty per layanan di form booking */
  showBookingQty?: boolean;
}

interface ServicePhotoDoc {
  _id: string;
  photos: string[];
  staffName?: string | null;
  createdAt: string;
}

interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  photoUrl?: string | null;
}

// StaffQueueInfo dari GET /tenants/:id/staff/queue
interface StaffQueueRow {
  staffId: string;
  staffName: string;
  photoUrl: string | null;
  rating: number;
  totalReviews: number;
  queueCount: number;
  estimatedWaitMinutes: number;
  dailyBookingQuota?: number | null;
  /** false = sedang tidak terima booking (dari staff / toggle ketersediaan) */
  isAvailable?: boolean;
}

type ActiveBooking = UiBooking & { tenantId?: string; estimatedServedAt?: string | null };

type BookingResult = Pick<
  UiBooking,
  | '_id'
  | 'queueNumber'
  | 'date'
  | 'summaryServiceLabel'
  | 'serviceName'
  | 'staffName'
  | 'totalSubtotal'
  | 'servicePrice'
  | 'services'
>;

interface LastDoneVisit {
  _id: string;
  serviceName: string;
  servicePrice: number;
  services?: { serviceName: string; unitPrice: number; quantity: number; lineSubtotal?: number }[];
  totalSubtotal?: number;
  queueNumber: number;
  staffName: string | null;
  date: string;
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

const formatEstimatedServe = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Pelanggan memilih `extra` booking aktif baru — melebihi kuota outlet? */
function tenantQuotaExceeded(tenant: TenantInfo | null, extra: number): boolean {
  const cap = tenant?.dailyBookingQuota;
  if (cap == null || cap <= 0) return false;
  const used = tenant?.todayActiveBookingCount ?? 0;
  return used + extra > cap;
}

/** Staff tidak bisa menerima `extra` booking aktif lagi hari ini */
function staffQuotaExceeded(row: StaffQueueRow, extra: number): boolean {
  const cap = row.dailyBookingQuota;
  if (cap == null || cap <= 0) return false;
  return row.queueCount + extra > cap;
}

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
  const [staffQueue, setStaffQueue] = useState<StaffQueueRow[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffQueueRow | null>(null);
  const [notes, setNotes] = useState('');
  const [bookStep, setBookStep] = useState<'service' | 'staff'>('service');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([]);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [serviceQty, setServiceQty] = useState<Record<string, number>>({});
  const [serviceSearch, setServiceSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [lastHaircut, setLastHaircut] = useState<ServicePhotoDoc | null>(null);
  const [lastDoneVisit, setLastDoneVisit] = useState<LastDoneVisit | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [staffQueueLoading, setStaffQueueLoading] = useState(false);
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

  const loadBookingData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent;
    if (!effectiveTenantId) {
      if (!silent) setPageLoading(false);
      return;
    }
    if (!silent) setPageLoading(true);
    try {
      const [svcRes, histRes, tenantRes] = await Promise.all([
        api.get(`/tenants/${effectiveTenantId}/services`),
        api.get('/bookings/history?limit=100'),
        api.get(`/tenants/${effectiveTenantId}`),
      ]);
      setServices(svcRes.data);
      setTenant(tenantRes.data);
      const historyItems: ActiveBooking[] = histRes.data?.data ?? [];
      const actives = historyItems.filter(
        (b) =>
          (!effectiveTenantId || b.tenantId === effectiveTenantId) &&
          (b.status === 'waiting' || b.status === 'in_progress'),
      );
      actives.sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0));
      setActiveBookings(actives);

      try {
        const [photoRes, doneRes] = await Promise.all([
          api.get(`/service-photos/my-last?tenantId=${effectiveTenantId}`),
          api.get(`/bookings/my-last-done?tenantId=${effectiveTenantId}`),
        ]);
        setLastHaircut(photoRes.data ?? null);
        setLastDoneVisit(doneRes.data ?? null);
      } catch {
        setLastHaircut(null);
        setLastDoneVisit(null);
      }

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
      if (!silent) toast.error('Gagal memuat data');
    } finally {
      if (!silent) setPageLoading(false);
    }
  }, [effectiveTenantId, isQrFlow]);

  // Reload booking data when effectiveTenantId becomes available (after OTP login)
  useEffect(() => {
    if (user && effectiveTenantId) loadBookingData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTenantId]);

  // Auto-reload antrian / status booking
  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    if (!effectiveTenantId) return;
    const id = setInterval(() => {
      void loadBookingData({ silent: true });
      if (bookStep === 'staff') {
        api
          .get(`/tenants/${effectiveTenantId}/staff/queue`)
          .then((r) => {
            if (Array.isArray(r.data)) setStaffQueue(r.data);
          })
          .catch(() => {});
      }
    }, QUEUE_AUTO_RELOAD_MS);
    return () => clearInterval(id);
  }, [user, effectiveTenantId, bookStep, loadBookingData]);

  /** Prefetch antrian staff agar langkah pilih staff tidak gagal diam-diam */
  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    if (!effectiveTenantId || bookStep !== 'service' || selectedServices.length === 0) return;
    if (tenant?.subscriptionOverdue) return;
    const cap = tenant?.dailyBookingQuota;
    const used = tenant?.todayActiveBookingCount ?? 0;
    if (cap != null && cap > 0 && used >= cap) return;
    let cancelled = false;
    api
      .get(`/tenants/${effectiveTenantId}/staff/queue`)
      .then((r) => {
        if (cancelled) return;
        if (Array.isArray(r.data)) setStaffQueue(r.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    user,
    effectiveTenantId,
    bookStep,
    selectedServices.length,
    tenant?.subscriptionOverdue,
    tenant?.dailyBookingQuota,
    tenant?.todayActiveBookingCount,
    tenant,
  ]);

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

  const qFor = (id: string) => Math.min(99, Math.max(1, Math.floor(serviceQty[id] ?? 1)));

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      if (s.description && s.description.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [services, serviceSearch]);

  const filteredStaffQueue = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffQueue;
    return staffQueue.filter((b) => b.staffName.toLowerCase().includes(q));
  }, [staffQueue, staffSearch]);

  const totalCartQty = useMemo(
    () => selectedServices.reduce((sum, s) => sum + qFor(s._id), 0),
    [selectedServices, serviceQty],
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price * qFor(s._id), 0),
    [selectedServices, serviceQty],
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.durationMinutes * qFor(s._id), 0),
    [selectedServices, serviceQty],
  );
  const bookingLabels = getTenantUiLabels(tenant?.tenantType ?? user?.tenantType);

  const outletQuotaFull =
    !!tenant?.dailyBookingQuota &&
    tenant.dailyBookingQuota > 0 &&
    (tenant.todayActiveBookingCount ?? 0) >= tenant.dailyBookingQuota;
  const tenantSlotsExceededForCart = tenantQuotaExceeded(tenant, totalCartQty);

  // ── Booking actions ────────────────────────────────────────────────────────
  const toggleService = (svc: Service) => {
    if (tenant?.subscriptionOverdue) return;
    if (outletQuotaFull) return;
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s._id === svc._id);
      if (exists) {
        setServiceQty((q) => {
          const n = { ...q };
          delete n[svc._id];
          return n;
        });
        return prev.filter((s) => s._id !== svc._id);
      }
      setServiceQty((q) => ({ ...q, [svc._id]: 1 }));
      return [...prev, svc];
    });
  };

  const handleGoToStaff = () => {
    if (tenant?.subscriptionOverdue) {
      toast.error('Outlet tidak dapat menerima booking baru saat ini (tagihan berlangganan).');
      return;
    }
    if (tenantQuotaExceeded(tenant, totalCartQty)) {
      toast.error(
        'Kuota antrian aktif harian outlet tidak cukup untuk jumlah layanan ini. Kurangi pilihan atau coba lagi nanti.',
      );
      return;
    }
    if (selectedServices.length === 0) { toast.error('Pilih minimal satu layanan'); return; }
    setSelectedStaff(null);
    setBookStep('staff');
    setStaffQueueLoading(true);
    api
      .get(`/tenants/${effectiveTenantId}/staff/queue`)
      .then((r) => {
        if (Array.isArray(r.data)) setStaffQueue(r.data);
        else {
          setStaffQueue([]);
          toast.error('Format daftar staff tidak valid');
        }
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(msg ?? 'Gagal memuat daftar staff');
        setStaffQueue([]);
      })
      .finally(() => setStaffQueueLoading(false));
  };

  const handleBook = async () => {
    if (tenant?.subscriptionOverdue) {
      toast.error('Outlet tidak dapat menerima booking baru saat ini (tagihan berlangganan).');
      return;
    }
    if (tenantQuotaExceeded(tenant, totalCartQty)) {
      toast.error('Kuota antrian aktif harian outlet tidak cukup untuk booking ini.');
      return;
    }
    if (selectedStaff && staffQuotaExceeded(selectedStaff, totalCartQty)) {
      toast.error(`Kuota harian ${bookingLabels.staffSingular} ini sudah penuh untuk jumlah layanan dipilih.`);
      return;
    }
    if (selectedStaff && selectedStaff.isAvailable === false) {
      toast.error(`${bookingLabels.staffSingular} ini sedang tidak menerima booking baru.`);
      return;
    }
    if (selectedServices.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        tenantId: effectiveTenantId,
        items: selectedServices.map((s) => ({ serviceId: s._id, quantity: qFor(s._id) })),
        staffId: selectedStaff?.staffId,
        notes,
      });
      const result = res.data as BookingResult;
      setDialogOpen(false);
      setNotes('');

      if (isQrFlow) {
        // QR flow: show dedicated confirmed screen (+ ETA dari riwayat setelah reload)
        setBookingResult(result);
        void loadBookingData();
      } else {
        // Regular flow: show queue number + reload
        toast.success(`Booking berhasil! Nomor antrian Anda: #${result.queueNumber}`, { duration: 6000 });
        setBookStep('service');
        setSelectedServices([]);
        setSelectedStaff(null);
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
    const activeForThisBooking = activeBookings.find((b) => b._id === bookingResult._id);
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
        <Box textAlign="center" mb={4}>
          {tenant?.name && (
            <Typography fontWeight={600} color="text.primary" display="block">
              {tenant.name}
            </Typography>
          )}
          {tenant?.address && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 360, mx: 'auto', lineHeight: 1.5 }}>
              {tenant.address}
            </Typography>
          )}
        </Box>

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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 1.25,
                flexWrap: 'wrap',
              }}
            >
              <Typography
                variant="h1" fontWeight={900} color="primary.main"
                sx={{ fontSize: '5.5rem', lineHeight: 1, letterSpacing: -4 }}
              >
                #{bookingResult.queueNumber}
              </Typography>
              {(bookingResult.date ?? activeForThisBooking?.date) && (
                <Typography
                  variant="subtitle1"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ lineHeight: 1.2 }}
                >
                  {formatBookingQueueDate(
                    String(bookingResult.date ?? activeForThisBooking?.date ?? ''),
                  )}
                </Typography>
              )}
            </Box>
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
              <Typography variant="body2" fontWeight={500}>{bookingServicesLabel(bookingResult)}</Typography>
            </Box>
            {bookingResult.staffName && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">{bookingLabels.staffSingular}</Typography>
                <Typography variant="body2" fontWeight={500}>{bookingResult.staffName}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 1.5, opacity: 0.5, borderColor: 'rgba(0,0,0,0.08)' }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label="Menunggu" size="small" color="warning" sx={{ fontWeight: 700 }} />
            </Box>
            {activeForThisBooking?.estimatedServedAt && (
              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.1 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Perkiraan waktu dilayani
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="primary">
                    {formatEstimatedServe(activeForThisBooking.estimatedServedAt)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>
                    Berdasarkan rata-rata durasi staff dan antrian saat ini
                  </Typography>
                </Box>
              </Box>
            )}
            {activeForThisBooking && !activeForThisBooking.staffId && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                Estimasi akan tersedia setelah outlet menugaskan staff.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Button
          variant="contained" onClick={() => router.push('/history')}
          sx={{ mb: 1.5, borderRadius: 3, px: 4, py: 1.2, fontWeight: 700 }}
        >
          Lihat Riwayat
        </Button>
        <Button variant="text" color="inherit" sx={{ color: 'text.secondary' }} onClick={() => {
          setSelectedServices([]); setSelectedStaff(null);
          setNotes(''); setBookingResult(null); setBookStep('service');
        }}>
          Booking Lagi
        </Button>
      </Box>
    );
  }

  const showFloatingCartSummary =
    !pageLoading &&
    !!effectiveTenantId &&
    bookStep === 'service' &&
    selectedServices.length > 0;

  const showPickStaffFab =
    showFloatingCartSummary && !tenant?.subscriptionOverdue;

  const pickStaffFabDisabled = outletQuotaFull || tenantSlotsExceededForCart;

  /** Di atas FAB “Pilih staff”; jika FAB disembunyikan (mis. tagihan), rapat di atas bottom nav */
  const floatingCartBottom = showPickStaffFab
    ? { xs: 158, sm: 168 }
    : { xs: 80, sm: 88 };

  // ── Authenticated Booking Flow ────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100svh',
        pb: showFloatingCartSummary ? (showPickStaffFab ? 42 : 30) : 24,
        background: (t) =>
          `linear-gradient(180deg, ${t.palette.background.default} 0%, ${t.palette.background.paper} 100%)`,
      }}
    >
      <PageHeader
        title={bookingLabels.bookingPageTitle}
        back={bookStep === 'staff'}
        onBack={bookStep === 'staff' ? () => setBookStep('service') : undefined}
        right={
          visitedTenants.length > 1 && bookStep !== 'staff' ? (
            <Button color="inherit" size="small" startIcon={<QrCodeScannerIcon />}
              onClick={() => setTenantSelectorOpen(true)}
            >
              Ganti Salon
            </Button>
          ) : undefined
        }
      />

      {tenant && effectiveTenantId && (
        <Box
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} component="h2" noWrap>
            {tenant.name}
          </Typography>
          {tenant.address && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.5 }}>
              {tenant.address}
            </Typography>
          )}
        </Box>
      )}

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
              {t.subscriptionOverdue ? (
                <Chip label="Tidak aktif" size="small" color="error" />
              ) : effectiveTenantId === t._id ? (
                <Chip label="Aktif" size="small" color="primary" />
              ) : null}
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
            ...(showFloatingCartSummary ? { pb: { xs: 18, sm: 20 } } : {}),
            maxWidth: { xs: '100%', sm: UI_LAYOUT.bookingColumnMaxWidthPx },
            mx: 'auto',
          }}
        >

          {/* Active booking banner(s) — pelanggan boleh punya lebih dari satu antrian aktif */}
          {activeBookings.length > 0 && (
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
                  {activeBookings.length > 1 ? `Antrian aktif (${activeBookings.length})` : 'Booking aktif'}
                </Typography>
                {activeBookings.map((ab, idx) => (
                  <Box key={ab._id} sx={idx > 0 ? { mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider' } : {}}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
                      <Typography variant="h4" fontWeight={900} color="primary" letterSpacing={-1}>
                        #{ab.queueNumber}
                      </Typography>
                      {formatBookingQueueDate(ab.date) && (
                        <Typography variant="body2" color="text.secondary" fontWeight={700}>
                          {formatBookingQueueDate(ab.date)}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body1" fontWeight={600} sx={{ mt: 0.25 }}>{bookingServicesLabel(ab)}</Typography>
                    {ab.staffName && (
                      <Typography variant="body2" color="text.secondary">
                        {bookingLabels.staffSingular}: {ab.staffName}
                      </Typography>
                    )}
                    <Chip
                      label={statusLabel(ab.status)}
                      color={statusColor(ab.status) as 'warning' | 'info' | 'success' | 'default'}
                      size="small"
                      sx={{ mt: 1.5, fontWeight: 700 }}
                    />
                    {ab.status === 'waiting' && ab.estimatedServedAt && (
                      <Box
                        sx={{
                          mt: 2,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <AccessTimeIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.1 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.35}>
                            Perkiraan waktu dilayani
                          </Typography>
                          <Typography variant="body1" fontWeight={700} color="primary">
                            {formatEstimatedServe(ab.estimatedServedAt)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>
                            Berdasarkan rata-rata durasi staff dan antrian saat ini
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    {ab.status === 'waiting' && !ab.staffId && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                        Estimasi akan tersedia setelah outlet menugaskan staff.
                      </Typography>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Kunjungan terakhir + foto hasil layanan + info reminder */}
          {(lastDoneVisit || (lastHaircut && lastHaircut.photos.length > 0)) && (
            <Card sx={{ mb: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PhotoLibraryIcon fontSize="small" color="primary" />
                  Kunjungan & hasil layanan terakhir
                </Typography>
                {lastDoneVisit && (
                  <Box sx={{ mb: lastHaircut?.photos?.length ? 1.5 : 0 }}>
                    <Typography fontWeight={700}>
                      {bookingServicesLabel({
                        serviceName: lastDoneVisit.serviceName,
                        services: lastDoneVisit.services,
                      })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(lastDoneVisit.date).toLocaleDateString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      {lastDoneVisit.staffName ? ` · ${lastDoneVisit.staffName}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Rp {bookingSubtotalOrLegacy({ totalSubtotal: lastDoneVisit.totalSubtotal, servicePrice: lastDoneVisit.servicePrice }).toLocaleString('id-ID')} · antrian #{lastDoneVisit.queueNumber}
                    </Typography>
                  </Box>
                )}
                {lastHaircut && lastHaircut.photos.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Foto dokumentasi terakhir
                      {' · '}
                      {new Date(lastHaircut.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                      {lastHaircut.photos.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt={`Hasil-${i + 1}`}
                          style={{
                            height: 88, width: 88, objectFit: 'cover', borderRadius: 12, flexShrink: 0,
                            border: '1px solid rgba(0,0,0,0.08)',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {tenant && (tenant.customerReturnReminderDays ?? 0) > 0 && (
            <Alert severity="info" icon={<NotificationsActiveIcon />} sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600}>Pengingat kunjungan berikutnya</Typography>
              <Typography variant="body2" color="text.secondary">
                {tenant.name} dapat mengirim pesan WhatsApp sekitar{' '}
                <strong>{tenant.customerReturnReminderDays} hari</strong> setelah layanan selesai, mengingatkan Anda untuk booking lagi.
              </Typography>
            </Alert>
          )}

          {tenant?.subscriptionOverdue && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600}>Outlet tidak aktif sementara</Typography>
              <Typography variant="body2" color="text.secondary">
                {tenant.name} tidak dapat menerima booking baru karena ada tagihan berlangganan yang melewati jatuh tempo.
              </Typography>
            </Alert>
          )}

          {tenant && !tenant.subscriptionOverdue && outletQuotaFull && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600}>Kuota antrian harian penuh</Typography>
              <Typography variant="body2" color="text.secondary">
                Outlet membatasi {tenant.dailyBookingQuota} antrian aktif (menunggu / sedang dilayani) per hari. Slot hari ini sudah terpakai.
              </Typography>
            </Alert>
          )}

          {tenant &&
            !tenant.subscriptionOverdue &&
            !outletQuotaFull &&
            tenant.dailyBookingQuota &&
            tenant.dailyBookingQuota > 0 &&
            selectedServices.length > 0 &&
            tenantSlotsExceededForCart && (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={600}>Terlalu banyak layanan untuk sisa kuota</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tersisa sekitar{' '}
                  {Math.max(0, tenant.dailyBookingQuota - (tenant.todayActiveBookingCount ?? 0))} slot aktif hari ini.
                  Kurangi jumlah layanan atau pesan terpisah.
                </Typography>
              </Alert>
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
                    label={`${totalCartQty} slot${selectedServices.length > 1 ? ` · ${selectedServices.length} jenis` : ''}`}
                    color="primary" size="small"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>

              {services.length > 0 && (
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Cari layanan (nama atau deskripsi)…"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  disabled={!!tenant?.subscriptionOverdue || outletQuotaFull}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              {services.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ContentCutIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                  <Typography color="text.secondary">Belum ada layanan tersedia</Typography>
                </Box>
              ) : filteredServices.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                  <SearchOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                  <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                    Tidak ada layanan yang cocok dengan &ldquo;{serviceSearch.trim()}&rdquo;
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => setServiceSearch('')}>
                    Hapus pencarian
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredServices.map((svc) => {
                    const selected = !!selectedServices.find((s) => s._id === svc._id);
                    return (
                      <Card
                        key={svc._id}
                        onClick={() => toggleService(svc)}
                        sx={{
                          cursor:
                            tenant?.subscriptionOverdue || outletQuotaFull ? 'default' : 'pointer',
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
                          opacity:
                            tenant?.subscriptionOverdue || outletQuotaFull ? 0.55 : 1,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '14px !important' }}>
                          <Checkbox
                            checked={selected} color="primary" sx={{ p: 0 }}
                            disabled={!!tenant?.subscriptionOverdue || outletQuotaFull}
                            onChange={() => toggleService(svc)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar
                            src={svc.photoUrl || undefined}
                            variant="rounded"
                            sx={{
                              width: 52,
                              height: 52,
                              flexShrink: 0,
                              ...(svc.photoUrl
                                ? {
                                    boxShadow: selected
                                      ? (t) => `0 4px 14px ${t.palette.primary.main}40`
                                      : '0 2px 8px rgba(0,0,0,0.12)',
                                  }
                                : {
                                    background: selected
                                      ? (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`
                                      : (t) => `linear-gradient(135deg, ${t.palette.primary.light}CC, ${t.palette.primary.main}88)`,
                                    boxShadow: selected
                                      ? (t) => `0 4px 12px ${t.palette.primary.main}44`
                                      : '0 2px 6px rgba(0,0,0,0.12)',
                                  }),
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {!svc.photoUrl && <ContentCutIcon sx={{ color: 'white', fontSize: 22 }} />}
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
                            {selected && tenant?.showBookingQty && (
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={0.25}
                                mt={1}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconButton
                                  size="small"
                                  aria-label="Kurangi qty"
                                  onClick={() =>
                                    setServiceQty((q) => ({
                                      ...q,
                                      [svc._id]: Math.max(1, qFor(svc._id) - 1),
                                    }))}
                                >
                                  <RemoveIcon fontSize="small" />
                                </IconButton>
                                <Typography variant="body2" fontWeight={700} sx={{ minWidth: 28, textAlign: 'center' }}>
                                  {qFor(svc._id)}
                                </Typography>
                                <IconButton
                                  size="small"
                                  aria-label="Tambah qty"
                                  onClick={() =>
                                    setServiceQty((q) => ({
                                      ...q,
                                      [svc._id]: Math.min(99, qFor(svc._id) + 1),
                                    }))}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                          
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}

            </>
          )}

          {/* Step 2: Select staff */}
          {bookStep === 'staff' && selectedServices.length > 0 && (
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
                    <Box key={s._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Avatar
                          src={s.photoUrl || undefined}
                          variant="rounded"
                          sx={{ width: 28, height: 28, flexShrink: 0, bgcolor: 'primary.light' }}
                        >
                          {!s.photoUrl && <ContentCutIcon sx={{ fontSize: 14 }} />}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {s.name}
                          {tenant?.showBookingQty && qFor(s._id) > 1 ? ` ×${qFor(s._id)}` : ''}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600} color="primary" sx={{ flexShrink: 0 }}>
                        Rp {(s.price * qFor(s._id)).toLocaleString('id-ID')}
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
                <Typography variant="h6" fontWeight={600} letterSpacing={-0.3}>Pilih {bookingLabels.staffSingular}</Typography>
              </Box>

              {!staffQueueLoading && staffQueue.length > 0 && (
                <TextField
                  fullWidth
                  size="small"
                  placeholder={`Cari nama ${bookingLabels.staffSingular}…`}
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              {staffQueueLoading ? (
                <Box sx={{ px: 1 }}>
                  <LinearProgress sx={{ borderRadius: 2, height: 3 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                    Memuat daftar staff...
                  </Typography>
                </Box>
              ) : staffQueue.length === 0 ? (
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <PersonIcon sx={{ fontSize: 52, color: 'text.disabled' }} />
                    <Typography color="text.secondary" sx={{ mt: 1.5, mb: 2 }}>Belum ada staff tersedia</Typography>
                    <Button
                      variant="outlined" sx={{ borderRadius: 2.5 }}
                      disabled={
                        !!tenant?.subscriptionOverdue ||
                        outletQuotaFull ||
                        tenantSlotsExceededForCart
                      }
                      onClick={() => { setSelectedStaff(null); setDialogOpen(true); }}
                    >
                      Booking Tanpa Pilih Staf
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredStaffQueue.length === 0 && staffSearch.trim() ? (
                <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                  <SearchOffIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
                    Tidak ada {bookingLabels.staffSingular} yang cocok dengan &ldquo;{staffSearch.trim()}&rdquo;
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => setStaffSearch('')}>
                    Hapus pencarian
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredStaffQueue.map((b) => {
                    const sel = selectedStaff?.staffId === b.staffId;
                    const staffFull = staffQuotaExceeded(b, totalCartQty);
                    const staffUnavailable = b.isAvailable === false;
                    const cardDisabled =
                      !!tenant?.subscriptionOverdue ||
                      outletQuotaFull ||
                      tenantSlotsExceededForCart ||
                      staffFull ||
                      staffUnavailable;
                    return (
                      <Card
                        key={b.staffId}
                        onClick={() => {
                          if (cardDisabled) return;
                          setSelectedStaff(b);
                          setDialogOpen(true);
                        }}
                        sx={{
                          cursor: cardDisabled ? 'not-allowed' : 'pointer',
                          borderRadius: 3,
                          border: sel
                            ? (t) => `1.5px solid ${t.palette.primary.main}`
                            : '1.5px solid rgba(0,0,0,0.07)',
                          background: sel
                            ? (t) => `linear-gradient(135deg, ${t.palette.primary.main}0E 0%, ${t.palette.primary.light}06 100%)`
                            : 'background.paper',
                          boxShadow: sel
                            ? (t) => `0 6px 24px ${t.palette.primary.main}24, 0 2px 6px rgba(0,0,0,0.06)`
                            : '0 2px 10px rgba(0,0,0,0.06)',
                          opacity: cardDisabled ? 0.5 : 1,
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
                              {!b.photoUrl && b.staffName.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box flex={1}>
                              <Typography fontWeight={500} fontSize="0.97rem">{b.staffName}</Typography>
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
                              {staffUnavailable && (
                                <Chip
                                  label="Tidak terima booking"
                                  color="default"
                                  size="small"
                                  sx={{ fontWeight: 700, mb: 0.5 }}
                                />
                              )}
                              {staffFull && !staffUnavailable && (
                                <Chip label="Kuota penuh" color="error" size="small" sx={{ fontWeight: 700, mb: 0.5 }} />
                              )}
                              <Chip
                                icon={<HourglassTopIcon sx={{ fontSize: '12px !important' }} />}
                                label={waitLabel(b.estimatedWaitMinutes)}
                                color={waitColor(b.estimatedWaitMinutes)} size="small"
                                sx={{ fontWeight: 700, height: 26 }}
                              />
                              {b.queueCount > 0 && (
                                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                  {b.queueCount} orang antri
                                  {b.dailyBookingQuota != null && b.dailyBookingQuota > 0
                                    ? ` · max ${b.dailyBookingQuota}/hari`
                                    : ''}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Box
                    onClick={() => {
                      if (tenant?.subscriptionOverdue || outletQuotaFull || tenantSlotsExceededForCart) return;
                      setSelectedStaff(null);
                      setDialogOpen(true);
                    }}
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      py: 2, borderRadius: 3,
                      cursor:
                        tenant?.subscriptionOverdue || outletQuotaFull || tenantSlotsExceededForCart
                          ? 'not-allowed'
                          : 'pointer',
                      border: '1.5px dashed rgba(0,0,0,0.15)',
                      color: 'text.secondary',
                      opacity:
                        tenant?.subscriptionOverdue || outletQuotaFull || tenantSlotsExceededForCart ? 0.5 : 1,
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
              <Box key={s._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Avatar
                    src={s.photoUrl || undefined}
                    variant="rounded"
                    sx={{ width: 32, height: 32, flexShrink: 0, bgcolor: 'primary.light' }}
                  >
                    {!s.photoUrl && <ContentCutIcon sx={{ fontSize: 16 }} />}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} noWrap>{s.name}</Typography>
                </Box>
                <Typography variant="body2" fontWeight={500} color="primary" sx={{ flexShrink: 0 }}>
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
              <Typography variant="body2" color="text.secondary">{bookingLabels.staffSingular}</Typography>
              <Typography fontWeight={500} variant="body2">{selectedStaff?.staffName || 'Siapapun tersedia'}</Typography>
            </Box>
            {selectedStaff && selectedStaff.estimatedWaitMinutes > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Est. tunggu</Typography>
                <Chip
                  label={waitLabel(selectedStaff.estimatedWaitMinutes)} size="small"
                  color={waitColor(selectedStaff.estimatedWaitMinutes)}
                  sx={{ fontWeight: 700, height: 22 }}
                />
              </Box>
            )}
          </Box>

          {/* Foto dokumentasi (ringkas di dialog konfirmasi) */}
          {lastHaircut && lastHaircut.photos.length > 0 && (
            <Box
              sx={{
                mb: 2.5, p: 2, borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(0,0,0,0.025) 0%, rgba(0,0,0,0.01) 100%)',
                border: '1px solid rgba(0,0,0,0.07)',
              }}
            >
              <Typography variant="overline" display="block" sx={{ fontWeight: 700, letterSpacing: 1, fontSize: '0.62rem', color: 'text.secondary', mb: 1 }}>
                Hasil layanan terakhir · {new Date(lastHaircut.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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
            placeholder={bookingLabels.bookingNotesPlaceholder}
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
            onClick={handleBook}
            variant="contained"
            fullWidth
            disabled={
              submitting ||
              !!tenant?.subscriptionOverdue ||
              outletQuotaFull ||
              tenantSlotsExceededForCart ||
              (!!selectedStaff && staffQuotaExceeded(selectedStaff, totalCartQty)) ||
              (!!selectedStaff && selectedStaff.isAvailable === false)
            }
            startIcon={submitting ? undefined : <CheckCircleIcon />}
            sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 700 }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Booking!'}
          </Button>
        </DialogActions>
      </Dialog>

      {showFloatingCartSummary && (
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: floatingCartBottom,
            zIndex: 59,
            borderRadius: 3,
            maxWidth: UI_LAYOUT.bookingColumnMaxWidthPx,
            mx: 'auto',
            overflow: 'hidden',
            border: (t) => `1px solid ${t.palette.primary.main}22`,
            
          }}
        >
          <Box sx={{ p: 1.75, pt: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ShoppingCartIcon color="primary" sx={{ fontSize: 22 }} />
              <Typography variant="subtitle2" fontWeight={700} color="primary">
                Layanan dipilih ({selectedServices.length})
              </Typography>
            </Box>
            <Box
              sx={{
                maxHeight: 140,
                overflowY: 'auto',
                pr: 0.5,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {selectedServices.map((s) => (
                <Box
                  key={s._id}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75, gap: 1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Avatar
                      src={s.photoUrl || undefined}
                      variant="rounded"
                      sx={{ width: 28, height: 28, flexShrink: 0, bgcolor: 'primary.light' }}
                    >
                      {!s.photoUrl && <ContentCutIcon sx={{ fontSize: 14 }} />}
                    </Avatar>
                    <Typography variant="body2" noWrap fontWeight={500}>
                      {s.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600} color="primary" sx={{ flexShrink: 0 }}>
                    Rp {s.price.toLocaleString('id-ID')}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 1, opacity: 0.35, borderColor: 'rgba(0,0,0,0.1)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Total waktu ~{totalDuration} menit
              </Typography>
              <Typography fontWeight={800} color="primary" variant="subtitle1">
                Rp {totalPrice.toLocaleString('id-ID')}
              </Typography>
            </Box>
            {showPickStaffFab && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.45 }}>
                Lanjut dengan tombol <strong>Pilih staff</strong> di pojok kanan bawah.
              </Typography>
            )}
            {tenant?.subscriptionOverdue && (
              <Typography variant="caption" color="error" display="block" sx={{ mt: 0.75, fontWeight: 600 }}>
                Outlet tidak dapat menerima booking baru saat ini.
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {showPickStaffFab && (
        <Tooltip
          title={
            pickStaffFabDisabled
              ? outletQuotaFull
                ? 'Kuota antrian outlet hari ini penuh'
                : 'Kurangi jumlah layanan agar muat dengan sisa kuota'
              : `Pilih ${bookingLabels.staffSingular.toLowerCase()}`
          }
        >
          <Fab
            color="primary"
            variant="extended"
            disabled={pickStaffFabDisabled}
            onClick={() => void handleGoToStaff()}
            sx={{
              position: 'fixed',
              bottom: { xs: 88, sm: 96 },
              right: 16,
              zIndex: 60,
              px: 2,
              fontWeight: 700,
            }}
          >
            <PersonSearchIcon sx={{ mr: 1 }} />
            Pilih staff
          </Fab>
        </Tooltip>
      )}

      <CustomerBottomNav tenantType={tenant?.tenantType ?? user?.tenantType} />
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
