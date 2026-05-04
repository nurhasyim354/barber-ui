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
import { bookingServicesLabel, bookingSubtotalOrLegacy, type UiBooking } from '@/lib/bookingDisplay';

type Booking = UiBooking & { tenantId?: string; estimatedServedAt?: string | null };

interface LastDoneVisit {
  _id: string;
  serviceName: string;
  servicePrice: number;
  services?: { serviceName: string; unitPrice: number; quantity: number; lineSubtotal?: number }[];
  totalSubtotal?: number;
  paidAmount?: number;
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
  address?: string;
  customerReturnReminderDays?: number;
  tenantType?: string;
}

const statusConfig: Record<string, { label: string; color: 'warning' | 'info' | 'secondary' | 'success' | 'error' | 'default' }> = {
  waiting: { label: 'Menunggu', color: 'warning' },
  in_progress: { label: 'Sedang dilayani', color: 'info' },
  waiting_for_payment: { label: 'Menunggu pembayaran', color: 'secondary' },
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
            address: tRes.data.address,
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

  const fmtRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const listedSubtotal = (x: Pick<UiBooking, 'totalSubtotal' | 'servicePrice'>) => bookingSubtotalOrLegacy(x);

  const showOriginalVsPaid = (listed: number, paidAmount?: number) =>
    paidAmount != null && paidAmount !== listed;

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title={`${historyTitle}${total > 0 ? ` (${total})` : ''}`} />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <PageContainer>
          {tenantInfo && (
            <Box sx={{ mb: 2.5, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} component="h2">
                {tenantInfo.name}
              </Typography>
              {tenantInfo.address && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                  {tenantInfo.address}
                </Typography>
              )}
            </Box>
          )}
          {(lastDone || (lastPhotos && lastPhotos.photos.length > 0)) && (
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhotoLibraryIcon fontSize="small" color="primary" />
                  Terakhir di {tenantInfo?.name ?? 'outlet'}
                </Typography>
                {lastDone && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>
                        {bookingServicesLabel({
                          serviceName: lastDone.serviceName,
                          services: lastDone.services,
                        })}
                      </strong>
                      {' · '}
                      {new Date(lastDone.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {lastDone.staffName ? ` · ${lastDone.staffName}` : ''}
                    </Typography>
                    {showOriginalVsPaid(listedSubtotal(lastDone), lastDone.paidAmount) ? (
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        <Box component="span" color="text.secondary">Harga tercatat: </Box>
                        <Box component="span" fontWeight={600}>{fmtRp(listedSubtotal(lastDone))}</Box>
                        {' · '}
                        <Box component="span" color="text.secondary">Dibayar: </Box>
                        <Box component="span" fontWeight={700} color="primary.main">
                          {fmtRp(lastDone.paidAmount!)}
                        </Box>
                      </Typography>
                    ) : (
                      <Typography variant="body2" fontWeight={600} color="primary" sx={{ mt: 0.5 }}>
                        {fmtRp(lastDone.paidAmount ?? listedSubtotal(lastDone))}
                      </Typography>
                    )}
                  </Box>
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
                            <Typography fontWeight={500}>{bookingServicesLabel(b)}</Typography>
                          </Box>
                          <Chip label={cfg.label} color={cfg.color} size="small" />
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
                        {b.status === 'done' && showOriginalVsPaid(listedSubtotal(b), b.paidAmount) ? (
                          <Box className="text-right" sx={{ minWidth: 0, maxWidth: 160, ml: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
                              Tercatat {fmtRp(listedSubtotal(b))}
                            </Typography>
                            <Typography fontWeight={700} color="primary" variant="body2" sx={{ mt: 0.25 }}>
                              Dibayar {fmtRp(b.paidAmount!)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography fontWeight={500} color="primary" className="text-right">
                            {fmtRp(b.paidAmount ?? listedSubtotal(b))}
                          </Typography>
                        )}
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
