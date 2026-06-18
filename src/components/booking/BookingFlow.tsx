'use client';

import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Avatar, Divider, LinearProgress, Checkbox,
  InputAdornment, Alert, Fab, Tooltip, Paper, IconButton,
  FormControl, InputLabel, Select, MenuItem, FormHelperText,
  Collapse, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
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
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PaymentsIcon from '@mui/icons-material/Payments';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import SwitchOutletControl from '@/components/account/SwitchOutletControl';
import { CustomerBottomNav } from '@/components/layout/BottomNav';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';
import { getTenantUiLabels } from '@/lib/tenantLabels';
import { formatDuration } from '@/lib/formatDuration';
import { QUEUE_AUTO_RELOAD_MS } from '@/lib/queueReload';
import {
  bookingServicesLabel,
  bookingSubtotalOrLegacy,
  formatBookingQueueDate,
  type UiBooking,
} from '@/lib/bookingDisplay';
import {
  BOOKING_QTY_DECIMAL_HINT,
  effectiveBookingLineQty,
  formatBookingQtyDisplay,
  parseBookingQuantityInput,
} from '@/lib/bookingQty';
import { formatSlotRangeLabel } from '@/lib/appointmentSlot';

export type BookingFlowVariant = 'customer' | 'staff' | 'admin';

const STAFF_SCHEDULE_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type StaffScheduleDayKey = (typeof STAFF_SCHEDULE_DAY_KEYS)[number];

const STAFF_SCHEDULE_DAY_LABEL_ID: Record<StaffScheduleDayKey, string> = {
  mon: 'Senin',
  tue: 'Selasa',
  wed: 'Rabu',
  thu: 'Kamis',
  fri: 'Jumat',
  sat: 'Sabtu',
  sun: 'Minggu',
};

function normalizeStaffDayWindowsRaw(raw: unknown): { start: string; end: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => ({
      start: String((x as { start?: unknown }).start ?? '').trim(),
      end: String((x as { end?: unknown }).end ?? '').trim(),
    }))
    .filter((x) => x.start && x.end);
}

function windowsForQueueRow(row: {
  availabilityDaysHours?: Record<string, { start: string; end: string }[]> | null;
  selectedBookingDowKey?: string;
}): { start: string; end: string }[] {
  const dow = row.selectedBookingDowKey;
  if (!dow || !row.availabilityDaysHours) return [];
  return normalizeStaffDayWindowsRaw(row.availabilityDaysHours[dow]);
}

/** Jika `null`, outlet tidak membatasi hari kerja per staff di data ini. */
function buildStaffWeeklyScheduleDayRows(
  availabilityDaysHours?: Record<string, { start: string; end: string }[]> | null,
):
  | null
  | { dayKey: StaffScheduleDayKey; label: string; windows: { start: string; end: string }[] }[] {
  if (!availabilityDaysHours || typeof availabilityDaysHours !== 'object') return null;
  const sk = availabilityDaysHours as Record<string, unknown>;
  let anyWindows = false;
  for (const key of STAFF_SCHEDULE_DAY_KEYS) {
    if (normalizeStaffDayWindowsRaw(sk[key]).length > 0) {
      anyWindows = true;
      break;
    }
  }
  if (!anyWindows) return null;
  return STAFF_SCHEDULE_DAY_KEYS.map((dayKey) => ({
    dayKey,
    label: STAFF_SCHEDULE_DAY_LABEL_ID[dayKey],
    windows: normalizeStaffDayWindowsRaw(sk[dayKey]),
  }));
}

export interface BookingFlowProps {
  variant?: BookingFlowVariant;
  /** Default: CustomerBottomNav */
  bottomNav?: ReactNode;
}

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
  /** Staff booking UI: izin outlet */
  allowStaffCreateBooking?: boolean;
  /** true = QR/booking hanya lewat OTP; false/tidak ada = boleh tamu (nama wajib, HP opsional). */
  requireLoginOnCreateBooking?: boolean;
  /** true = catatan wajib diisi saat booking */
  requireNotes?: boolean;
  /** Jumlah posisi di form booking; `null` = tanpa pemilihan posisi (API: `GET /tenants/:id` selalu number | null). */
  bookingSeatCount?: number | null;
  /** 0 = peringatan stok nonaktif; >0 = tampilkan info stok jika stockQty ≤ nilai ini */
  outOfStockQtyReminder?: number;
  /** Persentase PPN (0 = tidak ada PPN, tidak ditampilkan). */
  ppnPercentage?: number;
  /** true = pelanggan boleh booking untuk tanggal selain hari ini (kalender zona kuota). */
  allowBookOnFutureDates?: boolean;
  /** Hari ini `YYYY-MM-DD` di zona kuota outlet — sinkron dengan backend. */
  quotaTodayDayKey?: string;
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
  unit?: string | null;
  /** Terlacak jika angka; ≤ 0 = habis untuk pemilihan booking */
  stockQty?: number | null;
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
  /** false jika staff punya jadwal mingguan dan hari yang dipilih libur */
  canBookOnSelectedDay?: boolean;
  availabilityDaysHours?: Record<string, { start: string; end: string }[]> | null;
  selectedBookingDayKey?: string;
  selectedBookingDowKey?: string;
  speciality?: string | null;
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
  | 'seatPosition'
  | 'appointmentSlot'
>;

interface LastDoneVisit {
  _id: string;
  serviceName: string;
  servicePrice: number;
  services?: { serviceName: string; unitPrice: number; quantity: number; lineSubtotal?: number }[];
  totalSubtotal?: number;
  paidAmount?: number;
  paymentTaxSnapshot?: { subtotal: number; ppnPercentage: number; ppnAmount: number };
  queueNumber: number;
  staffName: string | null;
  date: string;
}

