'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, IconButton, Avatar, List,
  ListItem, ListItemButton, ListItemText, ListItemAvatar,
  Switch, FormControlLabel, Alert, TextField, Tooltip,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PanToolIcon from '@mui/icons-material/PanTool';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import HistoryIcon from '@mui/icons-material/History';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { compressImage } from '@/lib/imageUtils';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { StaffBottomNav } from '@/components/layout/BottomNav';
import { getTenantUiLabels } from '@/lib/tenantLabels';
import { parseRupiahInput } from '@/lib/rupiahInput';
import { QUEUE_AUTO_RELOAD_MS } from '@/lib/queueReload';
import PhoneChangeSection from '@/components/account/PhoneChangeSection';
import SwitchOutletControl from '@/components/account/SwitchOutletControl';
import { BookingQuantityEditor, buildQtyDraftFromBooking } from '@/components/booking/BookingQuantityEditor';
import {
  BOOKING_QTY_MIN,
  clampBookingQtyParsedOrFallback,
  formatBookingQtyDisplay,
} from '@/lib/bookingQty';
import {
  bookingServicesLabel,
  bookingSubtotalOrLegacy,
  formatBookingQueueDate,
  getReceiptServiceLines,
  type UiBooking,
} from '@/lib/bookingDisplay';
import {
  buildThermalReceiptEscPos,
  buildThermalReceiptPrintHtmlDocument,
  openThermalReceiptPrint,
  sendEscPosToBluetooth,
  type ThermalReceipt,
} from '@/lib/thermalReceiptPrint';
import { PaymentBookingDetailCard } from '@/components/payment/PaymentBookingDetailCard';

type Booking = UiBooking & {
  customerId?: string | null;
  customerPhone?: string | null;
  paymentId?: string;
};

interface ServicePhotoDoc {
  _id: string;
  photos: string[];
  staffName?: string | null;
  createdAt: string;
}

interface Tenant {
  _id: string;
  name: string;
  address?: string;
  tenantType?: string;
  allowStaffCreateBooking?: boolean;
}

const statusColor: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  waiting: 'warning',
  in_progress: 'info',
  done: 'success',
  cancelled: 'error',
};

const statusLabel: Record<string, string> = {
  waiting: 'Menunggu',
  in_progress: 'Dilayani',
  done: 'Selesai',
  cancelled: 'Batal',
};

