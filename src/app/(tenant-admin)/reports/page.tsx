'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Avatar, Divider, ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import StarIcon from '@mui/icons-material/Star';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface BarberReport {
  barberId: string;
  barberName: string;
  barberPhoto?: string;
  totalRevenue: number;
  totalTransactions: number;
  avgRating: number;
  reviewCount: number;
}

interface ReportSummary {
  period: string;
  barbers: BarberReport[];
  grandTotal: number;
  grandTransactions: number;
}

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hari Ini',
  week: 'Minggu Ini',
  month: 'Bulan Ini',
};

export default function ReportsPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
    loadReport(period);
  }, [user, isLoading]);

  const loadReport = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/barbers?period=${p}`);
      setReport(res.data);
    } catch {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePeriodChange = (_: React.MouseEvent, val: Period | null) => {
    if (!val) return;
    setPeriod(val);
    loadReport(val);
  };

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const medal = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return null;
  };

  const sorted = report?.barbers
    ? [...report.barbers].sort((a, b) => b.totalRevenue - a.totalRevenue)
    : [];

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader title="Laporan per Barber" back />

      <Box className="p-4 max-w-lg mx-auto">
        <Box className="flex justify-center mb-4">
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <ToggleButton key={p} value={p}>
                {PERIOD_LABELS[p]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : !report || sorted.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ReceiptLongIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="text.secondary" className="mt-2">
                Belum ada data untuk periode ini
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <Card className="mb-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white">
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Total Pendapatan — {PERIOD_LABELS[period]}
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: 'white' }}>
                  {fmt(report.grandTotal)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
                  {report.grandTransactions} transaksi dari {sorted.length} barber
                </Typography>
              </CardContent>
            </Card>

            {/* Per-Barber Cards */}
            <Typography variant="h6" fontWeight={700} className="mb-3 flex items-center gap-2">
              <EmojiEventsIcon color="warning" />
              Peringkat Barber
            </Typography>

            <Box className="flex flex-col gap-3">
              {sorted.map((b, i) => {
                const revenueShare =
                  report.grandTotal > 0
                    ? Math.round((b.totalRevenue / report.grandTotal) * 100)
                    : 0;

                return (
                  <Card key={b.barberId} className={i === 0 ? 'border-2 border-yellow-400' : ''}>
                    <CardContent>
                      <Box className="flex items-center gap-3">
                        <Box className="relative">
                          <Avatar
                            src={b.barberPhoto}
                            sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22, fontWeight: 700 }}
                          >
                            {!b.barberPhoto && b.barberName.charAt(0).toUpperCase()}
                          </Avatar>
                          {medal(i) && (
                            <Box
                              className="absolute -top-1 -right-1 text-base leading-none"
                              sx={{ fontSize: 18 }}
                            >
                              {medal(i)}
                            </Box>
                          )}
                        </Box>

                        <Box className="flex-1">
                          <Box className="flex items-center gap-1">
                            <Typography fontWeight={700}>{b.barberName}</Typography>
                            {i === 0 && <Chip label="Terbaik" size="small" color="warning" />}
                          </Box>
                          <Box className="flex items-center gap-1">
                            <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                            <Typography variant="body2">
                              {b.avgRating > 0 ? b.avgRating.toFixed(1) : '–'}
                              {b.reviewCount > 0 && ` (${b.reviewCount} ulasan)`}
                            </Typography>
                          </Box>
                        </Box>

                        <Box className="text-right">
                          <Typography fontWeight={800} color="primary">
                            {fmt(b.totalRevenue)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {b.totalTransactions} transaksi
                          </Typography>
                          <Chip
                            label={`${revenueShare}%`}
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        </Box>
                      </Box>

                      {/* Revenue bar */}
                      <Box className="mt-3">
                        <Box
                          className="h-2 rounded-full bg-orange-100"
                          sx={{ position: 'relative', overflow: 'hidden' }}
                        >
                          <Box
                            className="h-2 rounded-full bg-orange-500"
                            sx={{ width: `${revenueShare}%`, transition: 'width 0.6s ease' }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>

            <Divider className="my-4" />

            {/* Summary table */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} className="mb-3">
                  <TrendingUpIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Ringkasan
                </Typography>
                {sorted.map((b) => (
                  <Box key={b.barberId} className="flex justify-between items-center py-2 border-b last:border-0">
                    <Box className="flex items-center gap-2">
                      <Avatar src={b.barberPhoto} sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 12 }}>
                        {!b.barberPhoto && b.barberName.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{b.barberName}</Typography>
                    </Box>
                    <Box className="text-right">
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {fmt(b.totalRevenue)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b.totalTransactions}x
                      </Typography>
                    </Box>
                  </Box>
                ))}
                <Divider className="my-2" />
                <Box className="flex justify-between">
                  <Typography fontWeight={700}>Grand Total</Typography>
                  <Typography fontWeight={800} color="primary" variant="h6">
                    {fmt(report.grandTotal)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      <TenantAdminBottomNav />
    </Box>
  );
}
