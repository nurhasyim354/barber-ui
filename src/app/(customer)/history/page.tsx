'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress, Avatar, Pagination,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { CustomerBottomNav } from '@/components/layout/BottomNav';

interface Booking {
  _id: string;
  serviceName: string;
  servicePrice: number;
  queueNumber: number;
  status: string;
  date: string;
  notes?: string;
}

const statusConfig: Record<string, { label: string; color: 'warning' | 'info' | 'success' | 'error' | 'default' }> = {
  waiting: { label: 'Menunggu', color: 'warning' },
  in_progress: { label: 'Sedang dilayani', color: 'info' },
  done: { label: 'Selesai', color: 'success' },
  cancelled: { label: 'Dibatalkan', color: 'error' },
};

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const [history, setHistory] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    loadHistory(1);
  }, [user, isLoading]);

  const loadHistory = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings/history?page=${p}&limit=${PAGE_SIZE}`);
      setHistory(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);
    } catch {
      toast.error('Gagal memuat riwayat');
    } finally {
      setLoading(false);
    }
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader title={`Riwayat Layanan${total > 0 ? ` (${total})` : ''}`} />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <Box className="p-4 max-w-lg mx-auto">
          {history.length === 0 ? (
            <Box className="text-center py-16">
              <ContentCutIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="text.secondary" className="mt-4">
                Belum ada riwayat layanan
              </Typography>
            </Box>
          ) : (
            <>
              <Box className="flex flex-col gap-3 mb-4">
                {history.map((b) => {
                  const cfg = statusConfig[b.status] || { label: b.status, color: 'default' as const };
                  return (
                    <Card key={b._id}>
                      <CardContent className="flex items-start gap-3">
                        <Avatar sx={{ bgcolor: b.status === 'done' ? 'success.light' : 'grey.200', mt: 0.5 }}>
                          <ContentCutIcon color={b.status === 'done' ? 'success' : 'action'} />
                        </Avatar>
                        <Box className="flex-1">
                          <Box className="flex items-center justify-between">
                            <Typography fontWeight={700}>{b.serviceName}</Typography>
                            <Chip label={cfg.label} color={cfg.color} size="small" />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(b.date)}
                          </Typography>
                          {b.notes && (
                            <Typography variant="body2" className="mt-1 italic text-gray-500">
                              &quot;{b.notes}&quot;
                            </Typography>
                          )}
                        </Box>
                        <Typography fontWeight={700} color="primary" className="text-right">
                          Rp {b.servicePrice.toLocaleString('id-ID')}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>

              {totalPages > 1 && (
                <Box className="flex justify-center mt-2">
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
        </Box>
      )}

      <CustomerBottomNav />
    </Box>
  );
}
