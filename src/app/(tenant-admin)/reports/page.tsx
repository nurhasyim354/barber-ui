'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Avatar, Divider, Chip, Button, TextField,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import SearchIcon from '@mui/icons-material/Search';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface BarberReport {
  barberId: string;
  barberName: string;
  photoUrl?: string | null;
  totalRevenue: number;
  totalTransactions: number;
  completedBookings: number;
}

interface ReportSummary {
  period: { from: string; to: string };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    cashTotal: number;
    qrisTotal: number;
    completedBookings: number;
  };
  byBarber: BarberReport[];
}

function toLocalDateStr(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReportsPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const today = toLocalDateStr(new Date());
  const firstOfMonth = toLocalDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
    loadReport(firstOfMonth, today);
  }, [user, isLoading]);

  const loadReport = useCallback(async (from: string, to: string) => {
    if (!from || !to) { toast.error('Pilih rentang tanggal'); return; }
    if (from > to) { toast.error('Tanggal awal tidak boleh setelah tanggal akhir'); return; }
    setLoading(true);
    try {
      const res = await api.get(`/revenue/barbers?from=${from}&to=${to}`);
      setReport(res.data);
    } catch {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => loadReport(fromDate, toDate);

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const medal = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return null;
  };

  const sorted = report?.byBarber
    ? [...report.byBarber].sort((a, b) => b.totalRevenue - a.totalRevenue)
    : [];

  const grandTotal = report?.summary.totalRevenue ?? 0;

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title="Laporan per Barber" back />

      <PageContainer>

        {/* Date Range Picker */}
        <Card className="mb-4">
          <CardContent className="pb-3">
            <Typography variant="subtitle2" fontWeight={500} className="mb-3">
              Rentang Tanggal
            </Typography>
            <Box
              sx={{
                mt: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                alignItems: { xs: 'stretch', sm: 'flex-end' },
              }}
            >
              <TextField
                label="Dari"
                type="date"
                size="small"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Sampai"
                type="date"
                size="small"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Button
                variant="contained"
                size="medium"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
                sx={{ minWidth: 90, height: 40 }}
              >
                Cari
              </Button>
            </Box>
          </CardContent>
        </Card>

        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : !report ? null : sorted.length === 0 ? (
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
            <Card className="mb-4 bg-gradient-to-r from-orange-500 to-orange-400">
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Total Pendapatan
                </Typography>
                <Typography variant="h5" fontWeight={400}>
                  {fmt(report.summary.totalRevenue)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
                  {report.summary.completedBookings} booking selesai · {report.summary.totalTransactions} transaksi
                </Typography>


                <Box className="flex gap-4">
                  <Box className="flex items-center gap-1">
                    <PaymentsIcon sx={{ fontSize: 18, opacity: 0.85 }} />
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.75 }}>Tunai</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{  }}>
                        {fmt(report.summary.cashTotal)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box className="flex items-center gap-1">
                    <QrCodeIcon sx={{ fontSize: 18, opacity: 0.85 }} />
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.75 }}>QRIS</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ }}>
                        {fmt(report.summary.qrisTotal)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Per-Barber Cards */}
            <Typography variant="h6" fontWeight={500} className="mb-3 flex items-center gap-2">
              <EmojiEventsIcon color="warning" />
              Peringkat Barber
            </Typography>

            <Box className="flex flex-col gap-3">
              {sorted.map((b, i) => {
                const revenueShare =
                  grandTotal > 0 ? Math.round((b.totalRevenue / grandTotal) * 100) : 0;

                return (
                  <Card key={b.barberId || i} className={i === 0 ? 'border-2 border-yellow-400' : ''}>
                    <CardContent>
                      <Box className="flex items-center gap-3">
                        <Box className="relative">
                          <Avatar
                            src={b.photoUrl ?? undefined}
                            sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22, fontWeight: 700 }}
                          >
                            {!b.photoUrl && b.barberName.charAt(0).toUpperCase()}
                          </Avatar>
                          {medal(i) && (
                            <Box className="absolute -top-1 -right-1 text-base leading-none" sx={{ fontSize: 18 }}>
                              {medal(i)}
                            </Box>
                          )}
                        </Box>

                        <Box className="flex-1 min-w-0">
                          <Box className="flex items-center gap-1 flex-wrap">
                            <Typography fontWeight={500}>{b.barberName}</Typography>
                            {i === 0 && <Chip label="Terbaik" size="small" color="warning" />}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {b.completedBookings} booking selesai
                          </Typography>
                        </Box>

                        <Box className="text-right shrink-0">
                          <Typography fontWeight={600} color="primary">
                            {fmt(b.totalRevenue)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {b.totalTransactions} transaksi
                          </Typography>
                          <Chip label={`${revenueShare}%`} size="small" color="default" variant="outlined" />
                        </Box>
                      </Box>

                      {/* Revenue bar */}
                      <Box className="mt-3 h-2 rounded-full bg-orange-100 overflow-hidden">
                        <Box
                          className="h-2 rounded-full bg-orange-500"
                          sx={{ width: `${revenueShare}%`, transition: 'width 0.6s ease' }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>

           

            {/* Summary table */}
            <Card sx={{ mt: 2 }}>
              <CardContent >
                <Typography variant="subtitle1" fontWeight={500} className="mb-3">
                  <TrendingUpIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Ringkasan
                </Typography>
                {sorted.map((b) => (
                  <Box key={b.barberId || b.barberName} className="flex justify-between items-center py-2 border-b last:border-0">
                    <Box className="flex items-center gap-2">
                      <Avatar src={b.photoUrl ?? undefined} sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 12 }}>
                        {!b.photoUrl && b.barberName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{b.barberName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {b.completedBookings} selesai
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="text-right">
                      <Typography variant="body2" fontWeight={500} color="primary">
                        {fmt(b.totalRevenue)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b.totalTransactions}x transaksi
                      </Typography>
                    </Box>
                  </Box>
                ))}
                <Divider className="my-2" />
                <Box className="flex justify-between items-center">
                  <Typography fontWeight={500}>Grand Total</Typography>
                  <Typography fontWeight={600} color="primary" variant="h6">
                    {fmt(grandTotal)}
                  </Typography>
                </Box>
                <Box className="flex justify-between mt-1">
                  <Typography variant="body2" color="text.secondary">Tunai / QRIS</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {fmt(report.summary.cashTotal)} / {fmt(report.summary.qrisTotal)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </>
        )}
      </PageContainer>

      <TenantAdminBottomNav />
    </AppPageShell>
  );
}
