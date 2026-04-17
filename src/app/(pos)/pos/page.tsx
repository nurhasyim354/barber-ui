'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, IconButton, List, ListItemButton,
  ListItemAvatar, Avatar, ListItemText, Radio,
} from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import HistoryIcon from '@mui/icons-material/History';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { compressImage } from '@/lib/imageUtils';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface Booking {
  _id: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  servicePrice: number;
  queueNumber: number;
  status: string;
  notes?: string;
  barberId?: string;
  barberName?: string;
  date: string;
}

interface HaircutPhoto {
  _id: string;
  photos: string[];
  barberName?: string | null;
  createdAt: string;
}

interface BarberOption {
  _id: string;
  name: string;
  photoUrl?: string | null;
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

// ESC/POS helpers
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

  const lines = [
    RESET,
    CENTER,
    BOLD_ON,
    DOUBLE_HEIGHT,
    shopName + LINE_FEED,
    NORMAL_SIZE,
    BOLD_OFF,
    '✂ BARBERSHOP ✂\n',
    dashes,
    LEFT,
    `Tgl : ${date}\n`,
    `No  : #${booking.queueNumber.toString().padStart(4, '0')}\n`,
    divider,
    CENTER,
    BOLD_ON,
    booking.serviceName + LINE_FEED,
    BOLD_OFF,
    LEFT,
    `Pelanggan : ${booking.customerName}\n`,
    booking.barberName ? `Barber    : ${booking.barberName}\n` : '',
    booking.notes ? `Catatan   : ${booking.notes}\n` : '',
    divider,
    CENTER,
    BOLD_ON,
    `TOTAL: Rp ${payment.amount.toLocaleString('id-ID')}\n`,
    BOLD_OFF,
    LEFT,
    `Metode    : ${payment.method === 'cash' ? 'Tunai' : 'QRIS'}\n`,
    divider,
    CENTER,
    'Terima kasih sudah berkunjung!\n',
    'Sampai jumpa lagi 😊\n',
    LINE_FEED,
    LINE_FEED,
    LINE_FEED,
    CUT,
  ];

  return lines.join('');
}

