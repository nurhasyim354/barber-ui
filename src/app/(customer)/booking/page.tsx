'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Avatar, Divider, LinearProgress, Checkbox,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import StarIcon from '@mui/icons-material/Star';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
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

interface Barber {
  _id: string;
  name: string;
  photoUrl?: string;
  specialty?: string;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  waitingCount: number;
  estimatedWaitMinutes: number;
}

interface Booking {
  _id: string;
  serviceName: string;
  barberName?: string;
  queueNumber: number;
  status: string;
  date: string;
}

type Step = 'service' | 'barber' | 'confirm';

export default function BookingPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<Step>('service');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [barbersLoading, setBarbersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'customer') { router.replace('/dashboard'); return; }
    if (!user.tenantId) { toast.error('Akun belum terhubung ke barbershop'); return; }
    loadData();
  }, [user, isLoading]);

  const loadData = useCallback(async () => {
    setPageLoading(true);
    try {
      const [svcRes, histRes] = await Promise.all([
        api.get(`/tenants/${user!.tenantId}/services`),
        api.get('/bookings/history'),
      ]);
      setServices(svcRes.data);
      const activeBooking = histRes.data.find(
        (b: Booking) => b.status === 'waiting' || b.status === 'in_progress'
      );
      if (activeBooking) setBooking(activeBooking);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setPageLoading(false);
    }
  }, [user]);

  const loadBarbers = useCallback(async () => {
    setBarbersLoading(true);
    try {
      const res = await api.get(`/tenants/${user!.tenantId}/barbers`);
      setBarbers(res.data);
    } catch {
      toast.error('Gagal memuat daftar barber');
    } finally {
      setBarbersLoading(false);
    }
  }, [user]);

  const toggleService = (svc: Service) => {
    if (booking) return;
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s._id === svc._id);
      if (exists) return prev.filter((s) => s._id !== svc._id);
      return [...prev, svc];
    });
  };

  const handleGoToBarber = () => {
    if (selectedServices.length === 0) {
      toast.error('Pilih minimal satu layanan');
      return;
    }
    setSelectedBarber(null);
    setStep('barber');
    loadBarbers();
  };

  const handleSelectBarber = (b: Barber) => {
    setSelectedBarber(b);
    setDialogOpen(true);
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  const handleBook = async () => {
    if (selectedServices.length === 0) return;
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        tenantId: user!.tenantId,
        serviceIds: selectedServices.map((s) => s._id),
        barberId: selectedBarber?._id,
        notes,
      });
      toast.success('Booking berhasil! Silakan tunggu giliran Anda.');
      setDialogOpen(false);
      setNotes('');
      setStep('service');
      setSelectedServices([]);
      setSelectedBarber(null);
      loadData();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal booking'
      );
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

  const waitLabel = (minutes: number) => {
    if (minutes === 0) return 'Langsung dilayani';
    if (minutes < 60) return `~${minutes} menit`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `~${h} jam ${m} menit` : `~${h} jam`;
  };

  const waitColor = (minutes: number) => {
    if (minutes === 0) return 'success';
    if (minutes <= 15) return 'warning';
    return 'error';
  };

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        title="💈 Booking"
        back={step === 'barber'}
        right={
          step === 'barber' ? (
            <Button
              color="inherit"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => setStep('service')}
            >
              Ganti Layanan
            </Button>
          ) : undefined
        }
      />

      {pageLoading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <Box className="p-4 max-w-lg mx-auto">

          {/* Active booking banner */}
          {booking && (
            <Card className="mb-6 border-2 border-orange-300 bg-orange-50">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Booking Aktif</Typography>
                <Typography variant="h5" fontWeight={800} color="primary">
                  Antrian #{booking.queueNumber}
                </Typography>
                <Typography variant="body1" className="mt-1">{booking.serviceName}</Typography>
                {booking.barberName && (
                  <Typography variant="body2" color="text.secondary">
                    Barber: {booking.barberName}
                  </Typography>
                )}
                <Chip
                  label={statusLabel(booking.status)}
                  color={statusColor(booking.status) as 'warning' | 'info' | 'success' | 'default'}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          )}

          {/* Step 1: Select Services (multi) */}
          {step === 'service' && (
            <>
              <Box className="flex justify-between items-center mb-4">
                <Typography variant="h6" fontWeight={700}>
                  Pilih Layanan
                </Typography>
                {selectedServices.length > 0 && (
                  <Chip
                    icon={<ShoppingCartIcon />}
                    label={`${selectedServices.length} dipilih`}
                    color="primary"
                    size="small"
                  />
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
                      <Card
                        key={svc._id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-2"
                        sx={{
                          borderColor: selected ? 'primary.main' : 'transparent',
                          opacity: booking ? 0.6 : 1,
                        }}
                        onClick={() => toggleService(svc)}
                      >
                        <CardContent className="flex items-center gap-3 py-4">
                          <Checkbox
                            checked={selected}
                            color="primary"
                            sx={{ p: 0 }}
                            disabled={!!booking}
                            onChange={() => toggleService(svc)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar sx={{ bgcolor: selected ? 'primary.main' : 'primary.light', width: 44, height: 44 }}>
                            <ContentCutIcon color={selected ? 'inherit' : 'primary'} sx={{ color: selected ? 'white' : undefined }} />
                          </Avatar>
                          <Box className="flex-1">
                            <Typography fontWeight={700}>{svc.name}</Typography>
                            {svc.description && (
                              <Typography variant="body2" color="text.secondary">{svc.description}</Typography>
                            )}
                            <Chip
                              icon={<AccessTimeIcon />}
                              label={`${svc.durationMinutes} menit`}
                              size="small"
                              variant="outlined"
                              className="mt-1"
                            />
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
                <Box className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
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
                  <Button
                    variant="contained"
                    fullWidth
                    className="mt-3"
                    onClick={handleGoToBarber}
                  >
                    Pilih Barber
                  </Button>
                </Box>
              )}

              {booking && (
                <Typography variant="body2" color="text.secondary" className="text-center mt-4">
                  Anda sudah memiliki booking aktif
                </Typography>
              )}
            </>
          )}

          {/* Step 2: Select Barber */}
          {step === 'barber' && selectedServices.length > 0 && (
            <>
              {/* Selected services summary */}
              <Card className="mb-4 bg-orange-50 border border-orange-200">
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
                    <Typography fontWeight={800} color="primary">
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Typography variant="h6" fontWeight={700} className="mb-4">
                Pilih Barber
              </Typography>

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
                    <Typography color="text.secondary" className="mt-2">
                      Belum ada barber tersedia
                    </Typography>
                    <Button
                      variant="outlined"
                      className="mt-3"
                      onClick={() => {
                        setSelectedBarber(null);
                        setDialogOpen(true);
                      }}
                    >
                      Booking Tanpa Pilih Barber
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Box className="flex flex-col gap-3">
                  {barbers.filter(b => b.isActive).map((b) => (
                    <Card
                      key={b._id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-2"
                      sx={{ borderColor: selectedBarber?._id === b._id ? 'primary.main' : 'transparent' }}
                      onClick={() => handleSelectBarber(b)}
                    >
                      <CardContent>
                        <Box className="flex items-center gap-3">
                          <Avatar
                            src={b.photoUrl}
                            sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontSize: 24, fontWeight: 700 }}
                          >
                            {!b.photoUrl && b.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box className="flex-1">
                            <Typography fontWeight={700} variant="body1">{b.name}</Typography>
                            {b.specialty && (
                              <Typography variant="body2" color="text.secondary">{b.specialty}</Typography>
                            )}
                            <Box className="flex items-center gap-1 mt-0.5">
                              <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                              <Typography variant="body2" fontWeight={600}>
                                {b.rating > 0 ? b.rating.toFixed(1) : 'Baru'}
                              </Typography>
                              {b.reviewCount > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  ({b.reviewCount} ulasan)
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Box className="text-right">
                            <Chip
                              icon={<HourglassTopIcon />}
                              label={waitLabel(b.estimatedWaitMinutes)}
                              color={waitColor(b.estimatedWaitMinutes) as 'success' | 'warning' | 'error'}
                              size="small"
                            />
                            {b.waitingCount > 0 && (
                              <Typography variant="caption" color="text.secondary" className="block mt-1">
                                {b.waitingCount} orang antri
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}

                  <Divider className="my-2" />
                  <Button
                    variant="text"
                    color="inherit"
                    onClick={() => {
                      setSelectedBarber(null);
                      setDialogOpen(true);
                    }}
                  >
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
          <Box className="bg-gray-50 rounded-xl p-3 mb-4">
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
              <Typography fontWeight={800} color="primary" variant="body1">
                Rp {totalPrice.toLocaleString('id-ID')}
              </Typography>
            </Box>
            <Box className="flex justify-between mb-1">
              <Typography variant="body2" color="text.secondary">Durasi</Typography>
              <Typography fontWeight={600}>~{totalDuration} menit</Typography>
            </Box>
            <Box className="flex justify-between">
              <Typography variant="body2" color="text.secondary">Barber</Typography>
              <Typography fontWeight={700}>
                {selectedBarber?.name || 'Siapapun tersedia'}
              </Typography>
            </Box>
            {selectedBarber && selectedBarber.estimatedWaitMinutes > 0 && (
              <Box className="flex justify-between mt-1">
                <Typography variant="body2" color="text.secondary">Est. tunggu</Typography>
                <Chip
                  label={waitLabel(selectedBarber.estimatedWaitMinutes)}
                  size="small"
                  color={waitColor(selectedBarber.estimatedWaitMinutes) as 'success' | 'warning' | 'error'}
                />
              </Box>
            )}
          </Box>
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
        <DialogActions className="p-4 gap-2">
          <Button onClick={() => setDialogOpen(false)} variant="outlined" fullWidth>
            Batal
          </Button>
          <Button
            onClick={handleBook}
            variant="contained"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? undefined : <CheckCircleIcon />}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Booking!'}
          </Button>
        </DialogActions>
      </Dialog>

      <CustomerBottomNav />
    </Box>
  );
}
