'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Chip, CircularProgress, Avatar, Pagination, Alert,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/EditCalendar';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { CustomerBottomNav } from '@/components/layout/BottomNav';
import { getTenantUiLabels } from '@/lib/tenantLabels';

interface Booking {
  _id: string;
  tenantId?: string;
  serviceName: string;
  servicePrice: number;
  queueNumber: number;
  status: string;
  date: string;
  notes?: string;
  staffName?: string | null;
  staffId?: string | null;
  /** ISO — dari API untuk booking menunggu hari ini yang sudah ditugaskan staff */
  estimatedServedAt?: string | null;
}

interface LastDoneVisit {
  _id: string;
  serviceName: string;
  servicePrice: number;
  queueNumber: number;
  staffName: string | null;
  date: string;
}

interface ServicePhotoDoc {
  _id: string;
  photos: string[];
  staffName?: string | null;
  createdAt: string;
}

interface TenantPublic {
  name: string;
  customerReturnReminderDays?: number;
  tenantType?: string;
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
  const [lastDone, setLastDone] = useState<LastDoneVisit | null>(null);
  const [lastPhotos, setLastPhotos] = useState<ServicePhotoDoc | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantPublic | null>(null);

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
      const rows: Booking[] = res.data.data;
      setHistory(rows);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);

      const tid = user?.tenantId ?? rows.find((b) => b.tenantId)?.tenantId ?? null;
      if (tid) {
        try {
          const [doneRes, photoRes, tRes] = await Promise.all([
            api.get(`/bookings/my-last-done?tenantId=${tid}`),
            api.get(`/service-photos/my-last?tenantId=${tid}`),
            api.get(`/tenants/${tid}`),
          ]);
          setLastDone(doneRes.data ?? null);
          setLastPhotos(photoRes.data ?? null);
          setTenantInfo({
            name: tRes.data.name,
            customerReturnReminderDays: tRes.data.customerReturnReminderDays,
            tenantType: tRes.data.tenantType,
          });
        } catch {
          setLastDone(null);
          setLastPhotos(null);
          setTenantInfo(null);
        }
      } else {
        setLastDone(null);
        setLastPhotos(null);
        setTenantInfo(null);
      }
    } catch {
      toast.error('Gagal memuat riwayat');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  const formatEstimatedServe = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const historyTitle = getTenantUiLabels(tenantInfo?.tenantType ?? user?.tenantType).historyPageTitle;

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title={`${historyTitle}${total > 0 ? ` (${total})` : ''}`} />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <PageContainer>
          {(lastDone || (lastPhotos && lastPhotos.photos.length > 0)) && (
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhotoLibraryIcon fontSize="small" color="primary" />
                  Terakhir di {tenantInfo?.name ?? 'outlet'}
                </Typography>
                {lastDone && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>{lastDone.serviceName}</strong>
                    {' · '}
                    {new Date(lastDone.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {lastDone.staffName ? ` · ${lastDone.staffName}` : ''}
                  </Typography>
                )}
                {lastPhotos && lastPhotos.photos.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {lastPhotos.photos.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt={`foto-${i + 1}`}
                        style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                      />
                    ))}
                  </Box>
                )}
                {tenantInfo && (tenantInfo.customerReturnReminderDays ?? 0) > 0 && (
                  <Alert severity="info" icon={<NotificationsActiveIcon />} sx={{ mt: 2 }}>
                    Pengingat WhatsApp ±{tenantInfo.customerReturnReminderDays} hari setelah kunjungan selesai dapat dikirim oleh outlet.
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

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
                  const showEta = b.status === 'waiting' && b.estimatedServedAt;
                  const waitingNoStaff = b.status === 'waiting' && !b.staffId;
                  return (
                    <Card key={b._id}>
                      <CardContent className="flex items-start gap-3">
                        <Avatar sx={{ bgcolor: b.status === 'done' ? 'success.light' : 'grey.200', mt: 0.5 }}>
                          <ContentCutIcon color={b.status === 'done' ? 'success' : 'action'} />
                        </Avatar>
                        <Box className="flex-1">
                          <Box className="flex items-center justify-between">
                            <Typography fontWeight={500}>{b.serviceName}</Typography>
                            <Chip label={cfg.label} color={cfg.color} size="small" />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(b.date)}
                          </Typography>
                          {b.staffName && (
                            <Typography variant="body2" color="text.secondary" className="mt-0.5">
                              Staff: {b.staffName}
                            </Typography>
                          )}
                          {showEta && (
                            <Box
                              className="mt-2 flex items-start gap-1 rounded-lg px-2 py-1.5"
                              sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}
                            >
                              <AccessTimeIcon sx={{ fontSize: 18, color: 'primary.main', mt: 0.15 }} />
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.3}>
                                  Perkiraan waktu dilayani
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="primary">
                                  {formatEstimatedServe(b.estimatedServedAt!)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                  Berdasarkan rata-rata durasi staff dan antrian saat ini
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          {waitingNoStaff && (
                            <Typography variant="caption" color="text.secondary" className="mt-1.5" display="block">
                              Estimasi akan tersedia setelah outlet menugaskan staff.
                            </Typography>
                          )}
                          {b.notes && (
                            <Typography variant="body2" className="mt-1 italic text-gray-500">
                              &quot;{b.notes}&quot;
                            </Typography>
                          )}
                        </Box>
                        <Typography fontWeight={500} color="primary" className="text-right">
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
        </PageContainer>
      )}

      <CustomerBottomNav tenantType={tenantInfo?.tenantType ?? user?.tenantType} />
    </AppPageShell>
  );
}