export default function PosPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrisImageBase64, setQrisImageBase64] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ open: boolean; booking: Booking | null }>({
    open: false, booking: null,
  });
  const [payStep, setPayStep] = useState<'select' | 'qris-confirm'>('select');
  const [paying, setPaying] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptDialog, setReceiptDialog] = useState(false);

  const [barberDialog, setBarberDialog] = useState<{ open: boolean; booking: Booking | null }>({
    open: false, booking: null,
  });
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [barbersLoaded, setBarbersLoaded] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [savingBarber, setSavingBarber] = useState(false);

  // Foto hasil cukur
  const [uploadPhotos, setUploadPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [lastHaircutDialog, setLastHaircutDialog] = useState<{ open: boolean; booking: Booking | null; data: HaircutPhoto | null; loading: boolean }>({
    open: false, booking: null, data: null, loading: false,
  });

  // Keep latest booking ref so receipt still has data after dialog closes
  const lastBookingRef = useRef<Booking | null>(null);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'customer') { router.replace('/booking'); return; }
    loadBookings();
    // Muat QRIS image sekali saat halaman dibuka
    if (user.tenantId) {
      api.get(`/tenants/${user.tenantId}/settings`)
        .then((r) => setQrisImageBase64(r.data?.qrisImageBase64 || null))
        .catch(() => {});
    }
  }, [user, isLoading]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/today');
      setBookings(res.data);
    } catch {
      toast.error('Gagal memuat antrian');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      toast.success('Status diupdate');
      loadBookings();
    } catch {
      toast.error('Gagal update status');
    }
  };

  const handleOpenBarberDialog = async (b: Booking) => {
    setSelectedBarberId(b.barberId ?? null);
    setBarberDialog({ open: true, booking: b });
    if (!barbersLoaded && user?.tenantId) {
      try {
        const res = await api.get(`/tenants/${user.tenantId}/barbers`);
        setBarbers(res.data);
        setBarbersLoaded(true);
      } catch {
        toast.error('Gagal memuat daftar barber');
      }
    }
  };

  const handleSaveBarber = async () => {
    const booking = barberDialog.booking;
    if (!booking) return;
    setSavingBarber(true);
    try {
      await api.patch(`/bookings/${booking._id}/barber`, { barberId: selectedBarberId });
      toast.success('Barber berhasil diubah');
      setBarberDialog({ open: false, booking: null });
      loadBookings();
    } catch {
      toast.error('Gagal mengubah barber');
    } finally {
      setSavingBarber(false);
    }
  };

  const handleOpenPayDialog = (b: Booking) => {
    lastBookingRef.current = b;
    setPayStep('select');
    setPayDialog({ open: true, booking: b });
  };

  const handlePayment = async (method: 'cash' | 'qris') => {
    const booking = lastBookingRef.current;
    if (!booking) return;
    setPaying(true);
    try {
      const res = await api.post('/payments', { bookingId: booking._id, method });
      const payment: Payment = res.data;

      // Fetch tenant name for receipt
      let shopName = 'Barbershop';
      try {
        const tenantRes = await api.get(`/tenants/${user!.tenantId}`);
        shopName = tenantRes.data?.name || shopName;
      } catch { /* use default */ }

      setReceiptData({ booking, payment, shopName });
      toast.success('Pembayaran berhasil!');
      setPayDialog({ open: false, booking: null });
      setReceiptDialog(true);
      loadBookings();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal memproses pembayaran'
      );
    } finally {
      setPaying(false);
    }
  };

  const printReceiptBluetooth = async () => {
    if (!receiptData) { toast.error('Data nota tidak tersedia'); return; }

    if (!('bluetooth' in navigator)) {
      toast.error('Browser tidak mendukung Bluetooth. Gunakan Chrome di Android/Desktop.');
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

      // Send in chunks (BT limitation ~512 bytes per write)
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
    const date = new Date(payment.paidAt).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 4mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; }
          .spacer { margin: 4px 0; }
          @media print {
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="center bold large spacer">${shopName}</div>
        <div class="center spacer">✂ BARBERSHOP ✂</div>
        <div class="divider"></div>
        <div>Tgl : ${date}</div>
        <div>No  : #${booking.queueNumber.toString().padStart(4, '0')}</div>
        <div class="divider"></div>
        <div class="center bold spacer">${booking.serviceName}</div>
        <div>Pelanggan : ${booking.customerName}</div>
        ${booking.barberName ? `<div>Barber    : ${booking.barberName}</div>` : ''}
        ${booking.notes ? `<div>Catatan   : ${booking.notes}</div>` : ''}
        <div class="divider"></div>
        <div class="center bold large spacer">TOTAL: Rp ${payment.amount.toLocaleString('id-ID')}</div>
        <div>Metode    : ${payment.method === 'cash' ? 'Tunai' : 'QRIS'}</div>
        <div class="divider"></div>
        <div class="center spacer">Terima kasih sudah berkunjung!</div>
        <div class="center">Sampai jumpa lagi 😊</div>
        <div class="spacer"></div>
        <div class="spacer"></div>
      </body>
      </html>
    `;

    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 300);
    }
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
      await api.post(`/bookings/${bookingId}/haircut-photos`, { photos: uploadPhotos });
      toast.success('Foto berhasil disimpan!');
      setUploadPhotos([]);
    } catch {
      toast.error('Gagal menyimpan foto');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleOpenLastHaircut = async (b: Booking) => {
    setLastHaircutDialog({ open: true, booking: b, data: null, loading: true });
    try {
      const res = await api.get(`/bookings/${b._id}/last-haircut`);
      setLastHaircutDialog((prev) => ({ ...prev, data: res.data, loading: false }));
    } catch {
      setLastHaircutDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const pendingBookings = bookings.filter((b) => b.status !== 'done' && b.status !== 'cancelled');
  const doneBookings = bookings.filter((b) => b.status === 'done');

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        title="Kasir / POS"
        right={
          <Box className="flex items-center">
          <IconButton color="inherit" onClick={loadBookings}>
            <RefreshIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => { logout(); router.push('/login'); }}>
          <LogoutIcon />
        </IconButton>
        </Box>
        }
      />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <Box className="p-4 max-w-lg mx-auto">
          <Typography variant="h6" fontWeight={700} className="mb-3">
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
            {pendingBookings.map((b) => (
              <Card key={b._id} className="border-l-4" sx={{ borderLeftColor: 'primary.main' }}>
                <CardContent>
                  <Box className="flex justify-between items-start mb-2">
                    <Box>
                      <Typography variant="h6" fontWeight={800}>#{b.queueNumber}</Typography>
                      <Typography fontWeight={600}>{b.customerName}</Typography>
                      <Typography variant="body2" color="text.secondary">{b.serviceName}</Typography>
                      {b.barberName && (
                        <Typography variant="body2" color="text.secondary">
                          Barber: {b.barberName}
                        </Typography>
                      )}
                      {b.notes && (
                        <Typography variant="body2" className="italic text-gray-400">
                          &quot;{b.notes}&quot;
                        </Typography>
                      )}
                    </Box>
                    <Box className="text-right">
                      <Typography fontWeight={800} color="primary">
                        Rp {b.servicePrice.toLocaleString('id-ID')}
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
                    {b.status === 'waiting' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleUpdateStatus(b._id, 'in_progress')}
                      >
                        Mulai Layani
                      </Button>
                    )}
                    {b.status === 'in_progress' && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="info"
                        startIcon={<HistoryIcon />}
                        onClick={() => handleOpenLastHaircut(b)}
                      >
                        Foto Terakhir
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PaymentsIcon />}
                      onClick={() => handleOpenPayDialog(b)}
                    >
                      Bayar
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      startIcon={<SwapHorizIcon />}
                      onClick={() => handleOpenBarberDialog(b)}
                    >
                      Ganti Barber
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      onClick={() => handleUpdateStatus(b._id, 'cancelled')}
                    >
                      Batal
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {doneBookings.length > 0 && (
            <>
              <Typography variant="subtitle1" fontWeight={600} color="text.secondary" className="mb-2">
                Selesai ({doneBookings.length})
              </Typography>
              <Box className="flex flex-col gap-2">
                {doneBookings.map((b) => (
                  <Card key={b._id} className="opacity-60">
                    <CardContent className="py-3 flex justify-between items-center">
                      <Box>
                        <Typography fontWeight={600}>#{b.queueNumber} — {b.customerName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {b.serviceName}
                          {b.barberName && ` · ${b.barberName}`}
                        </Typography>
                      </Box>
                      <Box className="text-right">
                        <CheckCircleIcon color="success" />
                        <Typography variant="body2" fontWeight={700}>
                          Rp {b.servicePrice.toLocaleString('id-ID')}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Payment Dialog */}
      <Dialog
        open={payDialog.open}
        onClose={() => { setPayDialog({ open: false, booking: null }); setPayStep('select'); }}
        fullWidth
        maxWidth="xs"
      >
        {payStep === 'select' ? (
          <>
            <DialogTitle fontWeight={700}>Pilih Metode Bayar</DialogTitle>
            <DialogContent>
              {payDialog.booking && (
                <Box className="text-center mb-4">
                  <Typography variant="h5" fontWeight={800} color="primary">
                    Rp {payDialog.booking.servicePrice.toLocaleString('id-ID')}
                  </Typography>
                  <Typography color="text.secondary">
                    {payDialog.booking.customerName} — {payDialog.booking.serviceName}
                  </Typography>
                  {payDialog.booking.barberName && (
                    <Typography variant="body2" color="text.secondary">
                      Barber: {payDialog.booking.barberName}
                    </Typography>
                  )}
                </Box>
              )}
              <Box className="flex gap-3">
                <Button
                  fullWidth variant="outlined" size="large"
                  onClick={() => handlePayment('cash')}
                  disabled={paying}
                  sx={{ py: 3, flexDirection: 'column', gap: 1 }}
                >
                  <PaymentsIcon sx={{ fontSize: 40 }} />
                  Tunai
                </Button>
                <Button
                  fullWidth variant="outlined" size="large"
                  onClick={() => setPayStep('qris-confirm')}
                  disabled={paying}
                  sx={{ py: 3, flexDirection: 'column', gap: 1 }}
                >
                  <QrCodeIcon sx={{ fontSize: 40 }} />
                  QRIS
                </Button>
              </Box>
              {paying && <Box className="flex justify-center mt-4"><CircularProgress /></Box>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPayDialog({ open: false, booking: null })}>Batal</Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle fontWeight={700} sx={{ textAlign: 'center', pb: 0 }}>
              Konfirmasi Pembayaran QRIS
            </DialogTitle>
            <DialogContent>
              {/* QRIS waiting screen */}
              <Box className="text-center py-2">
                {/* QRIS image or placeholder */}
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
                      width: 80, height: 80, borderRadius: '20px',
                      bgcolor: 'rgba(192,57,43,0.1)', border: '2px solid',
                      borderColor: 'primary.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mx: 'auto', mb: 2,
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
                  Rp {payDialog.booking?.servicePrice.toLocaleString('id-ID')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {payDialog.booking?.customerName} — {payDialog.booking?.serviceName}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Primary: confirm QRIS paid */}
              <Button
                fullWidth variant="contained" size="large"
                color="success"
                onClick={() => handlePayment('qris')}
                disabled={paying}
                startIcon={paying ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                sx={{ mb: 1.5, py: 1.5 }}
              >
                {paying ? 'Memproses…' : 'QRIS Sudah Dibayar'}
              </Button>

              {/* Fallback: switch to cash */}
              <Button
                fullWidth variant="outlined" size="large"
                onClick={() => handlePayment('cash')}
                disabled={paying}
                startIcon={<PaymentsIcon />}
                sx={{ mb: 1 }}
              >
                Ganti ke Tunai
              </Button>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setPayStep('select')}
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
      <Dialog
        open={receiptDialog}
        onClose={() => setReceiptDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle fontWeight={700} className="text-center">
          <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
          <br />Pembayaran Berhasil!
        </DialogTitle>
        <DialogContent>
          {receiptData && (
            <Box className="bg-gray-50 rounded-xl p-4">
              {/* Mini receipt preview */}
              <Box
                className="font-mono text-xs bg-white border rounded-lg p-3 mb-4"
                sx={{ fontFamily: 'Courier New, monospace', lineHeight: 1.6 }}
              >
                <Typography
                  variant="body2"
                  className="text-center font-bold"
                  sx={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}
                >
                  {receiptData.shopName}
                </Typography>
                <Typography
                  variant="caption"
                  className="text-center block"
                  sx={{ fontFamily: 'inherit' }}
                >
                  ✂ BARBERSHOP ✂
                </Typography>
                <Divider className="my-1" />
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  No  : #{receiptData.booking.queueNumber.toString().padStart(4, '0')}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  Tgl : {new Date(receiptData.payment.paidAt).toLocaleString('id-ID')}
                </Typography>
                <Divider className="my-1" />
                <Typography
                  variant="body2"
                  className="text-center font-bold block"
                  sx={{ fontFamily: 'inherit', fontWeight: 700 }}
                >
                  {receiptData.booking.serviceName}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  Pelanggan: {receiptData.booking.customerName}
                </Typography>
                {receiptData.booking.barberName && (
                  <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                    Barber: {receiptData.booking.barberName}
                  </Typography>
                )}
                <Divider className="my-1" />
                <Typography
                  variant="body2"
                  className="text-center font-bold block"
                  sx={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}
                >
                  TOTAL: Rp {receiptData.payment.amount.toLocaleString('id-ID')}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  Metode: {receiptData.payment.method === 'cash' ? 'Tunai' : 'QRIS'}
                </Typography>
                <Divider className="my-1" />
                <Typography
                  variant="caption"
                  className="text-center block"
                  sx={{ fontFamily: 'inherit' }}
                >
                  Terima kasih! 😊
                </Typography>
              </Box>

              <Box className="flex gap-2">
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={printReceiptBluetooth}
                  size="small"
                >
                  Cetak Bluetooth
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={printReceiptBrowser}
                  size="small"
                >
                  Cetak Browser
                </Button>
              </Box>

              {/* Upload foto hasil cukur (opsional) */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} className="mb-2 flex items-center gap-1">
                <CameraAltIcon fontSize="small" />
                Foto Hasil Cukur (Opsional, maks 3)
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
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleSelectPhotos}
                    />
                    <Box
                      sx={{
                        width: 72, height: 72, border: '2px dashed', borderColor: 'primary.main',
                        borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: 'primary.main',
                      }}
                    >
                      <PhotoLibraryIcon fontSize="small" />
                      <Typography variant="caption" sx={{ fontSize: 9, textAlign: 'center', mt: 0.3 }}>
                        Tambah Foto
                      </Typography>
                    </Box>
                  </label>
                )}
              </Box>
              {uploadPhotos.length > 0 && (
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="small"
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
          <Button fullWidth variant="contained" onClick={() => { setReceiptDialog(false); setUploadPhotos([]); }}>
            Selesai
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Barber Dialog */}
      <Dialog
        open={barberDialog.open}
        onClose={() => setBarberDialog({ open: false, booking: null })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle fontWeight={700}>Ganti Barber</DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {barberDialog.booking && (
            <Typography variant="body2" color="text.secondary" mb={1}>
              Booking #{barberDialog.booking.queueNumber} — {barberDialog.booking.customerName}
            </Typography>
          )}
          <List disablePadding>
            {/* Opsi tanpa barber */}
            <ListItemButton
              onClick={() => setSelectedBarberId(null)}
              selected={selectedBarberId === null}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'grey.300' }}>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="Tanpa Barber" />
              <Radio checked={selectedBarberId === null} size="small" />
            </ListItemButton>

            {barbers.map((barber) => (
              <ListItemButton
                key={barber._id}
                onClick={() => setSelectedBarberId(barber._id)}
                selected={selectedBarberId === barber._id}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemAvatar>
                  <Avatar src={barber.photoUrl ?? undefined} alt={barber.name}>
                    {barber.name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={barber.name} />
                <Radio checked={selectedBarberId === barber._id} size="small" />
              </ListItemButton>
            ))}

            {!barbersLoaded && (
              <Box className="flex justify-center py-4">
                <CircularProgress size={24} />
              </Box>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBarberDialog({ open: false, booking: null })} color="inherit">
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveBarber}
            disabled={savingBarber}
            startIcon={savingBarber ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Foto Cukur Terakhir */}
      <Dialog
        open={lastHaircutDialog.open}
        onClose={() => setLastHaircutDialog({ open: false, booking: null, data: null, loading: false })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle fontWeight={700}>
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'info.main' }} />
          Foto Cukur Terakhir
          {lastHaircutDialog.booking && (
            <Typography variant="caption" display="block" color="text.secondary">
              {lastHaircutDialog.booking.customerName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {lastHaircutDialog.loading ? (
            <Box className="flex justify-center py-8"><CircularProgress /></Box>
          ) : !lastHaircutDialog.data ? (
            <Box className="text-center py-8">
              <CameraAltIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography color="text.secondary" className="mt-2">
                Belum ada foto cukur tersimpan untuk customer ini
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" className="mb-2">
                {new Date(lastHaircutDialog.data.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                {lastHaircutDialog.data.barberName && ` · ${lastHaircutDialog.data.barberName}`}
              </Typography>
              <Box className="flex gap-2 flex-wrap">
                {lastHaircutDialog.data.photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`foto-${i + 1}`}
                    style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee', marginBottom: 8 }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLastHaircutDialog({ open: false, booking: null, data: null, loading: false })}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>

      <TenantAdminBottomNav />
    </Box>
  );
}
