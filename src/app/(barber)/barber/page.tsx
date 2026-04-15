'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, IconButton, Avatar, List,
  ListItem, ListItemButton, ListItemText, ListItemAvatar,
  Switch, FormControlLabel,
} from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PanToolIcon from '@mui/icons-material/PanTool';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { BarberBottomNav } from '@/components/layout/BottomNav';

interface Booking {
  _id: string;
  customerName: string;
  serviceName: string;
  servicePrice: number;
  queueNumber: number;
  status: string;
  notes?: string;
  barberName?: string;
  barberId?: string;
  date: string;
}

interface Tenant {
  _id: string;
  name: string;
  address?: string;
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

  return [
    RESET, CENTER, BOLD_ON, DOUBLE_HEIGHT,
    shopName + LINE_FEED,
    NORMAL_SIZE, BOLD_OFF,
    '✂ BARBERSHOP ✂\n', dashes,
    LEFT,
    `Tgl : ${date}\n`,
    `No  : #${booking.queueNumber.toString().padStart(4, '0')}\n`,
    divider, CENTER, BOLD_ON,
    booking.serviceName + LINE_FEED,
    BOLD_OFF, LEFT,
    `Pelanggan : ${booking.customerName}\n`,
    booking.barberName ? `Barber    : ${booking.barberName}\n` : '',
    booking.notes ? `Catatan   : ${booking.notes}\n` : '',
    divider, CENTER, BOLD_ON,
    `TOTAL: Rp ${payment.amount.toLocaleString('id-ID')}\n`,
    BOLD_OFF, LEFT,
    `Metode    : ${payment.method === 'cash' ? 'Tunai' : 'QRIS'}\n`,
    divider, CENTER,
    'Terima kasih sudah berkunjung!\n',
    'Sampai jumpa lagi 😊\n',
    LINE_FEED, LINE_FEED, LINE_FEED, CUT,
  ].join('');
}