export default function StaffQueuePage() {
  const { user, isLoading, loadFromStorage, setAuth, token } = useAuthStore();
  const pendingLoginPhone = useAuthStore((s) => s.user?.pendingPhone);
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [qrisImageBase64, setQrisImageBase64] = useState<string | null>(null);
  const [showBookingQty, setShowBookingQty] = useState(false);
  const [qtyDraftByBooking, setQtyDraftByBooking] = useState<Record<string, { serviceId: string; quantity: number }[]>>({});
  const [savingQtyBookingId, setSavingQtyBookingId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [payCashTenderedInput, setPayCashTenderedInput] = useState('');
  const [payStep, setPayStep] = useState<'select' | 'qris-confirm'>('select');
  const [qrisErrorBanner, setQrisErrorBanner] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [thermalReceipt, setThermalReceipt] = useState<ThermalReceipt | null>(null);
  const [receiptBookingDateIso, setReceiptBookingDateIso] = useState<string | null>(null);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [reprintBusyId, setReprintBusyId] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);

  // Foto hasil 
  const [uploadPhotos, setUploadPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [lastServicePhotoDialog, setLastServicePhotoDialog] = useState<{ open: boolean; booking: Booking | null; data: ServicePhotoDoc | null; loading: boolean }>({
    open: false, booking: null, data: null, loading: false,
  });

  const lastBookingRef = useRef<Booking | null>(null);

  const ui = useMemo(
    () => getTenantUiLabels(user?.tenantType ?? currentTenant?.tenantType),
    [user?.tenantType, currentTenant?.tenantType],
  );

  const fmtRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const showOrigVsPaid = (b: Booking) =>
    b.status === 'done' && b.paidAmount != null && b.paidAmount !== bookingSubtotalOrLegacy(b);

  const handleReprintNotaBrowser = async (b: Booking) => {
    if (!b.paymentId) return;
    setReprintBusyId(b._id);
    try {
      const res = await api.get(`/payments/${b.paymentId}/receipt`);
      openThermalReceiptPrint(res.data, { assigneeLabel: ui.assigneeReceiptLabel, bookingDateIso: b.date });
    } catch {
      toast.error('Gagal memuat nota');
    } finally {
      setReprintBusyId(null);
    }
  };

  const handleReprintNotaBluetooth = async (b: Booking) => {
    if (!b.paymentId) return;
    setReprintBusyId(b._id);
    try {
      const res = await api.get(`/payments/${b.paymentId}/receipt`);
      const escPos = buildThermalReceiptEscPos(res.data, {
        assigneeLabel: ui.assigneeReceiptLabel,
        bookingDateIso: b.date,
      });
      await sendEscPosToBluetooth(escPos);
    } catch {
      toast.error('Gagal memuat nota');
    } finally {
      setReprintBusyId(null);
    }
  };

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (!user?.tenantId) return;
    api.get(`/tenants/${user.tenantId}/settings`)
      .then((r) => {
        setQrisImageBase64(r.data?.qrisImageBase64 || null);
        setShowBookingQty(r.data?.showBookingQty === true);
      })
      .catch(() => {});
  }, [user?.tenantId]);

  /** Jangan pakai [user] utuh — pembaruan profil (/auth/me) mengganti referensi user dan memicu loop jika memuat ulang antrian + loading. */
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'staff') {
      router.replace('/');
      return;
    }
    if (!user.tenantId) {
      let cancelled = false;
      (async () => {
        setTenantLoading(true);
        try {
          const res = await api.get<Array<{ tenantId: string; name: string }>>('/auth/my-switchable-tenants');
          if (cancelled) return;
          const list = res.data ?? [];
          setTenants(
            list.map((r) => ({
              _id: r.tenantId,
              name: r.name,
            })),
          );
          if (list.length === 1) {
            const resSwitch = await api.post('/auth/switch-tenant', { tenantId: list[0].tenantId });
            if (cancelled) return;
            setAuth(resSwitch.data.user, resSwitch.data.token);
            const tRes = await api.get(`/tenants/${list[0].tenantId}`);
            if (!cancelled) setCurrentTenant(tRes.data);
          } else if (list.length > 1) {
            setTenantDialogOpen(true);
          } else if (!cancelled) {
            toast.error('Belum terdaftar sebagai staff di outlet manapun');
          }
        } catch {
          if (!cancelled) toast.error('Gagal memuat outlet');
        } finally {
          if (!cancelled) setTenantLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    loadCurrentTenant(user.tenantId);
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya tenantId/role; hindari re-fetch saat phone/pendingPhone berubah
  }, [isLoading, user?.tenantId, user?.role]);

  const loadTenants = useCallback(async () => {
    setTenantLoading(true);
    try {
      const res = await api.get<Array<{ tenantId: string; name: string }>>('/auth/my-switchable-tenants');
      const list = res.data ?? [];
      setTenants(
        list.map((r) => ({
          _id: r.tenantId,
          name: r.name,
        })),
      );
    } catch {
      toast.error('Gagal memuat daftar salon');
      setTenants([]);
    } finally {
      setTenantLoading(false);
    }
  }, []);

  const loadCurrentTenant = useCallback(async (tenantId: string) => {
    try {
      const res = await api.get(`/tenants/${tenantId}`);
      setCurrentTenant(res.data);
    } catch { /* ignore */ }
  }, []);

  const handleSelectTenant = async (tenant: Tenant) => {
    try {
      const res = await api.post('/auth/switch-tenant', { tenantId: tenant._id });
      setAuth(res.data.user, res.data.token);
      const tRes = await api.get(`/tenants/${tenant._id}`);
      setCurrentTenant(tRes.data);
      setTenantDialogOpen(false);
      loadBookings({ tenantId: tenant._id });
    } catch {
      toast.error('Gagal berpindah salon');
    }
  };

  const handleToggleAvailability = async () => {
    if (!user?.staffId) return;
    setTogglingAvail(true);
    try {
      const res = await api.patch(`/staff/${user.staffId}/availability`);
      setIsAvailable(res.data.isAvailable);
      toast.success(res.data.isAvailable ? 'Status: Tersedia' : 'Status: Tidak Tersedia');
    } catch {
      toast.error('Gagal mengubah status');
    } finally {
      setTogglingAvail(false);
    }
  };

  const loadBookings = useCallback(async (opts?: { tenantId?: string; silent?: boolean }) => {
    const tid = opts?.tenantId || user?.tenantId;
    if (!tid) return;
    const silent = opts?.silent;
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/bookings/today');
      setBookings(res.data);
    } catch {
      if (!silent) toast.error('Gagal memuat antrian');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  const draftQtyLines = (b: Booking) => qtyDraftByBooking[b._id] ?? buildQtyDraftFromBooking(b);

  const setQtyLine = (bookingId: string, serviceId: string, raw: number) => {
    const q = clampBookingQtyParsedOrFallback(raw, BOOKING_QTY_MIN);
    setQtyDraftByBooking((prev) => {
      const row = bookings.find((x) => x._id === bookingId);
      if (!row?.services?.length) return prev;
      const base = prev[bookingId] ?? buildQtyDraftFromBooking(row);
      const next = base.map((line) => (line.serviceId === serviceId ? { ...line, quantity: q } : line));
      return { ...prev, [bookingId]: next };
    });
  };

  const saveBookingQuantities = async (b: Booking) => {
    setSavingQtyBookingId(b._id);
    try {
      await api.patch(`/bookings/${b._id}/quantities`, { lines: draftQtyLines(b) });
      toast.success('Jumlah diperbarui');
      setQtyDraftByBooking((p) => {
        const n = { ...p };
        delete n[b._id];
        return n;
      });
      await loadBookings();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(m || 'Gagal menyimpan jumlah');
    } finally {
      setSavingQtyBookingId(null);
    }
  };

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role !== 'staff') return;
    if (!user.tenantId) return;
    const id = setInterval(() => {
      void loadBookings({ silent: true });
    }, QUEUE_AUTO_RELOAD_MS);
    return () => clearInterval(id);
  }, [isLoading, user, loadBookings]);

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      toast.success('Status diupdate');
      loadBookings();
    } catch {
      toast.error('Gagal update status');
    }
  };

  const handleTakeQueue = async (booking: Booking) => {
    setTakingId(booking._id);
    try {
      await api.patch(`/bookings/${booking._id}/assign`, {
        staffId: user?.staffId || user?._id,
      });
      toast.success(`Antrian #${booking.queueNumber} berhasil diambil`);
      loadBookings();
    } catch {
      toast.error('Gagal mengambil antrian');
    } finally {
      setTakingId(null);
    }
  };

  const handleOpenPayDialog = (b: Booking) => {
    if (user?.isOverdue) {
      toast.error('Tagihan langganan outlet overdue. Buka halaman Tagihan & Langganan untuk melunasi.');
      return;
    }
    lastBookingRef.current = b;
    setPayStep('select');
    setQrisErrorBanner(null);
    setPayCashTenderedInput(String(bookingSubtotalOrLegacy(b)));
    setPayDialog({ open: true, booking: b });
  };

  const receiptPrintOpts = { assigneeLabel: ui.assigneeReceiptLabel, bookingDateIso: receiptBookingDateIso };

  const handlePayment = async (method: 'cash' | 'qris') => {
    const booking = lastBookingRef.current;
    if (!booking) return;
    const invoiceAmount = bookingSubtotalOrLegacy(booking);
    if (!Number.isFinite(invoiceAmount) || invoiceAmount < 1) {
      toast.error('Total transaksi tidak valid');
      return;
    }
    let cashTendered: number | undefined;
    if (method === 'cash') {
      const t = parseRupiahInput(payCashTenderedInput);
      if (t == null) {
        toast.error('Masukkan uang tunai diterima yang valid');
        return;
      }
      if (t < invoiceAmount) {
        toast.error('Uang tunai diterima tidak boleh kurang dari total');
        return;
      }
      cashTendered = t;
    }
    setPaying(true);
    try {
      const res = await api.post('/payments', {
        bookingId: booking._id,
        method,
        amount: invoiceAmount,
        ...(method === 'cash' ? { cashTendered } : {}),
      });
      const receiptRes = await api.get(`/payments/${res.data._id}/receipt`);
      setThermalReceipt(receiptRes.data);
      setReceiptBookingDateIso(booking.date ?? null);

      toast.success('Pembayaran berhasil!');
      setPayDialog({ open: false, booking: null });
      setPayCashTenderedInput('');
      setReceiptDialog(true);
      setQrisErrorBanner(null);
      loadBookings();
    } catch (err: unknown) {
      const serverMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(serverMsg || 'Gagal memproses pembayaran');
      if (method === 'qris') {
        setQrisErrorBanner(
          serverMsg
            ? `${serverMsg} — jika perlu, catat pembayaran tunai.`
            : 'Pembayaran QRIS belum tercatat. Gunakan tombol Ganti ke Tunai di bawah jika pelanggan membayar tunai.',
        );
      } else {
        setQrisErrorBanner(null);
      }
    } finally {
      setPaying(false);
    }
  };

  const printReceiptBluetooth = async () => {
    if (!thermalReceipt) {
      toast.error('Data nota tidak tersedia');
      return;
    }
    await sendEscPosToBluetooth(buildThermalReceiptEscPos(thermalReceipt, receiptPrintOpts));
  };

  const printReceiptBrowser = () => {
    if (!thermalReceipt) return;
    openThermalReceiptPrint(thermalReceipt, receiptPrintOpts);
  };

  const handleSelectPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 3 - uploadPhotos.length;
    const toProcess = files.slice(0, remaining);
    try {
      const compressed = await Promise.all(toProcess.map(compressImage));
      setUploadPhotos((prev) => [...prev, ...compressed].slice(0, 3));
    } catch {
      toast.error('Gagal memproses foto');
    }
    e.target.value = '';
  };

  const handleUploadPhotos = async (bookingId: string) => {
    if (uploadPhotos.length === 0) return;
    setUploadingPhotos(true);
    try {
      await api.post(`/bookings/${bookingId}/service-photos`, { photos: uploadPhotos });
      toast.success('Foto berhasil disimpan!');
      setUploadPhotos([]);
    } catch {
      toast.error('Gagal menyimpan foto');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleOpenLastServicePhoto = async (b: Booking) => {
    setLastServicePhotoDialog({ open: true, booking: b, data: null, loading: true });
    try {
      const res = await api.get(`/bookings/${b._id}/last-service-photo`);
      setLastServicePhotoDialog((prev) => ({ ...prev, data: res.data, loading: false }));
    } catch {
      setLastServicePhotoDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const myStaffId = user?.staffId || user?._id;
  const pendingBookings = bookings.filter((b) => b.status !== 'done' && b.status !== 'cancelled');
  const doneBookings = bookings.filter((b) => b.status === 'done');
  const paymentBlocked = Boolean(user?.isOverdue);

  const isMyQueue = (b: Booking) => b.staffId === myStaffId;

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader
        title={`Antrian — ${currentTenant?.name || 'Pilih Salon'}`}
        right={
          <Box className="flex items-center gap-1">
            {currentTenant?.allowStaffCreateBooking === true && (
              <Tooltip title="Booking baru">
                <IconButton color="inherit" size="small" onClick={() => router.push('/staff/booking')}>
                  <AddCircleOutlineIcon />
                </IconButton>
              </Tooltip>
            )}
            <SwitchOutletControl alwaysShowIcon onSwitched={() => void loadBookings()} />
            <IconButton color="inherit" size="small" onClick={() => { void loadBookings(); }}>
              <RefreshIcon />
            </IconButton>
          </Box>
        }
      />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : !user?.tenantId ? (
        <PageContainer sx={{ textAlign: 'center', py: 6 }}>
          <StorefrontIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary" className="mt-2">Pilih Salon Tempat Bekerja</Typography>
          <Button variant="contained" className="mt-4" onClick={() => { loadTenants(); setTenantDialogOpen(true); }}>
            Pilih Salon
          </Button>
        </PageContainer>
      ) : (
        <PageContainer>
          {paymentBlocked && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => router.push('/subscription')}>
                  Tagihan
                </Button>
              }
            >
              Tagihan berlangganan outlet melewati jatuh tempo. Pembayaran layanan dinonaktifkan sampai tagihan dilunasi.
            </Alert>
          )}
          <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <Accordion
              defaultExpanded={Boolean(pendingLoginPhone)}
              disableGutters
              elevation={0}
              sx={{
                bgcolor: 'transparent',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Ubah nomor WhatsApp (login)
                  </Typography>
                  {pendingLoginPhone ? (
                    <Chip size="small" label="Menunggu verifikasi" color="info" />
                  ) : null}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
                <PhoneChangeSection hideIntro />
              </AccordionDetails>
            </Accordion>
          </Card>
          {/* Info staff */}
          <Card
            className="mb-4"
            sx={{
              border: '1px solid',
              borderColor: isAvailable ? 'success.light' : 'warning.light',
              bgcolor: isAvailable ? 'rgba(46,125,50,0.06)' : 'rgba(230,81,0,0.06)',
              boxShadow: (t) => isAvailable
                ? `0 2px 12px ${t.palette.success.main}22`
                : `0 2px 12px ${t.palette.warning.main}22`,
            }}
          >
            <CardContent className="py-3">
              <Box className="flex items-center gap-3">
                <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontWeight: 700 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box className="flex-1">
                  <Typography fontWeight={500}>{user?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{ui.staffSingular} · {currentTenant?.name}</Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isAvailable}
                      onChange={handleToggleAvailability}
                      disabled={togglingAvail || !user?.staffId}
                      color="success"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption" fontWeight={600} color={isAvailable ? 'success.main' : 'warning.main'}>
                      {isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
                    </Typography>
                  }
                  labelPlacement="start"
                  sx={{ m: 0 }}
                />
              </Box>
            </CardContent>
          </Card>

          <Typography variant="h6" fontWeight={500} className="mb-3">
            Antrian Hari Ini ({pendingBookings.length})
          </Typography>

          {pendingBookings.length === 0 && (
            <Card className="mb-4">
              <CardContent className="text-center py-8">
                <Typography color="text.secondary">Tidak ada antrian aktif</Typography>
              </CardContent>
            </Card>
          )}

          <Box className="flex flex-col gap-3 mb-6">
            {pendingBookings.map((b) => {
              const mine = isMyQueue(b);
              const posLines = getReceiptServiceLines(b);
              return (
                <Card
                  key={b._id}
                  className="border-l-4"
                  sx={{ borderLeftColor: mine ? 'primary.main' : 'grey.400' }}
                >
                  <CardContent>
                    <Box className="flex justify-between items-start mb-2">
                      <Box>
                        <Box className="flex items-center gap-2" sx={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                          <Typography variant="h6" fontWeight={600}>#{b.queueNumber}</Typography>
                          {formatBookingQueueDate(b.date) && (
                            <Typography variant="body2" color="text.secondary" fontWeight={700}>
                              {formatBookingQueueDate(b.date)}
                            </Typography>
                          )}
                          {mine ? (
                            <Chip label="Antrian Saya" size="small" color="primary" variant="outlined" />
                          ) : (
                            <Chip label={b.staffName ? `${ui.navStaff}: ${b.staffName}` : `Belum ada ${ui.staffSingular.toLowerCase()}`} size="small" color="default" variant="outlined" />
                          )}
                        </Box>
                        <Typography fontWeight={600}>{b.customerName}</Typography>
                        {posLines.length > 0 ? (
                          <Box component="div" sx={{ mt: 0.5 }}>
                            {posLines.map((L, i) => (
                              <Typography
                                key={i}
                                variant="body2"
                                color="text.secondary"
                                component="div"
                                sx={{ lineHeight: 1.5 }}
                              >
                                <Box component="span" sx={{ fontWeight: 700, color: 'primary.main', mr: 0.75 }}>
                                  {formatBookingQtyDisplay(L.qty)}
                                {L.unit ? ` ${L.unit}` : ''} ×
                                </Box>
                                {L.name}
                                
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {bookingServicesLabel(b)}
                          </Typography>
                        )}
                        {b.notes && (
                          <Typography variant="body2" className="italic text-gray-400">
                            &quot;{b.notes}&quot;
                          </Typography>
                        )}
                      </Box>
                      <Box className="text-right">
                        <Typography fontWeight={600} color="primary">
                          Rp {bookingSubtotalOrLegacy(b).toLocaleString('id-ID')}
                        </Typography>
                        <Chip
                          label={statusLabel[b.status]}
                          color={statusColor[b.status]}
                          size="small"
                          className="mt-1"
                        />
                      </Box>
                    </Box>

                    <BookingQuantityEditor
                      booking={b}
                      show={showBookingQty}
                      draftLines={draftQtyLines(b)}
                      saving={savingQtyBookingId === b._id}
                      onChangeQuantity={(serviceId, raw) => setQtyLine(b._id, serviceId, raw)}
                      onSave={() => void saveBookingQuantities(b)}
                    />

                    <Divider className="my-2" />

                    <Box className="flex gap-2 flex-wrap">
                      {!mine && b.status === 'waiting' && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          startIcon={takingId === b._id ? <CircularProgress size={14} /> : <PanToolIcon />}
                          onClick={() => handleTakeQueue(b)}
                          disabled={!!takingId}
                        >
                          Ambil Antrian
                        </Button>
                      )}
                      {mine && b.status === 'waiting' && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleUpdateStatus(b._id, 'in_progress')}
                        >
                          Mulai Layani
                        </Button>
                      )}
                      {mine && b.status === 'in_progress' && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="info"
                          startIcon={<HistoryIcon />}
                          onClick={() => handleOpenLastServicePhoto(b)}
                        >
                          Foto Terakhir
                        </Button>
                      )}
                      {mine && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PaymentsIcon />}
                          onClick={() => handleOpenPayDialog(b)}
                          disabled={paymentBlocked}
                        >
                          Bayar
                        </Button>
                      )}
                      {mine && (
                        <Button
                          variant="text"
                          size="small"
                          color="error"
                          onClick={() => handleUpdateStatus(b._id, 'cancelled')}
                        >
                          Batal
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {doneBookings.length > 0 && (
            <>
              <Typography variant="subtitle1" fontWeight={600} color="text.secondary" className="mb-2">
                Selesai ({doneBookings.length})
              </Typography>
              <Box className="flex flex-col gap-2">
                {doneBookings.map((b) => {
                  const posLines = getReceiptServiceLines(b);
                  return (
                  <Card key={b._id} className="opacity-60">
                    <CardContent className="py-3">
                      <Box className="flex justify-between items-center">
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography fontWeight={600}>
                            #{b.queueNumber}
                            {formatBookingQueueDate(b.date) ? ` · ${formatBookingQueueDate(b.date)}` : ''}
                            {' — '}
                            {b.customerName}
                          </Typography>
                          {posLines.length > 0 ? (
                            <Box component="div" sx={{ mt: 0.25 }}>
                              {posLines.map((L, i) => (
                                <Typography key={i} variant="body2" color="text.secondary" component="div">
                                  <Box component="span" sx={{ fontWeight: 600, color: 'text.primary', mr: 0.5 }}>
                                    {formatBookingQtyDisplay(L.qty)}
                                {L.unit ? ` ${L.unit}` : ''} ×
                                  </Box>
                                  {L.name}
                                  
                                </Typography>
                              ))}
                              {b.staffName && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }} component="div">
                                  · {b.staffName}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {bookingServicesLabel(b)}
                              {b.staffName && ` · ${b.staffName}`}
                            </Typography>
                          )}
                        </Box>
                        <Box className="text-right" sx={{ flexShrink: 0, ml: 1 }}>
                          <CheckCircleIcon color="success" sx={{ display: 'block', ml: 'auto', mb: 0.5 }} />
                          {showOrigVsPaid(b) ? (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
                                Tercatat {fmtRp(bookingSubtotalOrLegacy(b))}
                              </Typography>
                              <Typography variant="body2" fontWeight={700} color="primary">
                                Dibayar {fmtRp(b.paidAmount!)}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" fontWeight={500}>
                              {fmtRp(b.paidAmount ?? bookingSubtotalOrLegacy(b))}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {b.paymentId && (
                        <Box
                          className="flex items-center gap-0.5"
                          sx={{ mt: 1.5, minHeight: 48 }}
                        >
                          {reprintBusyId === b._id ? (
                            <CircularProgress size={24} />
                          ) : (
                            <>
                              <Tooltip title="Cetak (browser)">
                                <IconButton
                                  size="small"
                                  color="default"
                                  aria-label="Cetak ulang nota lewat browser"
                                  onClick={() => void handleReprintNotaBrowser(b)}
                                >
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cetak Bluetooth">
                                <IconButton
                                  size="large"
                                  color="default"
                                  aria-label="Cetak ulang nota lewat Bluetooth"
                                  onClick={() => void handleReprintNotaBluetooth(b)}
                                  sx={{ width: 48, height: 48 }}
                                >
                                  <BluetoothIcon sx={{ fontSize: 28 }} />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
                })}
              </Box>
            </>
          )}
        </PageContainer>
      )}

      {/* Tenant Selection Dialog */}
      <Dialog open={tenantDialogOpen} onClose={() => { if (user?.tenantId) setTenantDialogOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>
          <StorefrontIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Pilih Tempat Bekerja
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {tenantLoading ? (
            <Box className="flex justify-center py-8"><CircularProgress /></Box>
          ) : tenants.length === 0 ? (
            <Box className="text-center py-8 px-4">
              <Typography color="text.secondary">Tidak ada salon tersedia</Typography>
            </Box>
          ) : (
            <List>
              {tenants.map((t) => (
                <ListItem key={t._id} disablePadding divider>
                  <ListItemButton onClick={() => handleSelectTenant(t)} selected={user?.tenantId === t._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <StorefrontIcon color="primary" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography fontWeight={500}>{t.name}</Typography>}
                      secondary={t.address}
                    />
                    {user?.tenantId === t._id && <Chip label="Aktif" size="small" color="primary" />}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        {user?.tenantId && (
          <DialogActions>
            <Button onClick={() => setTenantDialogOpen(false)}>Batal</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Payment Dialog (sama alur tenant_admin POS: pilih metode → layar QRIS, bisa ganti ke tunai jika QRIS gagal) */}
      <Dialog
        open={payDialog.open}
        onClose={() => {
          setPayDialog({ open: false, booking: null });
          setPayCashTenderedInput('');
          setPayStep('select');
          setQrisErrorBanner(null);
        }}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            maxHeight: 'min(560px, 90dvh)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {payStep === 'select' ? (
          <>
            <DialogTitle fontWeight={500}>Pilih Metode Bayar</DialogTitle>
            <DialogContent
              sx={{
                flex: '1 1 auto',
                overflowY: 'auto',
                minHeight: 0,
                px: 2,
                pt: 1,
                pb: 2,
              }}
            >
              {payDialog.booking && (
                <PaymentBookingDetailCard
                  booking={payDialog.booking}
                  assigneeLabel={ui.assigneeReceiptLabel}
                  customerPhone={payDialog.booking.customerPhone}
                />
              )}
            </DialogContent>
            <Box
              sx={{
                flexShrink: 0,
                px: 2,
                pt: 1.5,
                pb: 2,
                bgcolor: 'background.paper',
                borderTop: 1,
                borderColor: 'divider',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 -8px 24px rgba(0,0,0,0.45)'
                    : '0 -8px 24px rgba(0,0,0,0.08)',
              }}
            >
              <TextField
                fullWidth
                label="Uang tunai diterima (Rp)"
                value={payCashTenderedInput}
                onChange={(e) => setPayCashTenderedInput(e.target.value.replace(/\D/g, ''))}
                inputProps={{ inputMode: 'numeric' }}
                helperText="Untuk QRIS tidak dipakai; untuk tunai harus ≥ total di atas"
                sx={{ mb: 1 }}
                autoFocus
              />
              {(() => {
                const inv =
                  payDialog.booking != null ? bookingSubtotalOrLegacy(payDialog.booking) : null;
                const cash = parseRupiahInput(payCashTenderedInput);
                if (inv != null && inv >= 1 && cash != null && cash >= inv) {
                  return (
                    <Typography variant="body2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                      Kembalian: Rp {(cash - inv).toLocaleString('id-ID')}
                    </Typography>
                  );
                }
                return null;
              })()}
              <Box className="flex gap-3">
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => handlePayment('cash')}
                  disabled={paying}
                  sx={{ py: 2.5, flexDirection: 'column', gap: 1 }}
                >
                  <PaymentsIcon sx={{ fontSize: 36 }} />
                  Tunai
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => setPayStep('qris-confirm')}
                  disabled={paying}
                  sx={{ py: 2.5, flexDirection: 'column', gap: 1 }}
                >
                  <QrCodeIcon sx={{ fontSize: 36 }} />
                  QRIS
                </Button>
              </Box>
              {paying && (
                <Box className="flex justify-center mt-2">
                  <CircularProgress />
                </Box>
              )}
              <Button
                fullWidth
                variant="text"
                color="inherit"
                sx={{ mt: 1 }}
                onClick={() => {
                  setPayDialog({ open: false, booking: null });
                  setPayCashTenderedInput('');
                  setPayStep('select');
                  setQrisErrorBanner(null);
                }}
              >
                Batal
              </Button>
            </Box>
          </>
        ) : (
          <>
            <DialogTitle fontWeight={500} sx={{ textAlign: 'center', pb: 0 }}>
              Konfirmasi Pembayaran QRIS
            </DialogTitle>
            <DialogContent>
              {qrisErrorBanner && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setQrisErrorBanner(null)}>
                  {qrisErrorBanner}
                </Alert>
              )}
              {payDialog.booking && (
                <PaymentBookingDetailCard
                  booking={payDialog.booking}
                  assigneeLabel={ui.assigneeReceiptLabel}
                  customerPhone={payDialog.booking.customerPhone}
                />
              )}
              <Box className="text-center py-2">
                {qrisImageBase64 ? (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      mb: 2,
                      bgcolor: 'white',
                      p: 1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrisImageBase64}
                      alt="QRIS"
                      style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '20px',
                      bgcolor: 'rgba(192,57,43,0.1)',
                      border: '2px solid',
                      borderColor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <QrCodeIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary" mb={2}>
                  {qrisImageBase64
                    ? 'Minta pelanggan scan QR di atas'
                    : 'Minta pelanggan scan QRIS yang tersedia di kasir'}
                </Typography>
                <Typography variant="h5" fontWeight={900} color="primary" mb={1}>
                  Rp {(payDialog.booking ? bookingSubtotalOrLegacy(payDialog.booking) : 0).toLocaleString('id-ID')}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="contained"
                size="large"
                color="success"
                onClick={() => handlePayment('qris')}
                disabled={paying}
                startIcon={paying ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                sx={{ mb: 1.5, py: 1.5 }}
              >
                {paying ? 'Memproses…' : 'QRIS Sudah Dibayar'}
              </Button>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => { setQrisErrorBanner(null); void handlePayment('cash'); }}
                disabled={paying}
                startIcon={<PaymentsIcon />}
                color="secondary"
                sx={{ mb: 1 }}
              >
                Ganti ke Tunai
              </Button>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => { setPayStep('select'); setQrisErrorBanner(null); }}
                disabled={paying}
                color="inherit"
              >
                ← Kembali
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onClose={() => setReceiptDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500} className="text-center">
          <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
          <br />Pembayaran Berhasil!
        </DialogTitle>
        <DialogContent>
          {thermalReceipt && (
            <Box className="bg-gray-50 rounded-xl p-4">
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 2,
                  bgcolor: 'white',
                }}
              >
                <iframe
                  title="Pratinjau nota"
                  srcDoc={buildThermalReceiptPrintHtmlDocument(thermalReceipt, receiptPrintOpts)}
                  style={{ width: '100%', height: 380, border: 'none', display: 'block' }}
                />
              </Box>
              <Box className="flex justify-center gap-2">
                <Tooltip title="Cetak Bluetooth">
                  <IconButton
                    size="large"
                    color="primary"
                    onClick={printReceiptBluetooth}
                    aria-label="Cetak nota lewat Bluetooth"
                    sx={{ width: 56, height: 56 }}
                  >
                    <BluetoothIcon sx={{ fontSize: 32 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cetak (browser)">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={printReceiptBrowser}
                    aria-label="Cetak nota lewat browser"
                  >
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Upload foto hasil  (opsional) */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CameraAltIcon fontSize="small" />
                Foto Hasil (Opsional, maks 3)
              </Typography>
              <Box className="flex gap-2 flex-wrap mb-2">
                {uploadPhotos.map((src, i) => (
                  <Box key={i} sx={{ position: 'relative', width: 72, height: 72 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`foto-${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                    <Box
                      onClick={() => setUploadPhotos((p) => p.filter((_, idx) => idx !== i))}
                      sx={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 700, lineHeight: 1 }}
                    >
                      ✕
                    </Box>
                  </Box>
                ))}
                {uploadPhotos.length < 3 && (
                  <label>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleSelectPhotos} />
                    <Box sx={{ width: 72, height: 72, border: '2px dashed', borderColor: 'primary.main', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'primary.main' }}>
                      <PhotoLibraryIcon fontSize="small" />
                      <Typography variant="caption" sx={{ fontSize: 9, textAlign: 'center', mt: 0.3 }}>Tambah Foto</Typography>
                    </Box>
                  </label>
                )}
              </Box>
              {uploadPhotos.length > 0 && (
                <Button
                  fullWidth variant="contained" color="success" size="small"
                  startIcon={uploadingPhotos ? <CircularProgress size={14} color="inherit" /> : <CameraAltIcon />}
                  onClick={() => lastBookingRef.current && handleUploadPhotos(lastBookingRef.current._id)}
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? 'Menyimpan...' : `Simpan ${uploadPhotos.length} Foto`}
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              setReceiptDialog(false);
              setThermalReceipt(null);
              setReceiptBookingDateIso(null);
              setUploadPhotos([]);
            }}
          >
            Selesai
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Foto  Terakhir */}
      <Dialog
        open={lastServicePhotoDialog.open}
        onClose={() => setLastServicePhotoDialog({ open: false, booking: null, data: null, loading: false })}
        fullWidth maxWidth="xs"
      >
        <DialogTitle fontWeight={500}>
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'info.main' }} />
          Foto Terakhir
          {lastServicePhotoDialog.booking && (
            <Typography variant="caption" display="block" color="text.secondary">
              {lastServicePhotoDialog.booking.customerName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {lastServicePhotoDialog.loading ? (
            <Box className="flex justify-center py-8"><CircularProgress /></Box>
          ) : !lastServicePhotoDialog.data ? (
            <Box className="text-center py-8">
              <CameraAltIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography color="text.secondary" className="mt-2">
                Belum ada foto tersimpan untuk customer ini
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                {new Date(lastServicePhotoDialog.data.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                {lastServicePhotoDialog.data.staffName && ` · ${lastServicePhotoDialog.data.staffName}`}
              </Typography>
              <Box className="flex flex-col gap-2">
                {lastServicePhotoDialog.data.photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`foto-${i + 1}`}
                    style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLastServicePhotoDialog({ open: false, booking: null, data: null, loading: false })}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>

      <StaffBottomNav />
    </AppPageShell>
  );
}