interface CustomerPickRow {
  _id: string;
  name: string;
  phone: string;
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
  s === 'waiting'
    ? 'warning'
    : s === 'in_progress'
      ? 'info'
      : s === 'waiting_for_payment'
        ? 'secondary'
        : s === 'done'
          ? 'success'
          : 'default';
const statusLabel = (s: string) =>
  s === 'waiting'
    ? 'Menunggu'
    : s === 'in_progress'
      ? 'Sedang dilayani'
      : s === 'waiting_for_payment'
        ? 'Menunggu bayar'
        : s === 'done'
          ? 'Selesai'
          : s;

const formatEstimatedServe = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Pelanggan memilih `extra` booking aktif baru — melebihi kuota outlet? */
function tenantQuotaExceeded(
  tenant: TenantInfo | null,
  extra: number,
  selectedQuotaDayKey?: string,
): boolean {
  const cap = tenant?.dailyBookingQuota;
  if (cap == null || cap <= 0) return false;
  const todayKey = tenant?.quotaTodayDayKey;
  if (todayKey && selectedQuotaDayKey && selectedQuotaDayKey > todayKey) return false;
  const used = tenant?.todayActiveBookingCount ?? 0;
  return used + extra > cap;
}

/** Staff tidak bisa menerima `extra` booking aktif lagi hari ini */
function staffQuotaExceeded(row: StaffQueueRow, extra: number): boolean {
  const cap = row.dailyBookingQuota;
  if (cap == null || cap <= 0) return false;
  return row.queueCount + extra > cap;
}

/** Stok terlacak (`stockQty` angka) dan tidak bisa dijual / dipesan (≤ 0). */
function isServiceOutOfStock(svc: Pick<Service, 'stockQty'>): boolean {
  if (svc.stockQty === undefined || svc.stockQty === null) return false;
  const n = Number(svc.stockQty);
  if (!Number.isFinite(n)) return false;
  return n <= 0;
}

// ── Main content ──────────────────────────────────────────────────────────────

export function BookingFlow({ variant = 'customer', bottomNav }: BookingFlowProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isStaffVariant = variant === 'staff';
  const isAdminVariant = variant === 'admin';
  const isOperatorVariant = isStaffVariant || isAdminVariant;

  const tenantIdParam = searchParams.get('tenantId');
  const customerPhoneParam = searchParams.get('customerPhone');
  const addServiceParam = searchParams.get('addService');
  const isQrFlow =
    !isOperatorVariant && !!(tenantIdParam && searchParams.get('type') === 'booking');

  const { user, isLoading: authLoading, loadFromStorage, setAuth } = useAuthStore();

  /** Staff/admin: hanya outlet login; pelanggan: QR/param bisa mengarahkan salon */
  const effectiveTenantId = isOperatorVariant
    ? user?.tenantId ?? null
    : tenantIdParam ?? user?.tenantId ?? null;

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
  /** Pilih posisi 1…N ketika outlet mengaktifkan `bookingSeatCount`. */
  /** null = Take Away / Dibungkus (tanpa kursi); number = nomor kursi yang dipilih */
  const [bookingSeatPick, setBookingSeatPick] = useState<number | null>(null);
  /** Dari GET publik occupied-seat-positions saat dialog konfirmasi dibuka */
  const [occupiedSeatPositions, setOccupiedSeatPositions] = useState<number[]>([]);
  const [seatAvailabilityLoading, setSeatAvailabilityLoading] = useState(false);
  const [bookStep, setBookStep] = useState<'service' | 'staff'>('service');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([]);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [serviceQty, setServiceQty] = useState<Record<string, number>>({});
  const [qtyDraftByService, setQtyDraftByService] = useState<Record<string, string>>({});
  const [serviceSearch, setServiceSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [floatingCartExpanded, setFloatingCartExpanded] = useState(false);
  // ── Tambah item ke booking aktif ────────────────────────────────────────────
  const [addItemBookingId, setAddItemBookingId] = useState<string | null>(null);
  const [addItemSelected, setAddItemSelected] = useState<Service[]>([]);
  const [addItemQty, setAddItemQty] = useState<Record<string, number>>({});
  const [addItemQtyDraft, setAddItemQtyDraft] = useState<Record<string, string>>({});
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addItemSubmitting, setAddItemSubmitting] = useState(false);
  const [selectedBookingCustomer, setSelectedBookingCustomer] = useState<CustomerPickRow | null>(null);
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  /** Mode pemilihan customer oleh staff: tamu baru (input nama) atau pelanggan terdaftar (autocomplete) */
  const [staffCustomerMode, setStaffCustomerMode] = useState<'guest' | 'existing'>('guest');
  const [staffGuestName, setStaffGuestName] = useState('');
  const [staffGuestPhone, setStaffGuestPhone] = useState('');
  const [staffGuestNameAttempted, setStaffGuestNameAttempted] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerPickRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [lastHaircut, setLastHaircut] = useState<ServicePhotoDoc | null>(null);
  const [lastDoneVisit, setLastDoneVisit] = useState<LastDoneVisit | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [staffQueueLoading, setStaffQueueLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  /** Profil antrian staff login (mode staff) — jadwal & slot terbooking */
  const [staffSelfQueueInfo, setStaffSelfQueueInfo] = useState<StaffQueueRow | null>(null);
  /** Slot janji untuk booking bersama staff yang punya jadwal jam */
  const [selectedAppointmentSlot, setSelectedAppointmentSlot] = useState<{ start: string; end: string } | null>(null);
  /** Waktu terakhir data berhasil dimuat (untuk label "X detik lalu") */
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  /** Hitung mundur detik ke auto-refresh berikutnya */
  const [refreshCountdown, setRefreshCountdown] = useState(Math.round(QUEUE_AUTO_RELOAD_MS / 1000));
  /** Tanggal antrian (`YYYY-MM-DD` zona kuota). Diisi dari `tenant.quotaTodayDayKey`; bisa diubah jika outlet mengizinkan. */
  const [bookingQuotaDayKey, setBookingQuotaDayKey] = useState('');

  /** QR dengan tenantId di URL: tunggu GET info outlet sebelum branch OTP vs tamu. */
  const [qrTenantReady, setQrTenantReady] = useState(() => !tenantIdParam);
  const [guestFormName, setGuestFormName] = useState('');
  const [guestFormPhone, setGuestFormPhone] = useState(customerPhoneParam ?? '');
  /** Diset true jika user tamu menekan aksi booking tanpa mengisi nama (toast + helper). */
  const [guestBookingNameAttempted, setGuestBookingNameAttempted] = useState(false);
  const guestNameInputRef = useRef<HTMLInputElement | null>(null);
  const [serviceDetailDialog, setServiceDetailDialog] = useState<{ open: boolean; service: Service | null }>({
    open: false,
    service: null,
  });
  /** Dialog jadwal mingguan staff (step pilih staff, pelanggan). */
  const [staffScheduleDialogRow, setStaffScheduleDialogRow] = useState<StaffQueueRow | null>(null);

  /** Mencegah auto-add QR service dipanggil lebih dari sekali per mount */
  const qrAutoAddAttemptedRef = useRef(false);

  const guestBookingFlow =
    !user &&
    isQrFlow &&
    qrTenantReady &&
    !!tenant &&
    tenant.requireLoginOnCreateBooking !== true &&
    !!tenantIdParam;

  const guestNameNeedsAttention =
    guestBookingFlow &&
    !guestFormName.trim() &&
    (selectedServices.length > 0 || guestBookingNameAttempted);

  useEffect(() => {
    if (guestFormName.trim()) setGuestBookingNameAttempted(false);
  }, [guestFormName]);

  const effectiveQuotaDayKey = bookingQuotaDayKey || tenant?.quotaTodayDayKey || '';

  const staffQueueReqConfig = useMemo(
    () => (effectiveQuotaDayKey.length >= 10 ? { params: { date: effectiveQuotaDayKey } as const } : {}),
    [effectiveQuotaDayKey],
  );

  useEffect(() => {
    const q = tenant?.quotaTodayDayKey;
    if (!q) return;
    if (tenant.allowBookOnFutureDates !== true) {
      setBookingQuotaDayKey(q);
      return;
    }
    setBookingQuotaDayKey((prev) => {
      if (!prev) return q;
      if (prev < q) return q;
      return prev;
    });
  }, [tenant?._id, tenant?.quotaTodayDayKey, tenant?.allowBookOnFutureDates]);

  useEffect(() => {
    setSelectedStaff(null);
    setSelectedAppointmentSlot(null);
  }, [bookingQuotaDayKey]);

  const assertGuestHasName = (): boolean => {
    if (!guestBookingFlow) return true;
    if (guestFormName.trim()) return true;
    toast.error('Nama wajib diisi');
    setGuestBookingNameAttempted(true);
    guestNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    guestNameInputRef.current?.focus?.();
    return false;
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (!tenantIdParam) {
      setQrTenantReady(true);
      return;
    }
    setQrTenantReady(false);
    api
      .get(`/tenants/${tenantIdParam}`)
      .then((r) => setTenant(r.data))
      .catch(() => setTenant(null))
      .finally(() => setQrTenantReady(true));
  }, [tenantIdParam]);

  // Auth routing
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (!isQrFlow) router.replace('/login');
      return;
    }
    if (isStaffVariant) {
      if (user.role !== 'staff') {
        router.replace('/');
        return;
      }
      return;
    }
    if (isAdminVariant) {
      if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
        router.replace('/dashboard');
        return;
      }
      return;
    }
    if (user.role !== 'customer') {
      router.replace('/dashboard');
      return;
    }
  }, [user, authLoading, isQrFlow, isStaffVariant, isAdminVariant, router]);

  useEffect(() => {
    if (!isOperatorVariant || !effectiveTenantId || !user?.tenantId) return;
    const ac = new AbortController();
    const tmr = window.setTimeout(() => {
      setCustomersLoading(true);
      api
        .get('/customers', {
          params: { search: customerSearchInput.trim(), limit: 40, page: 1 },
          signal: ac.signal,
        })
        .then((r) => {
          const rows = r.data?.data;
          setCustomerOptions(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (!ac.signal.aborted) setCustomerOptions([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setCustomersLoading(false);
        });
    }, 280);
    return () => {
      ac.abort();
      window.clearTimeout(tmr);
    };
  }, [customerSearchInput, isOperatorVariant, effectiveTenantId, user?.tenantId]);

  useEffect(() => {
    if (!isOperatorVariant) return;
    setSelectedServices([]);
    setServiceQty({});
    setQtyDraftByService({});
    setSelectedStaff(null);
    setBookStep('service');
  }, [selectedBookingCustomer?._id, isOperatorVariant]);

  useEffect(() => {
    const n = tenant?.bookingSeatCount;
    if (n == null || typeof n !== 'number' || !Number.isFinite(n) || n < 1) return;
    setBookingSeatPick(1);
  }, [tenant?._id, tenant?.bookingSeatCount]);

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
      if (isOperatorVariant) {
        const [svcRes, tenantRes, todayWrapped] = await Promise.all([
          api.get(`/tenants/${effectiveTenantId}/services`),
          api.get(`/tenants/${effectiveTenantId}`),
          api.get('/bookings/today').catch(() => ({ data: [] as ActiveBooking[] })),
        ]);
        setServices(svcRes.data);
        setTenant(tenantRes.data);
        if (isStaffVariant && tenantRes.data?.allowStaffCreateBooking !== true) {
          toast.error('Staff tidak diizinkan membuat booking di outlet ini.');
          router.replace('/staff');
          return;
        }
        const todayRows: ActiveBooking[] = Array.isArray(todayWrapped.data) ? todayWrapped.data : [];
        if (selectedBookingCustomer) {
          const actives = todayRows.filter(
            (b) =>
              b.customerId === selectedBookingCustomer._id &&
              (b.status === 'waiting' ||
                b.status === 'in_progress' ||
                b.status === 'waiting_for_payment'),
          );
          actives.sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0));
          setActiveBookings(actives);
        } else {
          setActiveBookings([]);
        }
        setLastHaircut(null);
        setLastDoneVisit(null);
        setVisitedTenants([]);
      } else {
        const [svcRes, tenantRes, histWrapped] = await Promise.all([
          api.get(`/tenants/${effectiveTenantId}/services`),
          api.get(`/tenants/${effectiveTenantId}`),
          api
            .get('/bookings/history?limit=100')
            .catch(() => ({ data: { data: [] as ActiveBooking[] } })),
        ]);
        setServices(svcRes.data);
        setTenant(tenantRes.data);
        const historyItems: ActiveBooking[] = histWrapped.data?.data ?? [];
        const actives = historyItems.filter(
          (b) =>
            (!effectiveTenantId || b.tenantId === effectiveTenantId) &&
            (b.status === 'waiting' ||
              b.status === 'in_progress' ||
              b.status === 'waiting_for_payment'),
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

        if (!isQrFlow) {
          const tenantIdSet = new Set(historyItems.map((b) => b.tenantId).filter(Boolean));
          const distinctTenantIds = Array.from(tenantIdSet) as string[];
          if (distinctTenantIds.length > 1) {
            const tenantInfos = await Promise.all(
              distinctTenantIds.map((tid) =>
                api.get(`/tenants/${tid}`).then((r) => r.data).catch(() => null),
              ),
            );
            setVisitedTenants(tenantInfos.filter(Boolean));
          }
        }
      }
    } catch {
      if (!silent) toast.error('Gagal memuat data');
    } finally {
      if (!silent) setPageLoading(false);
      setLastRefreshedAt(new Date());
      setRefreshCountdown(Math.round(QUEUE_AUTO_RELOAD_MS / 1000));
    }
  }, [effectiveTenantId, isQrFlow, isOperatorVariant, isStaffVariant, selectedBookingCustomer, router]);

  // Muat data booking + outlet setelah auth & effectiveTenantId siap (history/today boleh gagal tanpa memblokir tenant)
  useEffect(() => {
    if (authLoading) return;
    if (!user || !effectiveTenantId) return;
    if (isStaffVariant && user.role !== 'staff') return;
    if (isAdminVariant && user.role !== 'tenant_admin' && user.role !== 'super_admin') return;
    if (!isOperatorVariant && user.role !== 'customer') return;
    void loadBookingData();
  }, [
    authLoading,
    user,
    effectiveTenantId,
    selectedBookingCustomer?._id,
    isStaffVariant,
    isAdminVariant,
    isOperatorVariant,
    loadBookingData,
  ]);

  /** Staff membuat booking: tidak ada langkah pilih staff */
  useEffect(() => {
    if (!isStaffVariant) return;
    setBookStep((s) => (s === 'staff' ? 'service' : s));
  }, [isStaffVariant]);

  // Auto-reload antrian / status booking
  useEffect(() => {
    if (!effectiveTenantId) return;
    if (guestBookingFlow) {
      const id = setInterval(() => {
        void api
          .get(`/tenants/${effectiveTenantId}`)
          .then((r) => {
            setTenant(r.data);
          })
          .catch(() => {});
        api
          .get(`/tenants/${effectiveTenantId}/staff/queue`, staffQueueReqConfig)
          .then((r) => {
            if (Array.isArray(r.data)) setStaffQueue(r.data);
          })
          .catch(() => {});
      }, QUEUE_AUTO_RELOAD_MS);
      return () => clearInterval(id);
    }
    if (!user) return;
    if (isStaffVariant && user.role !== 'staff') return;
    if (isAdminVariant && user.role !== 'tenant_admin' && user.role !== 'super_admin') return;
    if (!isOperatorVariant && user.role !== 'customer') return;
    const id = setInterval(() => {
      void loadBookingData({ silent: true });
      if (bookStep === 'staff' && !isStaffVariant) {
        api
          .get(`/tenants/${effectiveTenantId}/staff/queue`, staffQueueReqConfig)
          .then((r) => {
            if (Array.isArray(r.data)) setStaffQueue(r.data);
          })
          .catch(() => {});
      }
    }, QUEUE_AUTO_RELOAD_MS);
    return () => clearInterval(id);
  }, [
    user,
    effectiveTenantId,
    bookStep,
    loadBookingData,
    isStaffVariant,
    guestBookingFlow,
    staffQueueReqConfig,
  ]);

  /** Countdown detik ke auto-refresh berikutnya — tick tiap detik */
  useEffect(() => {
    if (!lastRefreshedAt) return;
    const tick = setInterval(() => {
      setRefreshCountdown((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastRefreshedAt]);

  /** Prefetch / sinkronkan antrian staff dengan tanggal antrian (layanan sudah dipilih; termasuk langkah pilih staff). */
  useEffect(() => {
    if (isStaffVariant) return;
    if (!effectiveTenantId || selectedServices.length === 0) return;
    if ((!user || user.role !== 'customer') && !guestBookingFlow) return;
    if (tenant?.subscriptionOverdue) return;
    const cap = tenant?.dailyBookingQuota;
    const used = tenant?.todayActiveBookingCount ?? 0;
    const todayK = tenant?.quotaTodayDayKey;
    const futurePick = !!(todayK && effectiveQuotaDayKey && effectiveQuotaDayKey > todayK);
    if (!futurePick && cap != null && cap > 0 && used >= cap) return;
    let cancelled = false;
    api
      .get(`/tenants/${effectiveTenantId}/staff/queue`, staffQueueReqConfig)
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
    selectedServices.length,
    tenant?.subscriptionOverdue,
    tenant?.dailyBookingQuota,
    tenant?.todayActiveBookingCount,
    tenant,
    isStaffVariant,
    guestBookingFlow,
    effectiveQuotaDayKey,
    staffQueueReqConfig,
  ]);

  useEffect(() => {
    if (!guestBookingFlow || !tenantIdParam) return;
    setPageLoading(true);
    void (async () => {
      try {
        const tRes = await api.get(`/tenants/${tenantIdParam}`);
        setTenant(tRes.data);
        const dk = String(tRes.data?.quotaTodayDayKey ?? '').trim();
        const qParams = dk.length >= 10 ? { params: { date: dk } as const } : {};
        const [svcRes, qRes] = await Promise.all([
          api.get(`/public/tenants/${tenantIdParam}/services`),
          api.get(`/tenants/${tenantIdParam}/staff/queue`, qParams).catch(() => ({ data: [] as StaffQueueRow[] })),
        ]);
        setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
        setStaffQueue(Array.isArray(qRes.data) ? qRes.data : []);
      } catch {
        toast.error('Gagal memuat layanan');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [guestBookingFlow, tenantIdParam]);

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

  const qFor = (id: string) => effectiveBookingLineQty(serviceQty[id] ?? 1);

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
  const ppnPct = tenant?.ppnPercentage ?? 0;
  const ppnAmount = ppnPct > 0 ? Math.round(totalPrice * ppnPct / 100) : 0;
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.durationMinutes * qFor(s._id), 0),
    [selectedServices, serviceQty],
  );
  /** Jumlah slot kursi = nilai `tenant.bookingSeatCount` dari outlet (telah dinormalisasi API). */
  const seatSlotCount = useMemo(() => {
    const n = tenant?.bookingSeatCount;
    if (n == null || typeof n !== 'number' || !Number.isFinite(n) || n < 1) return null;
    return Math.floor(n);
  }, [tenant]);
  const availableSeatSlots = useMemo(() => {
    if (seatSlotCount == null) return [];
    return Array.from({ length: seatSlotCount }, (_, i) => i + 1).filter(
      (n) => !occupiedSeatPositions.includes(n),
    );
  }, [seatSlotCount, occupiedSeatPositions]);
  // Hanya block saat loading; jika semua kursi penuh, pelanggan masih bisa memilih Take Away
  const seatPickerBlocksSubmit = seatSlotCount != null && seatAvailabilityLoading;
  const bookingLabels = getTenantUiLabels(tenant?.tenantType ?? user?.tenantType);

  const dialogAppointmentWindows = useMemo((): { start: string; end: string }[] => {
    if (isStaffVariant && staffSelfQueueInfo) return windowsForQueueRow(staffSelfQueueInfo);
    if (selectedStaff) return windowsForQueueRow(selectedStaff);
    return [];
  }, [isStaffVariant, staffSelfQueueInfo, selectedStaff]);

  useEffect(() => {
    if (!isStaffVariant || !user?.staffId) {
      setStaffSelfQueueInfo(null);
      return;
    }
    let cancelled = false;
    void api
      .get<StaffQueueRow>(`/staff/${user.staffId}/queue`, staffQueueReqConfig)
      .then((r) => {
        if (!cancelled) setStaffSelfQueueInfo(r.data);
      })
      .catch(() => {
        if (!cancelled) setStaffSelfQueueInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isStaffVariant, user?.staffId, staffQueueReqConfig]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (dialogAppointmentWindows.length === 0) {
      setSelectedAppointmentSlot(null);
      return;
    }
    setSelectedAppointmentSlot((prev) => {
      const stillOk =
        prev &&
        dialogAppointmentWindows.some((w) => w.start === prev.start && w.end === prev.end);
      if (stillOk) return prev;
      return dialogAppointmentWindows[0] ?? null;
    });
  }, [dialogOpen, dialogAppointmentWindows]);

  /** Snapshot outlet terbaru (bookingSeatCount, kuota, tagihan) sebelum konfirmasi — hindari state stale. */
  useEffect(() => {
    if (!dialogOpen || !effectiveTenantId) return;
    let cancelled = false;
    void api
      .get(`/tenants/${effectiveTenantId}`)
      .then((res) => {
        if (!cancelled) setTenant(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, effectiveTenantId]);

  useEffect(() => {
    if (!dialogOpen || seatSlotCount == null || !effectiveTenantId) {
      if (!dialogOpen) {
        setOccupiedSeatPositions([]);
        setSeatAvailabilityLoading(false);
      }
      return;
    }
    let cancelled = false;
    setSeatAvailabilityLoading(true);
    void api
      .get<{ occupiedSeatPositions?: number[] }>(
        `/public/tenants/${effectiveTenantId}/occupied-seat-positions`,
        staffQueueReqConfig,
      )
      .then((res) => {
        if (cancelled) return;
        const raw = res.data?.occupiedSeatPositions;
        const list = Array.isArray(raw)
          ? raw.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)).map(Math.floor)
          : [];
        setOccupiedSeatPositions(list);
      })
      .catch(() => {
        if (!cancelled) setOccupiedSeatPositions([]);
      })
      .finally(() => {
        if (!cancelled) setSeatAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, seatSlotCount, effectiveTenantId, staffQueueReqConfig]);

  useEffect(() => {
    if (seatSlotCount == null) return;
    // Jika pilihan saat ini adalah kursi (bukan take away) dan tidak lagi tersedia, reset ke take away
    setBookingSeatPick((prev) => {
      if (prev === null) return null; // take away — tetap
      return availableSeatSlots.includes(prev) ? prev : null;
    });
  }, [seatSlotCount, availableSeatSlots]);

  const outletQuotaFull = useMemo(() => {
    if (!tenant?.dailyBookingQuota || tenant.dailyBookingQuota <= 0) return false;
    const todayKey = tenant.quotaTodayDayKey;
    const sel = effectiveQuotaDayKey;
    if (todayKey && sel && sel > todayKey) return false;
    return (tenant.todayActiveBookingCount ?? 0) >= tenant.dailyBookingQuota;
  }, [tenant, effectiveQuotaDayKey]);

  const tenantSlotsExceededForCart = useMemo(
    () => tenantQuotaExceeded(tenant, totalCartQty, effectiveQuotaDayKey || undefined),
    [tenant, totalCartQty, effectiveQuotaDayKey],
  );

  // ── Booking actions ────────────────────────────────────────────────────────
  const toggleService = (svc: Service) => {
    if (tenant?.subscriptionOverdue) return;
    if (outletQuotaFull) return;
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s._id === svc._id);
      if (!exists && isServiceOutOfStock(svc)) {
        return prev;
      }
      if (exists) {
        setQtyDraftByService((d) => {
          const n = { ...d };
          delete n[svc._id];
          return n;
        });
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

  // Auto-add atau auto-select layanan dari QR param (addService=serviceId)
  // Prioritas: jika ada booking 'waiting' yang aktif → auto-add via API (tanpa membuat booking baru)
  // Fallback: jika tidak ada booking aktif → auto-select seperti biasa di form
  useEffect(() => {
    if (isStaffVariant || !addServiceParam || services.length === 0 || pageLoading) return;
    if (qrAutoAddAttemptedRef.current) return;

    const target = services.find((s) => s._id === addServiceParam);
    if (!target) return;

    const waitingBooking = activeBookings.find(
      (b) => b.status === 'waiting' && (!effectiveTenantId || b.tenantId === effectiveTenantId),
    );

    if (waitingBooking && user && !isServiceOutOfStock(target)) {
      qrAutoAddAttemptedRef.current = true;
      api
        .post(`/bookings/${waitingBooking._id}/add-items`, {
          items: [{ serviceId: addServiceParam, quantity: 1 }],
        })
        .then(() => {
          toast.success(`${target.name} ditambahkan ke antrian #${waitingBooking.queueNumber}`);
          // Redirect ke /booking tanpa param addService agar refresh tidak auto-add ulang
          router.replace('/booking');
        })
        .catch((err: { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message ?? 'Gagal menambahkan item ke booking';
          toast.error(msg);
          // Fallback: auto-select di form booking baru
          setSelectedServices((prev) => {
            if (prev.find((s) => s._id === target._id)) return prev;
            if (isServiceOutOfStock(target)) return prev;
            setServiceQty((q) => ({ ...q, [target._id]: 1 }));
            return [...prev, target];
          });
        });
      return;
    }

    // Tidak ada booking aktif → auto-select di form seperti biasa
    qrAutoAddAttemptedRef.current = true;
    setSelectedServices((prev) => {
      if (prev.find((s) => s._id === target._id)) return prev;
      if (isServiceOutOfStock(target)) return prev;
      setServiceQty((q) => ({ ...q, [target._id]: 1 }));
      return [...prev, target];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, activeBookings, addServiceParam, pageLoading]);

  const handleGoToStaff = () => {
    if (tenant?.subscriptionOverdue) {
      toast.error('Outlet tidak dapat menerima booking baru saat ini (tagihan berlangganan).');
      return;
    }
    if (tenantQuotaExceeded(tenant, totalCartQty, effectiveQuotaDayKey || undefined)) {
      toast.error(
        'Kuota antrian aktif harian outlet tidak cukup untuk jumlah layanan ini. Kurangi pilihan atau coba lagi nanti.',
      );
      return;
    }
    if (selectedServices.length === 0) { toast.error('Pilih minimal satu layanan'); return; }
    if (!assertGuestHasName()) return;
    setSelectedStaff(null);
    setBookStep('staff');
    setStaffQueueLoading(true);
    api
      .get(`/tenants/${effectiveTenantId}/staff/queue`, staffQueueReqConfig)
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

  /** Staff: langsung ke konfirmasi booking (tanpa pilih staff); bayar di halaman antrian. */
  const handleStaffOpenCheckout = () => {
    if (tenant?.subscriptionOverdue) {
      toast.error('Outlet tidak dapat menerima booking baru saat ini (tagihan berlangganan).');
      return;
    }
    if (tenantQuotaExceeded(tenant, totalCartQty, effectiveQuotaDayKey || undefined)) {
      toast.error(
        'Kuota antrian aktif harian outlet tidak cukup untuk jumlah layanan ini. Kurangi pilihan atau coba lagi nanti.',
      );
      return;
    }
    if (selectedServices.length === 0) {
      toast.error('Pilih minimal satu layanan');
      return;
    }
    setSelectedStaff(null);
    setDialogOpen(true);
  };

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      await loadBookingData({ silent: true });
    } finally {
      setManualRefreshing(false);
    }
  };

  const addItemQFor = (id: string) => effectiveBookingLineQty(addItemQty[id] ?? 1);

  const openAddItemDialog = (bookingId: string) => {
    setAddItemBookingId(bookingId);
    setAddItemSelected([]);
    setAddItemQty({});
    setAddItemQtyDraft({});
    setAddItemSearch('');
  };

  const toggleAddItem = (svc: Service) => {
    if (isServiceOutOfStock(svc)) return;
    setAddItemSelected((prev) => {
      const exists = prev.find((s) => s._id === svc._id);
      if (exists) {
        setAddItemQty((q) => { const n = { ...q }; delete n[svc._id]; return n; });
        return prev.filter((s) => s._id !== svc._id);
      }
      setAddItemQty((q) => ({ ...q, [svc._id]: 1 }));
      return [...prev, svc];
    });
  };

  const handleAddItems = async () => {
    if (!addItemBookingId || addItemSelected.length === 0) return;
    setAddItemSubmitting(true);
    try {
      await api.post(`/bookings/${addItemBookingId}/add-items`, {
        items: addItemSelected.map((s) => ({
          serviceId: s._id,
          quantity: addItemQFor(s._id),
        })),
      });
      toast.success('Item berhasil ditambahkan ke booking');
      setAddItemBookingId(null);
      await loadBookingData({ silent: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal menambahkan item';
      toast.error(msg);
    } finally {
      setAddItemSubmitting(false);
    }
  };

  const handleBook = async () => {
    if (tenant?.subscriptionOverdue) {
      toast.error('Outlet tidak dapat menerima booking baru saat ini (tagihan berlangganan).');
      return;
    }
    if (tenantQuotaExceeded(tenant, totalCartQty, effectiveQuotaDayKey || undefined)) {
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
    if (selectedStaff && selectedStaff.canBookOnSelectedDay === false) {
      toast.error(
        `${bookingLabels.staffSingular} ini tidak tersedia pada tanggal antrian yang dipilih (di luar jadwal).`,
      );
      return;
    }
    if (
      isStaffVariant &&
      staffSelfQueueInfo &&
      staffSelfQueueInfo.canBookOnSelectedDay === false
    ) {
      toast.error('Anda tidak tersedia pada tanggal antrian ini menurut jadwal yang di-set admin.');
      return;
    }
    if (isStaffVariant && (!user?.staffId || String(user.staffId).trim() === '')) {
      toast.error('Profil pelaksana tidak terpasang. Minta admin menautkan akun atau masuk ulang.');
      return;
    }
    // Validasi nama tamu saat staff mode = guest
    if (isStaffVariant && staffCustomerMode === 'guest' && !staffGuestName.trim()) {
      toast.error('Nama customer wajib diisi');
      setStaffGuestNameAttempted(true);
      return;
    }
    if (isAdminVariant && staffCustomerMode === 'guest' && !staffGuestName.trim()) {
      toast.error('Nama customer wajib diisi');
      setStaffGuestNameAttempted(true);
      return;
    }
    if (isAdminVariant && staffCustomerMode === 'existing' && !selectedBookingCustomer) {
      toast.error('Pilih pelanggan terdaftar atau gunakan mode Tamu Baru');
      return;
    }
    if (tenant?.requireNotes === true && !notes.trim()) {
      toast.error('Catatan wajib diisi');
      return;
    }
    if (selectedServices.length === 0) return;
    if (!assertGuestHasName()) return;
    if (seatSlotCount != null) {
      if (seatAvailabilityLoading) {
        toast.error('Tunggu sebentar, memuat ketersediaan kursi.');
        return;
      }
      // bookingSeatPick null = take away → selalu boleh lanjut
      if (bookingSeatPick !== null && !availableSeatSlots.includes(bookingSeatPick)) {
        toast.error(`${bookingLabels.seatLabel} yang dipilih sudah tidak tersedia. Pilih ${bookingLabels.seatLabel.toLowerCase()} lain atau pilih "${bookingLabels.takeAwayLabel}".`);
        return;
      }
    }
    const staffIdForAppt = isStaffVariant ? user?.staffId : selectedStaff?.staffId;
    const apptWindows =
      isStaffVariant && staffSelfQueueInfo
        ? windowsForQueueRow(staffSelfQueueInfo)
        : selectedStaff
          ? windowsForQueueRow(selectedStaff)
          : [];
    const needsApptSlot = Boolean(staffIdForAppt && apptWindows.length > 0);
    if (needsApptSlot && !selectedAppointmentSlot) {
      toast.error('Pilih jam kunjungan untuk staff.');
      return;
    }
    setSubmitting(true);
    try {
      /** Selalu kirim tanggal kalender yang dipakai UI (bukan hanya jika ≠ hari ini), agar konsisten dengan zona kuota backend. */
      const bookingDayKeyOk =
        typeof effectiveQuotaDayKey === 'string' &&
        effectiveQuotaDayKey.length >= 10 &&
        /^\d{4}-\d{2}-\d{2}$/.test(effectiveQuotaDayKey);
      const bookingDatePayload =
        tenant?.allowBookOnFutureDates === true && bookingDayKeyOk
          ? { bookingDate: effectiveQuotaDayKey }
          : {};
      const appointmentBody =
        staffIdForAppt && selectedAppointmentSlot ? { appointmentSlot: selectedAppointmentSlot } : {};
      const res = guestBookingFlow && tenantIdParam
        ? await api.post(`/public/tenants/${tenantIdParam}/bookings`, {
            guestName: guestFormName.trim(),
            guestPhone: guestFormPhone.trim() || undefined,
            items: selectedServices.map((s) => ({ serviceId: s._id, quantity: qFor(s._id) })),
            staffId: selectedStaff?.staffId,
            notes,
            ...(seatSlotCount != null ? { seatPosition: bookingSeatPick ?? null } : {}),
            ...bookingDatePayload,
            ...appointmentBody,
          })
        : await api.post('/bookings', {
            tenantId: effectiveTenantId,
            items: selectedServices.map((s) => ({ serviceId: s._id, quantity: qFor(s._id) })),
            staffId: isStaffVariant ? user?.staffId ?? undefined : selectedStaff?.staffId,
            notes,
            // Staff mode tamu: kirim nama + HP customer baru
            ...(isOperatorVariant && staffCustomerMode === 'guest' && staffGuestName.trim()
              ? {
                  guestName: staffGuestName.trim(),
                  ...(staffGuestPhone.trim() ? { guestPhone: staffGuestPhone.trim() } : {}),
                }
              : {}),
            // Staff/admin mode pelanggan terdaftar: kirim customerId jika dipilih
            ...(isOperatorVariant && staffCustomerMode === 'existing' && selectedBookingCustomer
              ? { customerId: selectedBookingCustomer._id }
              : {}),
            ...(seatSlotCount != null ? { seatPosition: bookingSeatPick ?? null } : {}),
            ...bookingDatePayload,
            ...appointmentBody,
          });
      const result = res.data as BookingResult;
      setDialogOpen(false);
      setNotes('');

      if (isQrFlow) {
        setBookingResult(result);
        if (!guestBookingFlow) {
          void loadBookingData();
        }
      } else if (isStaffVariant) {
        const customerLabel =
          staffCustomerMode === 'guest' && staffGuestName.trim()
            ? staffGuestName.trim()
            : selectedBookingCustomer?.name ?? null;
        const okMsg = customerLabel
          ? `Booking untuk ${customerLabel} berhasil! Nomor antrian: #${result.queueNumber}`
          : `Booking berhasil! Nomor antrian: #${result.queueNumber}`;
        toast.success(okMsg, { duration: 5000 });
        setBookStep('service');
        setSelectedServices([]);
        setSelectedStaff(null);
        setStaffGuestName('');
        setStaffGuestPhone('');
        setStaffGuestNameAttempted(false);
        void loadBookingData();
        router.push('/staff');
      } else if (isAdminVariant) {
        const customerLabel =
          staffCustomerMode === 'guest' && staffGuestName.trim()
            ? staffGuestName.trim()
            : selectedBookingCustomer?.name ?? null;
        const okMsg = customerLabel
          ? `Order untuk ${customerLabel} berhasil! Nomor antrian: #${result.queueNumber}`
          : `Order berhasil! Nomor antrian: #${result.queueNumber}`;
        toast.success(okMsg, { duration: 5000 });
        setBookStep('service');
        setSelectedServices([]);
        setSelectedStaff(null);
        setStaffGuestName('');
        setStaffGuestPhone('');
        setStaffGuestNameAttempted(false);
        setSelectedBookingCustomer(null);
        void loadBookingData();
        router.push('/pos');
      } else {
        const okMsg = `Booking berhasil! Nomor antrian Anda: #${result.queueNumber}`;
        toast.success(okMsg, { duration: 6000 });
        setBookStep('service');
        setSelectedServices([]);
        setSelectedStaff(null);
        void loadBookingData();
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

  if (!user && isQrFlow && !qrTenantReady) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user && isQrFlow && qrTenantReady && !tenant) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
        <QrCodeScannerIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography color="text.secondary">Outlet tidak ditemukan atau tidak tersedia.</Typography>
      </Box>
    );
  }

  // ── QR Registration (not yet authenticated, outlet wajib login) ─────────────
  if (!user && isQrFlow && tenant?.requireLoginOnCreateBooking === true) {
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
  if (!user && !guestBookingFlow) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
        <QrCodeScannerIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography color="text.secondary">Scan QR code di outlet untuk mulai booking</Typography>
      </Box>
    );
  }

  // ── QR Flow Confirmed Screen (login atau tamu) ─────────────────────────────
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
            {/* Tampilkan posisi kursi atau take away jika fitur kursi aktif */}
            {tenant?.bookingSeatCount != null && Number(tenant.bookingSeatCount) >= 1 && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">{bookingLabels.seatLabel}</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {bookingResult.seatPosition != null && Number.isFinite(Number(bookingResult.seatPosition))
                    ? `${bookingLabels.seatLabel} ${Number(bookingResult.seatPosition)}`
                    : bookingLabels.takeAwayLabel}
                </Typography>
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

        {!user && (
          <Alert severity="info" sx={{ mb: 2, maxWidth: 340, textAlign: 'left', borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Lihat status antrian
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Silakan login untuk melihat status antrian dan perkembangan booking Anda di aplikasi.
            </Typography>
          </Alert>
        )}

        {!user && tenantIdParam && (
          <Button
            variant="contained"
            fullWidth
            startIcon={<LockIcon />}
            onClick={() => {
              const phoneQuery = guestFormPhone.trim()
                ? `&phone=${encodeURIComponent(guestFormPhone.trim())}`
                : '';
              router.push(
                `/login?redirect=${encodeURIComponent(`/booking?tenantId=${tenantIdParam}&type=booking`)}${phoneQuery}`,
              );
            }}
            sx={{ mb: 1.5, borderRadius: 3, maxWidth: 340, py: 1.2, fontWeight: 700 }}
          >
            Masuk
          </Button>
        )}

        <Button
          variant={user ? 'contained' : 'outlined'}
          onClick={() => router.push(user ? '/history' : '/')}
          sx={{ mb: 1.5, borderRadius: 3, px: 4, py: 1.2, fontWeight: 700, maxWidth: 340 }}
        >
          {user ? 'Lihat Riwayat' : 'Selesai'}
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

  const showBookingFab = showFloatingCartSummary && !tenant?.subscriptionOverdue;
  const showPickStaffFab = showBookingFab && !isStaffVariant;
  const showStaffPayFab = showBookingFab && isStaffVariant;

  const bookingFabDisabled = outletQuotaFull || tenantSlotsExceededForCart;

  /** Di atas FAB aksi booking; jika FAB disembunyikan (mis. tagihan), rapat di atas bottom nav */
  const floatingCartBottom = showBookingFab
    ? { xs: 158, sm: 168 }
    : { xs: 80, sm: 88 };

  // ── Authenticated Booking Flow ────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100svh',
        pb: showFloatingCartSummary ? (showBookingFab ? 42 : 30) : 24,
        background: (t) =>
          `linear-gradient(180deg, ${t.palette.background.default} 0%, ${t.palette.background.paper} 100%)`,
      }}
    >
      <PageHeader
        title={bookingLabels.bookingPageTitle}
        back={(bookStep === 'staff' && !isStaffVariant) || isOperatorVariant}
        onBack={
          bookStep === 'staff' && !isStaffVariant
            ? () => setBookStep('service')
            : isStaffVariant
              ? () => router.push('/staff')
              : isAdminVariant
                ? () => router.push('/customers')
                : undefined
        }
        right={
          (!isStaffVariant && user?.role === 'customer') ||
          (visitedTenants.length > 1 && bookStep !== 'staff' && !isStaffVariant) ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {!isStaffVariant && user?.role === 'customer' && (
                <SwitchOutletControl onSwitched={() => void loadBookingData()} />
              )}
              {visitedTenants.length > 1 && bookStep !== 'staff' && !isStaffVariant ? (
                <Button color="inherit" size="small" startIcon={<QrCodeScannerIcon />}
                  onClick={() => setTenantSelectorOpen(true)}
                >
                  Ganti Salon
                </Button>
              ) : null}
            </Box>
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

      {guestBookingFlow && (
        <Box sx={{ px: 2, pt: 2, pb: 1.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Booking tanpa akun — nama wajib; nomor HP opsional (diperlukan untuk melihat status antrian).
          </Typography>
          <TextField
            fullWidth
            required
            label="Nama"
            value={guestFormName}
            onChange={(e) => setGuestFormName(e.target.value)}
            inputRef={guestNameInputRef}
            error={guestNameNeedsAttention}
            helperText={guestNameNeedsAttention ? 'Nama wajib diisi' : undefined}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="Nomor HP (isi jika ingin melihat status antrian)"
            placeholder="08xx xxxx xxxx"
            value={guestFormPhone}
            onChange={(e) => setGuestFormPhone(e.target.value.replace(/\D/g, ''))}
            inputMode="tel"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {isOperatorVariant && tenant && effectiveTenantId && (
        <Box sx={{ px: 2, pt: 2, pb: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          {tenant.allowBookOnFutureDates === true && tenant.quotaTodayDayKey && (
            <TextField
              type="date"
              label="Tanggal antrian"
              size="small"
              value={bookingQuotaDayKey || tenant.quotaTodayDayKey}
              onChange={(e) => {
                const v = e.target.value;
                if (!v || !tenant.quotaTodayDayKey) return;
                if (v < tenant.quotaTodayDayKey) return;
                setBookingQuotaDayKey(v);
              }}
              inputProps={{ min: tenant.quotaTodayDayKey }}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ mb: 2, maxWidth: 360 }}
              helperText={isAdminVariant ? 'Tanggal antrian untuk order ini.' : 'Booking staff memakai tanggal antrian ini.'}
            />
          )}
          {/* Toggle mode customer */}
          <ToggleButtonGroup
            value={staffCustomerMode}
            exclusive
            onChange={(_, v) => { if (v) setStaffCustomerMode(v); }}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="guest" sx={{ gap: 0.75, fontWeight: 600, fontSize: '0.8rem' }}>
              <PersonAddIcon fontSize="small" />
              Tamu Baru
            </ToggleButton>
            <ToggleButton value="existing" sx={{ gap: 0.75, fontWeight: 600, fontSize: '0.8rem' }}>
              <ManageAccountsIcon fontSize="small" />
              Pelanggan Terdaftar
            </ToggleButton>
          </ToggleButtonGroup>

          {staffCustomerMode === 'guest' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                fullWidth
                label="Nama Customer"
                placeholder="Wajib diisi"
                value={staffGuestName}
                onChange={(e) => {
                  setStaffGuestName(e.target.value);
                  if (e.target.value.trim()) setStaffGuestNameAttempted(false);
                }}
                error={staffGuestNameAttempted && !staffGuestName.trim()}
                helperText={staffGuestNameAttempted && !staffGuestName.trim() ? 'Nama wajib diisi' : undefined}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><PersonIcon color="action" fontSize="small" /></InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="No. HP Customer (opsional)"
                placeholder="Jika diisi, akan terdaftar/teridentifikasi"
                value={staffGuestPhone}
                onChange={(e) => setStaffGuestPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="tel"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><PhoneIcon color="action" fontSize="small" /></InputAdornment>
                  ),
                }}
              />
            </Box>
          ) : (
            <Autocomplete
              options={customerOptions}
              loading={customersLoading}
              value={selectedBookingCustomer}
              onChange={(_, v) => setSelectedBookingCustomer(v)}
              onInputChange={(_, v) => setCustomerSearchInput(v)}
              getOptionLabel={(o) => `${o.name} · ${o.phone}`}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cari pelanggan terdaftar"
                  placeholder="Cari nama atau nomor HP…"
                  helperText={
                    isAdminVariant
                      ? 'Wajib pilih pelanggan atau gunakan mode Tamu Baru'
                      : 'Kosong = booking atas nama akun staff'
                  }
                />
              )}
            />
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
          {isStaffVariant ? (
            <>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Outlet belum terpasang pada akun staff Anda.
              </Typography>
              <Button variant="contained" onClick={() => router.push('/staff')}>
                Kembali ke antrian
              </Button>
            </>
          ) : isAdminVariant ? (
            <>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Akun admin tidak terhubung ke outlet.
              </Typography>
              <Button variant="contained" onClick={() => router.push('/customers')}>
                Kembali ke pelanggan
              </Button>
            </>
          ) : (
            <>
              <QrCodeScannerIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">
                Scan QR code di outlet untuk mulai booking
              </Typography>
            </>
          )}
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
                {/* Header: label + tombol refresh + info auto-refresh */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="overline" sx={{ color: 'warning.dark', fontWeight: 700, letterSpacing: 1.2, fontSize: '0.65rem' }}>
                    {activeBookings.length > 1 ? `Antrian aktif (${activeBookings.length})` : 'Booking aktif'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                      {refreshCountdown > 0
                        ? `refresh dalam ${refreshCountdown}d`
                        : 'memperbarui…'}
                    </Typography>
                    <Tooltip title="Perbarui sekarang">
                      <span>
                        <IconButton
                          size="small"
                          onClick={handleManualRefresh}
                          disabled={manualRefreshing}
                          sx={{ p: 0.5 }}
                        >
                          {manualRefreshing
                            ? <CircularProgress size={14} color="inherit" />
                            : <RefreshIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
                {lastRefreshedAt && (
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: '0.6rem', mb: 1, lineHeight: 1 }}>
                    {(() => {
                      const sec = Math.round((Date.now() - lastRefreshedAt.getTime()) / 1000);
                      if (sec < 5) return 'Baru diperbarui';
                      if (sec < 60) return `Diperbarui ${sec} detik lalu`;
                      return `Diperbarui ${Math.round(sec / 60)} menit lalu`;
                    })()}
                    {' · auto refresh setiap '}
                    {Math.round(QUEUE_AUTO_RELOAD_MS / 60000)} menit
                  </Typography>
                )}
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
                    {tenant?.showBookingQty && ab.services && ab.services.length > 0 ? (
                      <Box sx={{ mt: 0.5 }}>
                        {ab.services.map((line, li) => {
                          const qty = effectiveBookingLineQty(line.quantity);
                          const sub = line.lineSubtotal != null && Number.isFinite(line.lineSubtotal)
                            ? line.lineSubtotal
                            : Math.round(line.unitPrice * qty);
                          return (
                            <Box key={li} sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {line.serviceName}
                                {qty !== 1 && (
                                  <Typography component="span" variant="caption" fontWeight={700} color="primary.main" sx={{ ml: 0.5 }}>
                                    ×{formatBookingQtyDisplay(qty)}{line.unit ? ` ${line.unit}` : ''}
                                  </Typography>
                                )}
                              </Typography>
                              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flexShrink: 0 }}>
                                Rp {sub.toLocaleString('id-ID')}
                              </Typography>
                            </Box>
                          );
                        })}
                        {ab.services.length > 1 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            Total: <strong>Rp {(ab.totalSubtotal ?? ab.services.reduce((s, l) => {
                              const q = effectiveBookingLineQty(l.quantity);
                              return s + (l.lineSubtotal != null && Number.isFinite(l.lineSubtotal) ? l.lineSubtotal : Math.round(l.unitPrice * q));
                            }, 0)).toLocaleString('id-ID')}</strong>
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body1" fontWeight={600} sx={{ mt: 0.25 }}>{bookingServicesLabel(ab)}</Typography>
                    )}
                    {ab.staffName && (
                      <Typography variant="body2" color="text.secondary">
                        {bookingLabels.staffSingular}: {ab.staffName}
                      </Typography>
                    )}
                    {ab.appointmentSlot &&
                      typeof ab.appointmentSlot.start === 'string' &&
                      typeof ab.appointmentSlot.end === 'string' && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                        Janji:{' '}
                        <Box component="span" fontWeight={700} color="primary.main">
                          {formatSlotRangeLabel(ab.appointmentSlot)}
                        </Box>
                      </Typography>
                    )}
                    <Chip
                      label={statusLabel(ab.status)}
                      color={statusColor(ab.status) as 'warning' | 'info' | 'secondary' | 'success' | 'default'}
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
                    {/* Tombol tambah item — hanya saat waiting & user login */}
                    <br/>
                    {ab.status === 'waiting' && user && (
                      
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
                        onClick={() => openAddItemDialog(ab._id)}
                        sx={{ mt: 1.5, borderRadius: 2, fontSize: '0.75rem' }}
                      >
                        Tambah Item
                      </Button>
                    )}
                  </Box>
                ))}
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
                    label={`${totalCartQty} items${selectedServices.length > 1 ? ` · ${selectedServices.length} jenis` : ''}`}
                    color="primary" size="small"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>

              {tenant?.allowBookOnFutureDates === true && tenant.quotaTodayDayKey && (
                <TextField
                  type="date"
                  label="Tanggal antrian"
                  size="small"
                  value={bookingQuotaDayKey || tenant.quotaTodayDayKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v || !tenant.quotaTodayDayKey) return;
                    if (v < tenant.quotaTodayDayKey) return;
                    setBookingQuotaDayKey(v);
                  }}
                  inputProps={{ min: tenant.quotaTodayDayKey }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  sx={{ maxWidth: 360, mb: 2 }}
                  helperText="Antrian mengikuti tanggal dan zona waktu operasional outlet."
                />
              )}

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
                    const stockOut = isServiceOutOfStock(svc);
                    const blockedPick = stockOut && !selected;
                    return (
                      <Card
                        key={svc._id}
                        onClick={() => toggleService(svc)}
                        sx={{
                          cursor:
                            tenant?.subscriptionOverdue || outletQuotaFull || blockedPick
                              ? 'default'
                              : 'pointer',
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
                            tenant?.subscriptionOverdue || outletQuotaFull || blockedPick ? 0.55 : 1,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '14px !important' }}>
                          <Checkbox
                            checked={selected} color="primary" sx={{ p: 0 }}
                            disabled={
                              !!tenant?.subscriptionOverdue ||
                              outletQuotaFull ||
                              blockedPick
                            }
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography fontWeight={400} noWrap sx={{ flex: 1, minWidth: 0 }}>{svc.name}</Typography>
                              {(svc.description || svc.photoUrl) && (
                                <IconButton
                                  size="small"
                                  sx={{ p: 0.25, flexShrink: 0, color: 'text.disabled' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setServiceDetailDialog({ open: true, service: svc });
                                  }}
                                >
                                  <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              )}
                            </Box>
                            {svc.description && (
                              <Typography variant="body2" color="text.secondary" noWrap>{svc.description}</Typography>
                            )}
                            <Chip
                              icon={<AccessTimeIcon sx={{ fontSize: '12px !important' }} />}
                              label={formatDuration(svc.durationMinutes)}
                              size="small" variant="outlined"
                              sx={{ mt: 0.75, height: 22, fontSize: '0.7rem', borderRadius: 2, borderColor: 'rgba(0,0,0,0.15)' }}
                            />
                            {stockOut && (
                              <Chip
                                label="Stok habis"
                                size="small"
                                color="error"
                                variant="filled"
                                sx={{ mt: 0.75, ml: 0.5, height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                              />
                            )}
                            {!stockOut &&
                              tenant?.showBookingQty &&
                              svc.stockQty != null &&
                              Number.isFinite(Number(svc.stockQty)) &&
                              (tenant?.outOfStockQtyReminder ?? 0) > 0 &&
                              Number(svc.stockQty) < (tenant?.outOfStockQtyReminder ?? 0) && (
                                <Chip
                                  label={`Sisa ${Number(svc.stockQty)}${svc.unit ? ` ${svc.unit}` : ''}`}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ mt: 0.75, ml: 0.5, height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                />
                              )}
                            <Typography
                            fontWeight={300} color="primary" variant="h6"
                            sx={{ whiteSpace: 'nowrap', letterSpacing: -0.5 }}
                          >
                            Rp {svc.price.toLocaleString('id-ID')}
                          </Typography>
                            {selected && tenant?.showBookingQty && (
                              <Box mt={1} onClick={(e) => e.stopPropagation()}>
                                <TextField
                                  size="small"
                                  label="Qty"
                                  value={
                                    qtyDraftByService[svc._id] ?? formatBookingQtyDisplay(qFor(svc._id))
                                  }
                                  onChange={(e) =>
                                    setQtyDraftByService((d) => ({ ...d, [svc._id]: e.target.value }))
                                  }
                                  onBlur={() => {
                                    const raw = qtyDraftByService[svc._id];
                                    if (raw === undefined) return;
                                    const p = parseBookingQuantityInput(raw);
                                    setQtyDraftByService(({ [svc._id]: _, ...rest }) => rest);
                                    if (p != null) {
                                      const maxStock =
                                        svc.stockQty != null && Number.isFinite(Number(svc.stockQty))
                                          ? Number(svc.stockQty)
                                          : null;
                                      if (maxStock !== null && p > maxStock) {
                                        toast.error(
                                          `Qty melebihi stok "${svc.name}". Maksimum: ${maxStock}${svc.unit ? ` ${svc.unit}` : ''}.`,
                                        );
                                        setServiceQty((q) => ({ ...q, [svc._id]: maxStock }));
                                      } else {
                                        setServiceQty((q) => ({ ...q, [svc._id]: p }));
                                      }
                                    } else {
                                      toast.error(`Qty tidak valid. ${BOOKING_QTY_DECIMAL_HINT}`);
                                    }
                                  }}
                                  helperText={(() => {
                                    const maxStock =
                                      svc.stockQty != null && Number.isFinite(Number(svc.stockQty))
                                        ? Number(svc.stockQty)
                                        : null;
                                    const reminder = tenant?.outOfStockQtyReminder ?? 0;
                                    // Tampilkan info stok hanya saat stok menipis (< reminder) atau di-set
                                    const showStock =
                                      maxStock !== null && reminder > 0 && maxStock < reminder;
                                    const stockHint = showStock
                                      ? `Stok tersedia: ${maxStock}${svc.unit ? ` ${svc.unit}` : ''}.`
                                      : null;
                                    const unitHint = svc.unit ? `Satuan: ${svc.unit}.` : null;
                                    return [stockHint, unitHint].filter(Boolean).join(' ') || BOOKING_QTY_DECIMAL_HINT;
                                  })()}
                                  FormHelperTextProps={{ sx: { fontSize: '0.65rem', lineHeight: 1.25 } }}
                                  inputProps={{ inputMode: 'decimal' }}
                                  sx={{ maxWidth: 160, mt: 0.5 }}
                                />
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

          {/* Step 2: Select staff (hanya pelanggan) */}
          {bookStep === 'staff' && selectedServices.length > 0 && !isStaffVariant && (
            <>
              {tenant?.allowBookOnFutureDates === true && tenant.quotaTodayDayKey && (
                <TextField
                  type="date"
                  label="Tanggal antrian"
                  size="small"
                  value={bookingQuotaDayKey || tenant.quotaTodayDayKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v || !tenant.quotaTodayDayKey) return;
                    if (v < tenant.quotaTodayDayKey) return;
                    setBookingQuotaDayKey(v);
                  }}
                  inputProps={{ min: tenant.quotaTodayDayKey }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  sx={{ maxWidth: 360, mb: 2 }}
                  helperText="Ubah tanggal untuk melihat ketersediaan staf di hari lain."
                />
              )}
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
                          {tenant?.showBookingQty
                            ? ` ×${formatBookingQtyDisplay(qFor(s._id))}${s.unit ? ` ${s.unit}` : ''}`
                            : ''}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600} color="primary" sx={{ flexShrink: 0 }}>
                        Rp {(s.price * qFor(s._id)).toLocaleString('id-ID')}
                      </Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1, opacity: 0.35, borderColor: 'rgba(0,0,0,0.1)' }} />
                  {ppnPct > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">PPN {ppnPct}%</Typography>
                      <Typography variant="body2" color="text.secondary">Rp {ppnAmount.toLocaleString('id-ID')}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Total</Typography>
                    <Typography fontWeight={600} color="primary">Rp {(totalPrice + ppnAmount).toLocaleString('id-ID')}</Typography>
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
                      onClick={() => {
                        if (!assertGuestHasName()) return;
                        setSelectedStaff(null);
                        setDialogOpen(true);
                      }}
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
                    const staffDayBlocked = b.canBookOnSelectedDay === false;
                    const cardDisabled =
                      !!tenant?.subscriptionOverdue ||
                      outletQuotaFull ||
                      tenantSlotsExceededForCart ||
                      staffFull ||
                      staffUnavailable ||
                      staffDayBlocked;
                    return (
                      <Card
                        key={b.staffId}
                        onClick={() => {
                          if (cardDisabled) return;
                          if (!assertGuestHasName()) return;
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
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
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
                            <Box flex={1} minWidth={0}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.25, minWidth: 0 }}>
                                <Typography fontWeight={500} fontSize="0.97rem" sx={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                                  {b.staffName}
                                </Typography>
                                <Tooltip title="Lihat jadwal mingguan">
                                  <IconButton
                                    size="small"
                                    sx={{ p: 0.35, flexShrink: 0, color: 'text.secondary', mt: -0.25 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStaffScheduleDialogRow(b);
                                    }}
                                    aria-label={`Jadwal ${b.staffName}`}
                                  >
                                    <InfoOutlinedIcon sx={{ fontSize: 20 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              {b.speciality != null && String(b.speciality).trim() !== '' && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.35, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}
                                >
                                  {String(b.speciality).trim()}
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.35, flexWrap: 'wrap' }}>
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
                              {(staffDayBlocked || staffUnavailable || staffFull) && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75, alignItems: 'center' }}>
                                  {staffDayBlocked && (
                                    <Chip
                                      label="Tidak tersedia di tanggal ini"
                                      color="warning"
                                      size="small"
                                      sx={{ fontWeight: 700 }}
                                    />
                                  )}
                                  {staffUnavailable && (
                                    <Chip
                                      label="Tidak terima booking"
                                      color="default"
                                      size="small"
                                      sx={{ fontWeight: 700 }}
                                    />
                                  )}
                                  {staffFull && !staffUnavailable && (
                                    <Chip label="Kuota penuh" color="error" size="small" sx={{ fontWeight: 700 }} />
                                  )}
                                </Box>
                              )}
                              {!(staffUnavailable || staffDayBlocked || staffFull) && (
                                <Box sx={{ mt: 0.75 }}>
                                  <Chip
                                    icon={<HourglassTopIcon sx={{ fontSize: '12px !important' }} />}
                                    label={waitLabel(b.estimatedWaitMinutes)}
                                    color={waitColor(b.estimatedWaitMinutes)}
                                    size="small"
                                    sx={{ fontWeight: 700, height: 26 }}
                                  />
                                </Box>
                              )}
                              {b.queueCount > 0 && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                  {b.queueCount} orang antri
                                  {b.dailyBookingQuota != null && b.dailyBookingQuota > 0
                                    ? ` · max ${b.dailyBookingQuota}/hari`
                                    : ''}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          {(() => {
                            const wins = windowsForQueueRow(b);
                            if (wins.length === 0) return null;
                            return (
                              <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                                  Jam buka (
                                  {b.selectedBookingDayKey && /^\d{4}-\d{2}-\d{2}$/.test(b.selectedBookingDayKey)
                                    ? new Date(`${b.selectedBookingDayKey}T12:00:00`).toLocaleDateString('id-ID', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                      })
                                    : 'tanggal antrian'}
                                  )
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {wins.map((w) => (
                                    <Chip
                                      key={`${b.staffId}-${w.start}-${w.end}`}
                                      size="small"
                                      variant="outlined"
                                      label={formatSlotRangeLabel(w)}
                                      color="success"
                                      sx={{ fontSize: '0.68rem', fontWeight: 600 }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Box
                    onClick={() => {
                      if (tenant?.subscriptionOverdue || outletQuotaFull || tenantSlotsExceededForCart) return;
                      if (!assertGuestHasName()) return;
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

      {/* Dialog Tambah Item ke Booking Aktif */}
      <Dialog
        open={addItemBookingId !== null}
        onClose={() => !addItemSubmitting && setAddItemBookingId(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddCircleOutlineIcon color="primary" />
            Tambah Item
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <TextField
            fullWidth size="small"
            placeholder="Cari layanan…"
            value={addItemSearch}
            onChange={(e) => setAddItemSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
            {services
              .filter((svc) => {
                const q = addItemSearch.trim().toLowerCase();
                if (q && !svc.name.toLowerCase().includes(q) && !(svc.description ?? '').toLowerCase().includes(q)) return false;
                return true;
              })
              .map((svc) => {
                const sel = !!addItemSelected.find((s) => s._id === svc._id);
                const stockOut = isServiceOutOfStock(svc);
                const lowStock =
                  !stockOut &&
                  svc.stockQty != null &&
                  Number.isFinite(Number(svc.stockQty)) &&
                  (tenant?.outOfStockQtyReminder ?? 0) > 0 &&
                  Number(svc.stockQty) < (tenant?.outOfStockQtyReminder ?? 0);
                return (
                  <Card
                    key={svc._id}
                    onClick={() => !stockOut && toggleAddItem(svc)}
                    sx={{
                      cursor: stockOut ? 'default' : 'pointer',
                      border: sel
                        ? (t) => `1.5px solid ${t.palette.primary.main}`
                        : '1.5px solid rgba(0,0,0,0.08)',
                      borderRadius: 2.5,
                      opacity: stockOut ? 0.5 : 1,
                      bgcolor: sel ? (t) => `${t.palette.primary.main}0A` : 'background.paper',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                      <Checkbox checked={sel} color="primary" size="small" sx={{ p: 0 }}
                        disabled={stockOut}
                        onChange={() => !stockOut && toggleAddItem(svc)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={500} noWrap>{svc.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.25 }}>
                          <Typography variant="caption" color="primary" fontWeight={600}>
                            Rp {svc.price.toLocaleString('id-ID')}
                          </Typography>
                          {stockOut && (
                            <Chip label="Stok habis" size="small" color="error"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                          )}
                          {lowStock && tenant?.showBookingQty && (
                            <Chip label={`Sisa ${Number(svc.stockQty)}${svc.unit ? ` ${svc.unit}` : ''}`}
                              size="small" color="warning" variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                          )}
                        </Box>
                        {sel && tenant?.showBookingQty && (
                          <Box mt={0.75} onClick={(e) => e.stopPropagation()}>
                            <TextField
                              size="small" label="Qty"
                              value={addItemQtyDraft[svc._id] ?? formatBookingQtyDisplay(addItemQFor(svc._id))}
                              onChange={(e) =>
                                setAddItemQtyDraft((d) => ({ ...d, [svc._id]: e.target.value }))
                              }
                              onBlur={() => {
                                const raw = addItemQtyDraft[svc._id];
                                if (raw === undefined) return;
                                const p = parseBookingQuantityInput(raw);
                                setAddItemQtyDraft(({ [svc._id]: _, ...rest }) => rest);
                                if (p != null) {
                                  const maxStock =
                                    svc.stockQty != null && Number.isFinite(Number(svc.stockQty))
                                      ? Number(svc.stockQty)
                                      : null;
                                  if (maxStock !== null && p > maxStock) {
                                    toast.error(`Qty melebihi stok "${svc.name}". Maks: ${maxStock}${svc.unit ? ` ${svc.unit}` : ''}.`);
                                    setAddItemQty((q) => ({ ...q, [svc._id]: maxStock }));
                                  } else {
                                    setAddItemQty((q) => ({ ...q, [svc._id]: p }));
                                  }
                                } else {
                                  toast.error('Qty tidak valid.');
                                }
                              }}
                              inputProps={{ inputMode: 'decimal' }}
                              sx={{ maxWidth: 120 }}
                            />
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
          </Box>
          {addItemSelected.length > 0 && (
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Item yang akan ditambahkan:
              </Typography>
              {addItemSelected.map((s) => (
                <Box key={s._id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="caption" fontWeight={500}>
                    {s.name}
                    {tenant?.showBookingQty && addItemQFor(s._id) !== 1 && (
                      <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 0.5 }}>
                        ×{formatBookingQtyDisplay(addItemQFor(s._id))}{s.unit ? ` ${s.unit}` : ''}
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="caption" fontWeight={600} color="primary">
                    Rp {(s.price * addItemQFor(s._id)).toLocaleString('id-ID')}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0.5, gap: 1 }}>
          <Button
            onClick={() => setAddItemBookingId(null)}
            variant="outlined" fullWidth
            disabled={addItemSubmitting}
            sx={{ borderRadius: 2.5 }}
          >
            Batal
          </Button>
          <Button
            onClick={handleAddItems}
            variant="contained" fullWidth
            disabled={addItemSelected.length === 0 || addItemSubmitting}
            startIcon={addItemSubmitting ? undefined : <AddCircleOutlineIcon />}
            sx={{ borderRadius: 2.5, fontWeight: 700 }}
          >
            {addItemSubmitting
              ? <CircularProgress size={20} color="inherit" />
              : `Tambah (${addItemSelected.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog
        open={dialogOpen} onClose={() => setDialogOpen(false)}
        fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle
          fontWeight={700}
          color="primary"
          sx={{ pb: 1, letterSpacing: -0.3 }}
        >
          Konfirmasi Booking
        </DialogTitle>

        <DialogContent sx={{ pt: 0 }}>
          {/* Ringkasan layanan */}
          <Box
            sx={{
              borderRadius: 3, p: 2.5, mb: 2.5,
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, letterSpacing: 1.2, fontSize: '0.62rem', color: 'primary.main' }}
            >
              Layanan
            </Typography>

            {selectedServices.map((s) => (
              <Box
                key={s._id}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.25, gap: 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                  <Avatar
                    src={s.photoUrl || undefined}
                    variant="rounded"
                    sx={{
                      width: 34, height: 34, flexShrink: 0,
                      bgcolor: 'primary.main',
                      boxShadow: (t) => `0 2px 8px ${t.palette.primary.main}44`,
                    }}
                  >
                    {!s.photoUrl && <ContentCutIcon sx={{ fontSize: 16, color: 'white' }} />}
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {s.name}
                    </Typography>
                    {tenant?.showBookingQty && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatBookingQtyDisplay(qFor(s._id))}
                        {s.unit ? ` ${s.unit}` : ''} × Rp {s.price.toLocaleString('id-ID')}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Typography variant="body2" fontWeight={700} color="primary" sx={{ flexShrink: 0 }}>
                  Rp {(s.price * qFor(s._id)).toLocaleString('id-ID')}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1.5, borderColor: 'divider' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography fontWeight={600} variant="body2" color="text.primary">
                Rp {totalPrice.toLocaleString('id-ID')}
              </Typography>
            </Box>
            {ppnPct > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">PPN {ppnPct}%</Typography>
                <Typography variant="body2" color="text.secondary">
                  Rp {ppnAmount.toLocaleString('id-ID')}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, alignItems: 'center' }}>
              <Typography variant="body2" fontWeight={700}>Total</Typography>
              <Typography fontWeight={600} color="primary" fontSize="1.05rem">
                Rp {(totalPrice + ppnAmount).toLocaleString('id-ID')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">Durasi</Typography>
              <Typography fontWeight={600} variant="body2" color="text.primary">{formatDuration(totalDuration)}</Typography>
            </Box>

            {isStaffVariant ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, lineHeight: 1.45 }}>
                Anda akan ditugaskan sebagai pelaksana untuk booking ini. Pembayaran dilakukan di halaman antrian.
              </Typography>
            ) : isAdminVariant ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, lineHeight: 1.45 }}>
                Order masuk antrian outlet. Pembayaran dilakukan di halaman POS.
              </Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{bookingLabels.staffSingular}</Typography>
                  <Typography fontWeight={600} variant="body2" color="text.primary">
                    {selectedStaff?.staffName || 'Siapapun tersedia'}
                  </Typography>
                </Box>
                {selectedStaff && selectedStaff.estimatedWaitMinutes > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75 }}>
                    <Typography variant="body2" color="text.secondary">Est. tunggu</Typography>
                    <Chip
                      label={waitLabel(selectedStaff.estimatedWaitMinutes)} size="small"
                      color={waitColor(selectedStaff.estimatedWaitMinutes)}
                      sx={{ fontWeight: 700, height: 22 }}
                    />
                  </Box>
                )}
              </>
            )}
            {isStaffVariant &&
              staffSelfQueueInfo &&
              windowsForQueueRow(staffSelfQueueInfo).length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.75 }}>
                  Jadwal Anda hari ini
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {windowsForQueueRow(staffSelfQueueInfo).map((w) => (
                    <Chip
                      key={`self-${w.start}-${w.end}`}
                      size="small"
                      variant="outlined"
                      label={formatSlotRangeLabel(w)}
                      color="success"
                      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {dialogAppointmentWindows.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="overline"
                display="block"
                sx={{ fontWeight: 700, letterSpacing: 1, fontSize: '0.62rem', color: 'primary.main', mb: 0.75 }}
              >
                Jam kunjungan
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Pilih jendela jam kunjungan sesuai jadwal staff.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {dialogAppointmentWindows.map((w) => {
                  const sel =
                    selectedAppointmentSlot?.start === w.start && selectedAppointmentSlot?.end === w.end;
                  return (
                    <Chip
                      key={`${w.start}-${w.end}`}
                      label={formatSlotRangeLabel(w)}
                      onClick={() => setSelectedAppointmentSlot(w)}
                      color={sel ? 'primary' : 'default'}
                      variant={sel ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700 }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Foto dokumentasi terakhir */}
          {lastHaircut && lastHaircut.photos.length > 0 && (
            <Box
              sx={{
                mb: 2.5, p: 2, borderRadius: 3,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="overline"
                display="block"
                sx={{ fontWeight: 700, letterSpacing: 1, fontSize: '0.62rem', color: 'text.secondary', mb: 1 }}
              >
                <PhotoLibraryIcon sx={{ fontSize: 11, mr: 0.5, verticalAlign: 'middle' }} />
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
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Pilih nomor kursi (opsional — kosong = Take Away / Dibungkus) */}
          {seatSlotCount != null && seatSlotCount >= 1 && (
            <Box sx={{ mb: 2.5 }}>
              {seatAvailabilityLoading ? (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} /> Memuat kursi yang tersedia…
                </Typography>
              ) : (
                <>
                  {availableSeatSlots.length === 0 && (
                    <Alert severity="info" sx={{ borderRadius: 2.5, mb: 1.5 }}>
                      Semua {bookingLabels.seatLabel.toLowerCase()} sedang terisi. Kamu tetap bisa booking dengan opsi &quot;{bookingLabels.takeAwayLabel}&quot;.
                    </Alert>
                  )}
                  <FormControl fullWidth>
                    <InputLabel id="booking-seat-select-label">{bookingLabels.seatLabel} (opsional)</InputLabel>
                    <Select
                      labelId="booking-seat-select-label"
                      id="booking-seat-select"
                      label={`${bookingLabels.seatLabel} (opsional)`}
                      value={bookingSeatPick ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBookingSeatPick(v === '' ? null : Number(v));
                      }}
                      sx={{ borderRadius: 2.5 }}
                    >
                      <MenuItem value="">
                        <em>{bookingLabels.takeAwayLabel}</em>
                      </MenuItem>
                      {availableSeatSlots.map((n) => (
                        <MenuItem key={n} value={n}>
                          {bookingLabels.seatLabel} {n}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Pilih &quot;{bookingLabels.takeAwayLabel}&quot; jika tidak memerlukan {bookingLabels.seatLabel.toLowerCase()} tertentu.
                      {' '}{bookingLabels.seatLabel} yang sedang terpakai tidak ditampilkan.
                    </FormHelperText>
                  </FormControl>
                </>
              )}
            </Box>
          )}

          {/* Catatan */}
          <TextField
            fullWidth multiline rows={3}
            label={tenant?.requireNotes ? 'Catatan' : 'Catatan (opsional)'}
            required={tenant?.requireNotes === true}
            placeholder={bookingLabels.bookingNotesPlaceholder}
            value={notes} onChange={(e) => setNotes(e.target.value)}
            error={tenant?.requireNotes === true && !notes.trim()}
            helperText={tenant?.requireNotes === true && !notes.trim() ? 'Catatan wajib diisi' : undefined}
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
            sx={{ borderRadius: 2.5, py: 1.2 }}
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
              seatPickerBlocksSubmit ||
              (!!selectedStaff && staffQuotaExceeded(selectedStaff, totalCartQty)) ||
              (!!selectedStaff && selectedStaff.isAvailable === false)
            }
            startIcon={submitting ? undefined : <CheckCircleIcon />}
            sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 700 }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : isStaffVariant ? 'Masuk antrian' : isAdminVariant ? 'Buat order' : 'Booking!'}
          </Button>
        </DialogActions>
      </Dialog>

      {showFloatingCartSummary && (
        <Paper
          elevation={floatingCartExpanded ? 14 : 6}
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
            border: (t) => `1px solid ${t.palette.primary.main}${floatingCartExpanded ? '44' : '22'}`,
            opacity: floatingCartExpanded ? 1 : 0.92,
            transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {/* Header — selalu tampil, bisa diklik untuk expand/collapse */}
          <Box
            onClick={() => setFloatingCartExpanded((v) => !v)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.75,
              py: 1.1,
              cursor: 'pointer',
              userSelect: 'none',
              bgcolor: (t) => floatingCartExpanded ? 'transparent' : `${t.palette.primary.main}08`,
            }}
          >
            <ShoppingCartIcon color="primary" sx={{ fontSize: 20, flexShrink: 0 }} />
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ flex: 1 }}>
              {selectedServices.length} layanan dipilih
            </Typography>
            {/* Ringkasan total saat collapsed */}
            {!floatingCartExpanded && (
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ flexShrink: 0 }}>
                Rp {(totalPrice + ppnAmount).toLocaleString('id-ID')}
              </Typography>
            )}
            <IconButton size="small" sx={{ p: 0.25, ml: 0.5 }} disableRipple>
              {floatingCartExpanded
                ? <ExpandMoreIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                : <ExpandLessIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
            </IconButton>
          </Box>

          {/* Detail — hanya muncul saat expanded */}
          <Collapse in={floatingCartExpanded}>
            <Box sx={{ px: 1.75, pb: 1.5 }}>
              <Divider sx={{ mb: 1, opacity: 0.25 }} />
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
                        {tenant?.showBookingQty && (
                          <Typography
                            component="span"
                            variant="caption"
                            fontWeight={700}
                            color="primary.dark"
                            sx={{ ml: 0.5, whiteSpace: 'nowrap' }}
                          >
                            ×{formatBookingQtyDisplay(qFor(s._id))}
                            {s.unit ? ` ${s.unit}` : ''}
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600} color="primary" sx={{ flexShrink: 0 }}>
                      Rp {(s.price * qFor(s._id)).toLocaleString('id-ID')}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Divider sx={{ my: 1, opacity: 0.35, borderColor: 'rgba(0,0,0,0.1)' }} />
              {ppnPct > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">PPN {ppnPct}%</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rp {ppnAmount.toLocaleString('id-ID')}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Total waktu {formatDuration(totalDuration)}
                </Typography>
                <Typography fontWeight={600} color="primary" variant="subtitle1">
                  Rp {(totalPrice + ppnAmount).toLocaleString('id-ID')}
                </Typography>
              </Box>
              {showStaffPayFab && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.45 }}>
                  Lanjut dengan tombol <strong>Bayar</strong> — Anda akan dibawa ke halaman antrian untuk pembayaran.
                </Typography>
              )}
              {showPickStaffFab && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.45 }}>
                  Lanjut dengan tombol <strong>Order</strong> di pojok kanan bawah.
                </Typography>
              )}
              {tenant?.subscriptionOverdue && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 0.75, fontWeight: 600 }}>
                  Outlet tidak dapat menerima booking baru saat ini.
                </Typography>
              )}
            </Box>
          </Collapse>
        </Paper>
      )}

      {showStaffPayFab && (
        <Tooltip
          title={
            bookingFabDisabled
              ? outletQuotaFull
                ? 'Kuota antrian outlet hari ini penuh'
                : 'Kurangi jumlah layanan agar muat dengan sisa kuota'
              : 'Konfirmasi booking lalu buka halaman antrian untuk pembayaran'
          }
        >
          <Fab
            color="primary"
            variant="extended"
            disabled={bookingFabDisabled}
            onClick={() => handleStaffOpenCheckout()}
            sx={{
              position: 'fixed',
              bottom: { xs: 88, sm: 96 },
              right: 16,
              zIndex: 60,
              px: 2,
              fontWeight: 700,
            }}
          >
            <PaymentsIcon sx={{ mr: 1 }} />
            Bayar
          </Fab>
        </Tooltip>
      )}
      {showPickStaffFab && (
        <Tooltip
          title={
            bookingFabDisabled
              ? outletQuotaFull
                ? 'Kuota antrian outlet hari ini penuh'
                : 'Kurangi jumlah layanan agar muat dengan sisa kuota'
              : `Pilih ${bookingLabels.staffSingular.toLowerCase()}`
          }
        >
          <Fab
            color="primary"
            variant="extended"
            disabled={bookingFabDisabled}
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
            <ShoppingCartIcon sx={{ mr: 1 }} />
            Order
          </Fab>
        </Tooltip>
      )}

      {bottomNav ?? (
        guestBookingFlow ? null : (
          <CustomerBottomNav tenantType={tenant?.tenantType ?? user?.tenantType} />
        )
      )}

      {/* Dialog detail layanan */}
      <Dialog
        open={serviceDetailDialog.open}
        onClose={() => setServiceDetailDialog({ open: false, service: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {serviceDetailDialog.service && (() => {
          const svc = serviceDetailDialog.service;
          return (
            <>
              {svc.photoUrl && (
                <Box sx={{ width: '100%', bgcolor: 'grey.50', borderRadius: '12px 12px 0 0', overflow: 'hidden', maxHeight: 220 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={svc.photoUrl}
                    alt={svc.name}
                    style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                  />
                </Box>
              )}
              <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
                {svc.name}
              </DialogTitle>
              <DialogContent sx={{ pt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="h6" color="primary" fontWeight={700} sx={{ letterSpacing: -0.5 }}>
                    Rp {svc.price.toLocaleString('id-ID')}
                  </Typography>
                  <Chip
                    icon={<AccessTimeIcon sx={{ fontSize: '12px !important' }} />}
                    label={formatDuration(svc.durationMinutes)}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem', borderRadius: 2, borderColor: 'rgba(0,0,0,0.18)' }}
                  />
                  {svc.unit && (
                    <Chip label={`/ ${svc.unit}`} size="small" variant="outlined"
                      sx={{ height: 22, fontSize: '0.7rem', borderRadius: 2 }} />
                  )}
                </Box>
                {svc.description ? (
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                    {svc.description}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.disabled" fontStyle="italic">
                    Tidak ada deskripsi
                  </Typography>
                )}
                {svc.stockQty != null && Number.isFinite(Number(svc.stockQty)) && (
                  <Box sx={{ mt: 1.5 }}>
                    <Chip
                      label={Number(svc.stockQty) <= 0 ? 'Stok habis' : `Stok: ${Number(svc.stockQty)}${svc.unit ? ` ${svc.unit}` : ''}`}
                      size="small"
                      color={Number(svc.stockQty) <= 0 ? 'error' : 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.72rem', height: 24 }}
                    />
                  </Box>
                )}
              </DialogContent>
              <DialogActions sx={{ px: 2.5, pb: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setServiceDetailDialog({ open: false, service: null });
                    if (!isServiceOutOfStock(svc)) toggleService(svc);
                  }}
                  disabled={!!tenant?.subscriptionOverdue || outletQuotaFull || isServiceOutOfStock(svc)}
                >
                  {selectedServices.find((s) => s._id === svc._id) ? 'Batalkan Pilihan' : 'Pilih Layanan Ini'}
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Dialog jadwal mingguan staff (booking pelanggan) */}
      <Dialog
        open={staffScheduleDialogRow !== null}
        onClose={() => setStaffScheduleDialogRow(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {staffScheduleDialogRow && (() => {
          const row = staffScheduleDialogRow;
          const weekly = buildStaffWeeklyScheduleDayRows(row.availabilityDaysHours);
          return (
            <>
              <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
                Jadwal {row.staffName}
              </DialogTitle>
              <DialogContent sx={{ pt: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Jam layanan per hari. Ubah &ldquo;Tanggal antrian&rdquo; di atas untuk memilih hari booking.
                </Typography>
                {!weekly ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    {bookingLabels.staffSingular} ini tidak punya batasan jadwal mingguan di profilnya — bisa
                    melayani di semua hari sesuai tanggal antrian yang Anda pilih.
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {weekly.map((d) => {
                      const isSelectedQueueDay = row.selectedBookingDowKey === d.dayKey;
                      return (
                        <Box
                          key={d.dayKey}
                          sx={{
                            py: 0.75,
                            px: 1,
                            borderRadius: 2,
                            bgcolor: isSelectedQueueDay ? 'primary.main' : 'transparent',
                            color: isSelectedQueueDay ? 'primary.contrastText' : 'text.primary',
                            border: 1,
                            borderColor: isSelectedQueueDay ? 'primary.main' : 'divider',
                          }}
                        >
                          <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5, opacity: 0.95 }}>
                            {d.label}
                            {isSelectedQueueDay && ' · tanggal antrian'}
                          </Typography>
                          {d.windows.length === 0 ? (
                            <Typography variant="body2" sx={{ opacity: isSelectedQueueDay ? 0.9 : 1 }}>
                              Tidak melayani
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {d.windows.map((w) => (
                                <Chip
                                  key={`${d.dayKey}-${w.start}-${w.end}`}
                                  size="small"
                                  label={formatSlotRangeLabel(w)}
                                  color={isSelectedQueueDay ? 'default' : 'success'}
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    ...(isSelectedQueueDay
                                      ? {
                                          bgcolor: 'rgba(255,255,255,0.2)',
                                          color: 'inherit',
                                          borderColor: 'rgba(255,255,255,0.35)',
                                        }
                                      : {}),
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </DialogContent>
              <DialogActions sx={{ px: 2.5, pb: 2 }}>
                <Button fullWidth variant="contained" onClick={() => setStaffScheduleDialogRow(null)}>
                  Tutup
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
