'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, IconButton,
} from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface Booking {
  _id: string;
  customerName: string;
  serviceName: string;
  servicePrice: number;
  queueNumber: number;
  status: string;
  notes?: string;
  date: string;
}

interface Payment {
  _id: string;
  method: string;
  amount: number;
  status: string;
  paidAt: string;
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

export default function PosPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payDialog, setPayDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [paying, setPaying] = useState(false);
  const [paidInfo, setPaidInfo] = useState<Payment | null>(null);
  const [receiptDialog, setReceiptDialog] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'customer') { router.replace('/booking'); return; }
    loadBookings();
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

  const handlePayment = async (method: 'cash' | 'qris') => {
    if (!payDialog.booking) return;
    setPaying(true);
    try {
      const res = await api.post('/payments', {
        bookingId: payDialog.booking._id,
        method,
      });
      setPaidInfo(res.data);
      toast.success('Pembayaran berhasil!');
      setPayDialog({ open: false, booking: null });
      setReceiptDialog(true);
      loadBookings();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal memproses pembayaran');
    } finally {
      setPaying(false);
    }
  };

  const printReceipt = async () => {
    if (!paidInfo || !payDialog.booking) {
      toast.error('Data nota tidak tersedia');
      return;
    }

    if (!('bluetooth' in navigator)) {
      toast.error('Browser tidak mendukung Bluetooth. Gunakan Chrome di Android/Desktop.');
      return;
    }

    try {
      toast.loading('Mencari printer...');
      const device = await (navigator as Navigator & {
        bluetooth: {
          requestDevice: (options: object) => Promise<{ gatt?: { connect: () => Promise<{ getPrimaryService: (uuid: string) => Promise<{ getCharacteristic: (uuid: string) => Promise<{ writeValue: (data: BufferSource) => Promise<void> }> }> }> } }>;
        };
      }).bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });

      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      const encoder = new TextEncoder();
      const lines = [
        '\x1B\x40',
        '\x1B\x61\x01',
        '--- BARBERSHOP ---\n',
        `${new Date(paidInfo.paidAt).toLocaleString('id-ID')}\n`,
        '-------------------\n',
        `${payDialog.booking.serviceName}\n`,
        `Pelanggan: ${payDialog.booking.customerName}\n`,
        `Metode: ${paidInfo.method === 'cash' ? 'Tunai' : 'QRIS'}\n`,
        '-------------------\n',
        `TOTAL: Rp ${paidInfo.amount.toLocaleString('id-ID')}\n`,
        '-------------------\n',
        'Terima kasih!\n\n\n',
      ].join('');

      await characteristic?.writeValue(encoder.encode(lines));
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

  const pendingBookings = bookings.filter((b) => b.status !== 'done' && b.status !== 'cancelled');
  const doneBookings = bookings.filter((b) => b.status === 'done');

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        title="Kasir / POS"
        right={
          <IconButton color="inherit" onClick={loadBookings}>
            <RefreshIcon />
          </IconButton>
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
                      {b.notes && <Typography variant="body2" className="italic text-gray-400">"{b.notes}"</Typography>}
                    </Box>
                    <Box className="text-right">
                      <Typography fontWeight={800} color="primary">
                        Rp {b.servicePrice.toLocaleString('id-ID')}
                      </Typography>
                      <Chip label={statusLabel[b.status]} color={statusColor[b.status]} size="small" className="mt-1" />
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
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PaymentsIcon />}
                      onClick={() => setPayDialog({ open: true, booking: b })}
                    >
                      Bayar
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
                        <Typography variant="body2" color="text.secondary">{b.serviceName}</Typography>
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
      <Dialog open={payDialog.open} onClose={() => setPayDialog({ open: false, booking: null })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700}>Pilih Metode Bayar</DialogTitle>
        <DialogContent>
          {payDialog.booking && (
            <Box className="text-center mb-4">
              <Typography variant="h5" fontWeight={800} color="primary">
                Rp {payDialog.booking.servicePrice.toLocaleString('id-ID')}
              </Typography>
              <Typography color="text.secondary">{payDialog.booking.customerName} — {payDialog.booking.serviceName}</Typography>
            </Box>
          )}
          <Box className="flex gap-3">
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<PaymentsIcon />}
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
              onClick={() => handlePayment('qris')}
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
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onClose={() => setReceiptDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700} className="text-center">
          <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
          <br />Pembayaran Berhasil!
        </DialogTitle>
        <DialogContent className="text-center">
          {paidInfo && (
            <Box className="bg-gray-50 rounded-xl p-4 text-left">
              <Typography variant="body2" color="text.secondary">Total Bayar</Typography>
              <Typography variant="h5" fontWeight={800} color="primary">
                Rp {paidInfo.amount.toLocaleString('id-ID')}
              </Typography>
              <Typography variant="body2" className="mt-1">
                Metode: <strong>{paidInfo.method === 'cash' ? 'Tunai' : 'QRIS'}</strong>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button
            fullWidth
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printReceipt}
          >
            Cetak Nota Bluetooth
          </Button>
          <Button fullWidth variant="contained" onClick={() => setReceiptDialog(false)}>
            Selesai
          </Button>
        </DialogActions>
      </Dialog>

      <TenantAdminBottomNav />
    </Box>
  );
}