export default function BarberPage() {
  const { user, isLoading, loadFromStorage, setAuth, token } = useAuthStore();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [payDialog, setPayDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [paying, setPaying] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const lastBookingRef = useRef<Booking | null>(null);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'barber') { router.replace('/'); return; }
    if (!user.tenantId) {
      loadTenants();
      setTenantDialogOpen(true);
    } else {
      loadCurrentTenant(user.tenantId);
      loadBookings();
    }
  }, [user, isLoading]);

  const loadTenants = useCallback(async () => {
    setTenantLoading(true);
    try {
      const res = await api.get('/barbers/my-tenants');
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
      setCurrentTenant(tenant);
      setTenantDialogOpen(false);
      loadBookings(tenant._id);
    } catch {
      toast.error('Gagal berpindah salon');
    }
  };

  const handleToggleAvailability = async () => {
    if (!user?.barberId) return;
    setTogglingAvail(true);
    try {
      const res = await api.patch(`/barbers/${user.barberId}/availability`);
      setIsAvailable(res.data.isAvailable);
      toast.success(res.data.isAvailable ? 'Status: Tersedia' : 'Status: Tidak Tersedia');
    } catch {
      toast.error('Gagal mengubah status');
    } finally {
      setTogglingAvail(false);
    }
  };

  const loadBookings = useCallback(async (tenantId?: string) => {
    const tid = tenantId || user?.tenantId;
    if (!tid) return;
    setLoading(true);
    try {
      const res = await api.get('/bookings/today');
      setBookings(res.data);
    } catch {
      toast.error('Gagal memuat antrian');
    } finally {
      setLoading(false);
    }
  }, [user]);

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
        barberId: user?.barberId || user?._id,
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
    lastBookingRef.current = b;
    setPayDialog({ open: true, booking: b });
  };

  const handlePayment = async (method: 'cash' | 'qris') => {
    const booking = lastBookingRef.current;
    if (!booking) return;
    setPaying(true);
    try {
      const res = await api.post('/payments', { bookingId: booking._id, method });
      const payment: Payment = res.data;

      let shopName = currentTenant?.name || 'Barbershop';
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
    const date = new Date(payment.paidAt).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 4mm; }
      .center { text-align: center; } .bold { font-weight: bold; } .large { font-size: 16px; }
      .divider { border-top: 1px dashed #000; margin: 4px 0; } .row { display: flex; justify-content: space-between; }
      .spacer { margin: 4px 0; } @media print { @page { margin: 0; size: 80mm auto; } }
    </style></head><body>
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
    </body></html>`;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); }, 300); }
  };

  const myBarberId = user?.barberId || user?._id;
  const pendingBookings = bookings.filter((b) => b.status !== 'done' && b.status !== 'cancelled');
  const doneBookings = bookings.filter((b) => b.status === 'done');

  const isMyQueue = (b: Booking) => b.barberId === myBarberId;

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
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
        <Box className="p-4 text-center mt-12">
          <StorefrontIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary" className="mt-2">Pilih Salon Tempat Bekerja</Typography>
          <Button variant="contained" className="mt-4" onClick={() => { loadTenants(); setTenantDialogOpen(true); }}>
            Pilih Salon
          </Button>
        </Box>
      ) : (
        <Box className="p-4 max-w-lg mx-auto">
          {/* Info barber */}
          <Card className="mb-4" sx={{ border: '1px solid', borderColor: isAvailable ? 'success.light' : 'warning.light', bgcolor: isAvailable ? '#f0fdf4' : '#fffbeb' }}>
            <CardContent className="py-3">
              <Box className="flex items-center gap-3">
                <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontWeight: 700 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box className="flex-1">
                  <Typography fontWeight={700}>{user?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Barber · {currentTenant?.name}</Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isAvailable}
                      onChange={handleToggleAvailability}
                      disabled={togglingAvail || !user?.barberId}
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
            {pendingBookings.map((b) => {
              const mine = isMyQueue(b);
              return (
                <Card
                  key={b._id}
                  className="border-l-4"
                  sx={{ borderLeftColor: mine ? 'primary.main' : 'grey.400' }}
                >
                  <CardContent>
                    <Box className="flex justify-between items-start mb-2">
                      <Box>
                        <Box className="flex items-center gap-2">
                          <Typography variant="h6" fontWeight={800}>#{b.queueNumber}</Typography>
                          {mine ? (
                            <Chip label="Antrian Saya" size="small" color="primary" variant="outlined" />
                          ) : (
                            <Chip label={b.barberName ? `Barber: ${b.barberName}` : 'Belum ada barber'} size="small" color="default" variant="outlined" />
                          )}
                        </Box>
                        <Typography fontWeight={600}>{b.customerName}</Typography>
                        <Typography variant="body2" color="text.secondary">{b.serviceName}</Typography>
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
                      {mine && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PaymentsIcon />}
                          onClick={() => handleOpenPayDialog(b)}
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
                {doneBookings.map((b) => (
                  <Card key={b._id} className="opacity-60">
                    <CardContent className="py-3 flex justify-between items-center">
                      <Box>
                        <Typography fontWeight={600}>#{b.queueNumber} — {b.customerName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {b.serviceName}{b.barberName && ` · ${b.barberName}`}
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

      {/* Tenant Selection Dialog */}
      <Dialog open={tenantDialogOpen} onClose={() => { if (user?.tenantId) setTenantDialogOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700}>
          <StorefrontIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Pilih Salon Tempat Bekerja
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
                      primary={<Typography fontWeight={700}>{t.name}</Typography>}
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

      {/* Payment Dialog */}
      <Dialog open={payDialog.open} onClose={() => setPayDialog({ open: false, booking: null })} fullWidth maxWidth="xs">
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
            </Box>
          )}
          <Box className="flex gap-3">
            <Button fullWidth variant="outlined" size="large" onClick={() => handlePayment('cash')} disabled={paying} sx={{ py: 3, flexDirection: 'column', gap: 1 }}>
              <PaymentsIcon sx={{ fontSize: 40 }} />
              Tunai
            </Button>
            <Button fullWidth variant="outlined" size="large" onClick={() => handlePayment('qris')} disabled={paying} sx={{ py: 3, flexDirection: 'column', gap: 1 }}>
              <QrCodeIcon sx={{ fontSize: 40 }} />
              QRIS
            </Button>
          </Box>
          {paying && <Box className="flex justify-center mt-4"><CircularProgress /></Box>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialog({ open: false, booking: null })}>Batal</Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onClose={() => setReceiptDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700} className="text-center">
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
                <Typography variant="caption" className="text-center block" sx={{ fontFamily: 'inherit' }}>✂ BARBERSHOP ✂</Typography>
                <Divider className="my-1" />
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  No  : #{receiptData.booking.queueNumber.toString().padStart(4, '0')}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'inherit' }} className="block">
                  Tgl : {new Date(receiptData.payment.paidAt).toLocaleString('id-ID')}
                </Typography>
                <Divider className="my-1" />
                <Typography variant="body2" className="text-center font-bold block" sx={{ fontFamily: 'inherit', fontWeight: 700 }}>
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
            </Box>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button fullWidth variant="contained" onClick={() => setReceiptDialog(false)}>Selesai</Button>
        </DialogActions>
      </Dialog>

      <BarberBottomNav />
    </Box>
  );
}
