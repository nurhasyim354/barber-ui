'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Avatar,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { CustomerBottomNav } from '@/components/layout/BottomNav';

interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
}

interface Booking {
  _id: string;
  serviceName: string;
  queueNumber: number;
  status: string;
  date: string;
}

export default function BookingPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Service | null>(null);
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'customer') { router.replace('/dashboard'); return; }
    if (!user.tenantId) { toast.error('Akun belum terhubung ke barbershop'); return; }
    loadData();
  }, [user, isLoading]);

  const loadData = async () => {
    setPageLoading(true);
    try {
      const [svcRes, histRes] = await Promise.all([
        api.get(`/tenants/${user!.tenantId}/services`),
        api.get('/bookings/history'),
      ]);
      setServices(svcRes.data);
      const todayBooking = histRes.data.find(
        (b: Booking) => b.status === 'waiting' || b.status === 'in_progress'
      );
      if (todayBooking) setBooking(todayBooking);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setPageLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        tenantId: user!.tenantId,
        serviceId: selected._id,
        notes,
      });
      toast.success('Booking berhasil! Silakan tunggu giliran Anda.');
      setDialogOpen(false);
      setNotes('');
      loadData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal booking');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'waiting') return 'warning';
    if (s === 'in_progress') return 'info';
    if (s === 'done') return 'success';
    return 'default';
  };

  const statusLabel = (s: string) => {
    if (s === 'waiting') return 'Menunggu';
    if (s === 'in_progress') return 'Sedang dilayani';
    if (s === 'done') return 'Selesai';
    return s;
  };

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader title="💈 Booking" />

      {pageLoading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <Box className="p-4 max-w-lg mx-auto">
          {booking && (
            <Card className="mb-6 border-2 border-orange-300 bg-orange-50">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Booking Aktif</Typography>
                <Typography variant="h5" fontWeight={800} color="primary">
                  Antrian #{booking.queueNumber}
                </Typography>
                <Typography variant="body1" className="mt-1">{booking.serviceName}</Typography>
                <Chip
                  label={statusLabel(booking.status)}
                  color={statusColor(booking.status) as 'warning' | 'info' | 'success' | 'default'}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          )}

          <Typography variant="h6" fontWeight={700} className="mb-4">
            Pilih Layanan
          </Typography>

          {services.length === 0 ? (
            <Typography color="text.secondary" className="text-center py-8">
              Belum ada layanan tersedia
            </Typography>
          ) : (
            <Box className="flex flex-col gap-3">
              {services.map((svc) => (
                <Card
                  key={svc._id}
                  className={`cursor-pointer transition-all ${selected?._id === svc._id ? 'border-2 border-orange-500' : ''}`}
                  onClick={() => setSelected(svc)}
                >
                  <CardContent className="flex items-center gap-3 py-4">
                    <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                      <ContentCutIcon color="primary" />
                    </Avatar>
                    <Box className="flex-1">
                      <Typography fontWeight={700}>{svc.name}</Typography>
                      {svc.description && (
                        <Typography variant="body2" color="text.secondary">{svc.description}</Typography>
                      )}
                      <Box className="flex items-center gap-2 mt-1">
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={`${svc.durationMinutes} menit`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Box className="text-right">
                      <Typography fontWeight={800} color="primary" variant="h6">
                        Rp {svc.price.toLocaleString('id-ID')}
                      </Typography>
                      {selected?._id === svc._id && (
                        <CheckCircleIcon color="primary" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {selected && !booking && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              className="mt-6"
              sx={{ mt: 3 }}
              onClick={() => setDialogOpen(true)}
            >
              Booking Sekarang — Rp {selected.price.toLocaleString('id-ID')}
            </Button>
          )}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700}>Konfirmasi Booking</DialogTitle>
        <DialogContent>
          <Typography variant="body1" className="mb-3">
            <strong>{selected?.name}</strong> — Rp {selected?.price.toLocaleString('id-ID')}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Catatan (opsional)"
            placeholder="Contoh: potong pendek bagian samping"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDialogOpen(false)} variant="outlined" fullWidth>
            Batal
          </Button>
          <Button
            onClick={handleBook}
            variant="contained"
            fullWidth
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Booking!'}
          </Button>
        </DialogActions>
      </Dialog>

      <CustomerBottomNav />
    </Box>
  );
}
