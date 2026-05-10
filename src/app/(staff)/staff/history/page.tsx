'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Chip, Pagination, Avatar, Divider,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/EditCalendar';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { StaffBottomNav } from '@/components/layout/BottomNav';
import { bookingServicesLabel, bookingSubtotalOrLegacy, type UiBooking } from '@/lib/bookingDisplay';

type BookingHistory = Pick<
  UiBooking,
  '_id' | 'customerName' | 'services' | 'summaryServiceLabel' | 'serviceName' | 'totalSubtotal' | 'servicePrice' | 'queueNumber' | 'status' | 'date' | 'notes' | 'staffName'
>;

const PAGE_SIZE = 20;

const statusColor: Record<string, 'success' | 'error' | 'warning' | 'info' | 'secondary'> = {
  done: 'success',
  cancelled: 'error',
  waiting: 'warning',
  in_progress: 'info',
  waiting_for_payment: 'secondary',
};

const statusLabel: Record<string, string> = {
  done: 'Selesai',
  cancelled: 'Dibatal',
  waiting: 'Menunggu',
  in_progress: 'Dilayani',
  waiting_for_payment: 'Menunggu bayar',
};

export default function StaffHistoryPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'staff' && user.role !== 'tenant_admin') {
      router.replace('/');
      return;
    }
    loadHistory(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  const loadHistory = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings/staff-history?page=${p}&limit=${PAGE_SIZE}`);
      setBookings(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);
    } catch {
      toast.error('Gagal memuat riwayat');
    } finally {
      setLoading(false);
    }
  }, []);

  const totalRevenue = bookings
    .filter((b) => b.status === 'done')
    .reduce((sum, b) => sum + bookingSubtotalOrLegacy(b), 0);

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title="Riwayat Layanan" />

      <PageContainer>
        {/* Summary */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <Card>
            <CardContent className="py-3 text-center">
              <Typography variant="h5" fontWeight={600} color="primary">
                {total}
              </Typography>
              <Typography variant="caption" color="text.secondary">Total Booking</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <Typography variant="h6" fontWeight={600} color="success.main">
                Rp {totalRevenue.toLocaleString('id-ID')}
              </Typography>
              <Typography variant="caption" color="text.secondary">Pendapatan Halaman Ini</Typography>
            </CardContent>
          </Card>
        </Box>

        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ContentCutIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="text.secondary" className="mt-2">
                Belum ada riwayat layanan
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <Box className="flex flex-col gap-3">
              {bookings.map((b) => (
                <Card key={b._id} className={b.status === 'cancelled' ? 'opacity-60' : ''}>
                  <CardContent>
                    <Box className="flex items-start gap-3">
                      <Avatar
                        sx={{
                          bgcolor: b.status === 'done' ? 'success.light' : 'grey.200',
                          width: 40, height: 40,
                        }}
                      >
                        {b.status === 'done'
                          ? <CheckCircleIcon color="success" fontSize="small" />
                          : b.status === 'cancelled'
                          ? <CancelIcon color="disabled" fontSize="small" />
                          : <PersonIcon color="action" fontSize="small" />
                        }
                      </Avatar>

                      <Box className="flex-1">
                        <Box className="flex items-center justify-between mb-0.5">
                          <Typography fontWeight={500}>{b.customerName}</Typography>
                          <Typography fontWeight={600} color="primary" variant="body2">
                            Rp {bookingSubtotalOrLegacy(b).toLocaleString('id-ID')}
                          </Typography>
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          {bookingServicesLabel(b)}
                        </Typography>

                        {b.notes && (
                          <Typography variant="caption" className="italic text-gray-400 block">
                            &quot;{b.notes}&quot;
                          </Typography>
                        )}

                        <Divider className="my-1.5" />

                        <Box className="flex items-center justify-between">
                          <Box className="flex items-center gap-2">
                            <Typography variant="caption" color="text.disabled">
                              #{b.queueNumber} ·{' '}
                              {new Date(b.date).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </Typography>
                          </Box>
                          <Chip
                            label={statusLabel[b.status] ?? b.status}
                            color={statusColor[b.status] ?? 'default'}
                            size="small"
                          />
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {totalPages > 1 && (
              <Box className="flex justify-center mt-4">
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, v) => loadHistory(v)}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </>
        )}
      </PageContainer>

      <StaffBottomNav />
    </AppPageShell>
  );
}
