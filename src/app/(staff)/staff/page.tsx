'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, IconButton, Avatar, List,
  ListItem, ListItemButton, ListItemText, ListItemAvatar,
  Switch, FormControlLabel, Alert, TextField,
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
import {
  bookingServicesLabel,
  bookingSubtotalOrLegacy,
  formatBookingQueueDate,
  formatRpId,
  getReceiptServiceLines,
  type UiBooking,
} from '@/lib/bookingDisplay';

type Booking = UiBooking & { customerId: string };

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
}

interface Payment {
  _id: string;
  method: string;
  amount: number;
  status: string;
  paidAt: string;
}

interface ReceiptData {
  booking: Booking;
  payment: Payment;
  shopName: string;
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

const ESC = '\x1B';
const GS = '\x1D';
const RESET = ESC + '@';
const CENTER = ESC + 'a\x01';
const LEFT = ESC + 'a\x00';
const BOLD_ON = ESC + 'E\x01';
const BOLD_OFF = ESC + 'E\x00';
const DOUBLE_HEIGHT = GS + '!\x01';
const NORMAL_SIZE = GS + '!\x00';
const CUT = GS + 'V\x41\x00';
const LINE_FEED = '\n';

function buildReceipt(data: ReceiptData): string {
  const { booking, payment, shopName } = data;
  const date = new Date(payment.paidAt).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const divider = '--------------------------------\n';
  const dashes = '- - - - - - - - - - - - - - - -\n';
  const recLines = getReceiptServiceLines(booking);
  const itemParts: string[] = [];
  if (recLines.length > 0) {
    itemParts.push(LEFT, BOLD_ON, 'Layanan\n', BOLD_OFF, divider);
    for (const L of recLines) {
      itemParts.push(LEFT, `${L.name}\n`);
      itemParts.push(
        LEFT,
        `  Rp ${formatRpId(L.unitPrice)} x ${L.qty} = Rp ${formatRpId(L.subtotal)}\n`,
      );
    }
    itemParts.push(divider);
  } else {
    itemParts.push(
      CENTER,
      BOLD_ON,
      bookingServicesLabel(booking) + LINE_FEED,
      BOLD_OFF,
      LEFT,
      divider,
    );
  }

  return [
    RESET, CENTER, BOLD_ON, DOUBLE_HEIGHT,
    shopName + LINE_FEED,
    NORMAL_SIZE, BOLD_OFF,
    ' RECEIPT \n', dashes,
    LEFT,
    `Tgl : ${date}\n`,
    `No  : #${booking.queueNumber.toString().padStart(4, '0')}\n`,
    formatBookingQueueDate(booking.date)
      ? `Tgl booking : ${formatBookingQueueDate(booking.date)}\n`
      : '',
    divider,
    ...itemParts,
    `Pelanggan : ${booking.customerName}\n`,
    booking.staffName ? `Staff    : ${booking.staffName}\n` : '',
    booking.notes ? `Catatan   : ${booking.notes}\n` : '',
    divider, CENTER, BOLD_ON,
    `TOTAL: Rp ${payment.amount.toLocaleString('id-ID')}\n`,
    BOLD_OFF, LEFT,
    `Metode    : ${payment.method === 'cash' ? 'Tunai' : 'QRIS'}\n`,
    divider, CENTER,
    'Terima kasih sudah berkunjung!\n',
    'Sampai jumpa lagi\n',
    'https://booking.nh-apps.com\n',
    LINE_FEED, LINE_FEED, LINE_FEED, CUT,
  ].join('');
}

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
  const [payDialog, setPayDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payStep, setPayStep] = useState<'select' | 'qris-confirm'>('select');
  const [qrisErrorBanner, setQrisErrorBanner] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptDialog, setReceiptDialog] = useState(false);
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

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (!user?.tenantId) return;
    api.get(`/tenants/${user.tenantId}/settings`)
      .then((r) => setQrisImageBase64(r.data?.qrisImageBase64 || null))
      .catch(() => {});
  }, [user?.tenantId]);

  /** Jangan pakai [user] utuh — pembaruan profil (/auth/me) mengganti referensi user dan memicu loop jika memuat ulang antrian + loading. */
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'staff') { router.replace('/'); return; }
    if (!user.tenantId) {
      loadTenants();
      setTenantDialogOpen(true);
    } else {
      loadCurrentTenant(user.tenantId);
      loadBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya tenantId/role; hindari re-fetch saat phone/pendingPhone berubah
  }, [isLoading, user?.tenantId, user?.role]);

  const loadTenants = useCallback(async () => {
    setTenantLoading(true);
    try {
      const res = await api.get('/staff/my-tenants');
      setTenants(res.data);
    } catch {
      toast.error('Gagal memuat daftar salon');
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
    setPayAmountInput(String(bookingSubtotalOrLegacy(b)));
    setPayDialog({ open: true, booking: b });
  };

  const handlePayment = async (method: 'cash' | 'qris') => {
    const booking = lastBookingRef.current;
    if (!booking) return;
    const amount = parseRupiahInput(payAmountInput);
    if (amount == null) {
      toast.error('Masukkan jumlah pembayaran yang valid (minimal Rp 1)');
      return;
    }
    setPaying(true);
    try {
      const res = await api.post('/payments', { bookingId: booking._id, method, amount });
      const payment: Payment = res.data;

      let shopName = currentTenant?.name || 'Outlet';
      try {
        const tenantRes = await api.get(`/tenants/${user!.tenantId}`);
        shopName = tenantRes.data?.name || shopName;
      } catch { /* use default */ }

      setReceiptData({ booking, payment, shopName });
      toast.success('Pembayaran berhasil!');
      setPayDialog({ open: false, booking: null });
      setPayAmountInput('');
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
    if (!receiptData) { toast.error('Data nota tidak tersedia'); return; }
    if (!('bluetooth' in navigator)) {
      toast.error('Browser tidak mendukung Bluetooth.');
      return;
    }
    try {
      toast.loading('Mencari printer...');
      type BtDevice = {
        gatt?: {
          connect: () => Promise<{
            getPrimaryService: (uuid: string) => Promise<{
              getCharacteristic: (uuid: string) => Promise<{
                writeValue: (data: BufferSource) => Promise<void>;
              }>;
            }>;
          }>;
        };
      };
      const bt = (navigator as Navigator & {
        bluetooth: { requestDevice: (opts: object) => Promise<BtDevice> };
      }).bluetooth;
      const device = await bt.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      const text = buildReceipt(receiptData);
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const CHUNK = 100;
      for (let i = 0; i < data.length; i += CHUNK) {
        await characteristic?.writeValue(data.slice(i, i + CHUNK));
      }
      toast.dismiss();
      toast.success('Nota berhasil dicetak!');
    } catch (err) {
      toast.dismiss();
      const msg = (err as Error).message;
      if (msg?.includes('cancelled') || msg?.includes('No device')) {
        toast('Printer tidak dipilih', { icon: '⚠️' });
      } else {
        toast.error('Gagal cetak: ' + msg);
      }
    }
  };

  const printReceiptBrowser = () => {
    if (!receiptData) return;
    const { booking, payment, shopName } = receiptData;
    const assigneeLabel = ui.assigneeReceiptLabel;
    const date = new Date(payment.paidAt).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const recLines = getReceiptServiceLines(booking);
    const itemsHtml =
      recLines.length > 0
        ? `<div class="bold" style="margin-bottom:4px">Layanan</div>${recLines
            .map(
              (L) =>
                `<div style="margin-bottom:6px"><div class="bold">${esc(L.name)}</div>` +
                `<div class="row" style="display:flex;justify-content:space-between;gap:8px">` +
                `<span>Rp ${formatRpId(L.unitPrice)} x ${L.qty}</span>` +
                `<span>= Rp ${formatRpId(L.subtotal)}</span></div></div>`,
            )
            .join('')}`
        : `<div class="center bold spacer">${esc(bookingServicesLabel(booking))}</div>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 4mm; }
      .center { text-align: center; } .bold { font-weight: bold; } .large { font-size: 16px; }
      .divider { border-top: 1px dashed #000; margin: 4px 0; } .row { display: flex; justify-content: space-between; } .spacer { margin: 4px 0; }
      @media print { @page { margin: 0; size: 80mm auto; } }
    </style></head><body>
      <div class="center bold large spacer">${esc(shopName)}</div>
      <div class="center spacer"> RECEIPT </div>
      <div class="divider"></div>
      <div>Tgl : ${esc(date)}</div>
      <div>No  : #${booking.queueNumber.toString().padStart(4, '0')}</div>
      ${formatBookingQueueDate(booking.date) ? `<div>Tgl booking : ${esc(formatBookingQueueDate(booking.date))}</div>` : ''}
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div>Pelanggan : ${esc(booking.customerName)}</div>
      ${booking.staffName ? `<div>${esc(assigneeLabel)}    : ${esc(booking.staffName)}</div>` : ''}
      ${booking.notes ? `<div>Catatan   : ${esc(booking.notes)}</div>` : ''}
      <div class="divider"></div>
      <div class="center bold large spacer">TOTAL: Rp ${payment.amount.toLocaleString('id-ID')}</div>
      <div>Metode    : ${payment.method === 'cash' ? 'Tunai' : 'QRIS'}</div>
      <div class="divider"></div>
      <div class="center spacer">Terima kasih sudah berkunjung!</div>
      <div class="center">Sampai jumpa lagi 😊</div>
      <div class="center">https://booking.nh-apps.com</div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); }, 300); }
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
            <IconButton color="inherit" size="small" onClick={() => { loadTenants(); setTenantDialogOpen(true); }}>
              <StorefrontIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => loadBookings()}>
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
                                  {L.qty} x
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
                    <CardContent className="py-3 flex justify-between items-center">
                      <Box>
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
                                  {L.qty} x
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
                      <Box className="text-right">
                        <CheckCircleIcon color="success" />
                        <Typography variant="body2" fontWeight={500}>
                          Rp {bookingSubtotalOrLegacy(b).toLocaleString('id-ID')}
                        </Typography>
                      </Box>
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
          setPayAmountInput('');
          setPayStep('select');
          setQrisErrorBanner(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        {payStep === 'select' ? (
          <>
            <DialogTitle fontWeight={500}>Pilih Metode Bayar</DialogTitle>
            <DialogContent>
              {payDialog.booking && (
                <Box className="text-center mb-4">
                  <TextField
                    fullWidth
                    label="Jumlah bayar (Rp)"
                    value={payAmountInput}
                    onChange={(e) => setPayAmountInput(e.target.value.replace(/\D/g, ''))}
                    inputProps={{ inputMode: 'numeric' }}
                    helperText={
                      `Harga layanan: Rp ${bookingSubtotalOrLegacy(payDialog.booking).toLocaleString('id-ID')}`
                    }
                    sx={{ mb: 1.5, mt: 2 }}
                    autoFocus
                  />
                  <Typography color="text.secondary" variant="body2">
                    {payDialog.booking.customerName} — {bookingServicesLabel(payDialog.booking)}
                  </Typography>
                  {payDialog.booking.staffName && (
                    <Typography variant="body2" color="text.secondary">
                      {ui.assigneeReceiptLabel}: {payDialog.booking.staffName}
                    </Typography>
                  )}
                </Box>
              )}
              <Box className="flex gap-3">
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => handlePayment('cash')}
                  disabled={paying}
                  sx={{ py: 3, flexDirection: 'column', gap: 1 }}
                >
                  <PaymentsIcon sx={{ fontSize: 40 }} />
                  Tunai
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => setPayStep('qris-confirm')}
                  disabled={paying}
                  sx={{ py: 3, flexDirection: 'column', gap: 1 }}
                >
                  <QrCodeIcon sx={{ fontSize: 40 }} />
                  QRIS
                </Button>
              </Box>
              {paying && (
                <Box className="flex justify-center mt-4">
                  <CircularProgress />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setPayDialog({ open: false, booking: null });
                  setPayAmountInput('');
                  setPayStep('select');
                  setQrisErrorBanner(null);
                }}
              >
                Batal
              </Button>
            </DialogActions>
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
                  Rp {(parseRupiahInput(payAmountInput) ?? (payDialog.booking ? bookingSubtotalOrLegacy(payDialog.booking) : 0) ?? 0).toLocaleString('id-ID')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {payDialog.booking?.customerName} — {payDialog.booking ? bookingServicesLabel(payDialog.booking) : '—'}
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
          {receiptData && (
            <Box className="bg-gray-50 rounded-xl p-4">
              <Box className="font-mono text-xs bg-white border rounded-lg p-3 mb-4" sx={{ fontFamily: 'Courier New, monospace', lineHeight: 1.6 }}>
                <Typography variant="body2" className="text-center font-bold" sx={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
                  {receiptData.shopName}
                </Typography>
                <Typography variant="caption" className="text-center block" sx={{ fontFamily: 'inherit' }}> RECEIPT </Typography>
                <Divider className="my-1" />
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  No : #{receiptData.booking.queueNumber.toString().padStart(4, '0')}
                  {formatBookingQueueDate(receiptData.booking.date)
                    ? ` · ${formatBookingQueueDate(receiptData.booking.date)}`
                    : ''}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  Tgl bayar : {new Date(receiptData.payment.paidAt).toLocaleString('id-ID')}
                </Typography>
                <Divider className="my-1" />
                {(() => {
                  const lines = getReceiptServiceLines(receiptData.booking);
                  if (lines.length > 0) {
                    return (
                      <>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: 'inherit', fontWeight: 700, display: 'block', mb: 0.75 }}
                        >
                          Layanan
                        </Typography>
                        {lines.map((L, i) => (
                          <Box key={i} sx={{ mb: 1.25 }}>
                            <Typography
                              variant="caption"
                              sx={{ fontFamily: 'inherit', fontWeight: 600, display: 'block' }}
                            >
                              {L.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: 'inherit', display: 'block', lineHeight: 1.45 }}
                            >
                              Rp {formatRpId(L.unitPrice)} x {L.qty} = Rp {formatRpId(L.subtotal)}
                            </Typography>
                          </Box>
                        ))}
                      </>
                    );
                  }
                  return (
                    <Typography variant="body2" className="text-center font-bold block" sx={{ fontFamily: 'inherit', fontWeight: 700 }}>
                      {bookingServicesLabel(receiptData.booking)}
                    </Typography>
                  );
                })()}
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  Pelanggan: {receiptData.booking.customerName}
                </Typography>
                {receiptData.booking.staffName && (
                  <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                    {ui.assigneeReceiptLabel}: {receiptData.booking.staffName}
                  </Typography>
                )}
                <Divider className="my-1" />
                <Typography variant="body2" className="text-center font-bold block" sx={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
                  TOTAL: Rp {receiptData.payment.amount.toLocaleString('id-ID')}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  Metode: {receiptData.payment.method === 'cash' ? 'Tunai' : 'QRIS'}
                </Typography>
                <Divider className="my-1" />
                <Typography variant="caption" className="text-center block" sx={{ fontFamily: 'inherit' }}>
                  Terima kasih! 😊
                </Typography>
              </Box>
              <Box className="flex gap-2">
                <Button fullWidth variant="outlined" startIcon={<PrintIcon />} onClick={printReceiptBluetooth} size="small">Cetak Bluetooth</Button>
                <Button fullWidth variant="outlined" startIcon={<PrintIcon />} onClick={printReceiptBrowser} size="small">Cetak Browser</Button>
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
                  onClick={() => receiptData && handleUploadPhotos(receiptData.booking._id)}
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? 'Menyimpan...' : `Simpan ${uploadPhotos.length} Foto`}
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button fullWidth variant="contained" onClick={() => { setReceiptDialog(false); setUploadPhotos([]); }}>Selesai</Button>
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
