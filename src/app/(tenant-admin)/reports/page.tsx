'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Avatar, Divider, Chip, Button, TextField,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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

interface StaffRevenueRow {
  staffId: string;
  staffName: string;
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
  byStaff: StaffRevenueRow[];
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
      const res = await api.get(`/revenue/staff?from=${from}&to=${to}`);
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

  const sorted = report?.byStaff
    ? [...report.byStaff].sort((a, b) => b.totalRevenue - a.totalRevenue)
    : [];

  const grandTotal = report?.summary.totalRevenue ?? 0;

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title="Laporan per Staff" back />

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
            <Card sx={{ mb: 2, overflow: 'hidden' }}>
              <CardContent
                sx={(theme) => ({
                  py: 2.5,
                  background: `linear-gradient(118deg, ${alpha(theme.palette.primary.dark, 0.96)} 0%, ${theme.palette.primary.main} 52%, ${alpha(theme.palette.primary.light, 0.58)} 100%)`,
                  color: theme.palette.primary.contrastText,
                  boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.42)}`,
                })}
              >
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Pendapatan
                </Typography>
                <Typography variant="h5" fontWeight={600} sx={{ textShadow: '0 1px 2px rgba(0,0,0,0.12)' }}>
                  {fmt(report.summary.totalRevenue)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.88, mt: 0.5 }}>
                  {report.summary.completedBookings} booking selesai · {report.summary.totalTransactions} transaksi
                </Typography>


                <Box sx={{ display: 'flex', gap: 3, mt: 1.75, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PaymentsIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.78 }}>Tunai</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {fmt(report.summary.cashTotal)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QrCodeIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.78 }}>QRIS</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {fmt(report.summary.qrisTotal)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Per-staff cards */}
            <Typography variant="h6" fontWeight={600} className="mb-3 flex items-center gap-2" color="text.primary">
              <EmojiEventsIcon sx={{ color: 'warning.main' }} />
              Peringkat Staff
            </Typography>

            <Box className="flex flex-col gap-3">
              {sorted.map((b, i) => {
                const revenueShare =
                  grandTotal > 0 ? Math.round((b.totalRevenue / grandTotal) * 100) : 0;

                return (
                  <Card
                    key={b.staffId || i}
                    sx={(theme) =>
                      i === 0
                        ? {
                            border: '2px solid',
                            borderColor: 'warning.main',
                            boxShadow: `0 4px 18px ${alpha(theme.palette.warning.main, 0.22)}, inset 0 1px 0 ${alpha('#ffffff', 0.72)}`,
                          }
                        : {}
                    }
                  >
                    <CardContent>
                      <Box className="flex items-center gap-3">
                        <Box className="relative">
                          <Avatar
                            src={b.photoUrl ?? undefined}
                            sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22, fontWeight: 700 }}
                          >
                            {!b.photoUrl && b.staffName.charAt(0).toUpperCase()}
                          </Avatar>
                          {medal(i) && (
                            <Box className="absolute -top-1 -right-1 text-base leading-none" sx={{ fontSize: 18 }}>
                              {medal(i)}
                            </Box>
                          )}
                        </Box>

                        <Box className="flex-1 min-w-0">
                          <Box className="flex items-center gap-1 flex-wrap">
                            <Typography fontWeight={500}>{b.staffName}</Typography>
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
                          <Chip
                            label={`${revenueShare}%`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Box
                          sx={(theme) => ({
                            height: 10,
                            borderRadius: 99,
                            overflow: 'hidden',
                            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                            boxShadow: `inset 0 2px 4px ${alpha('#000822', theme.palette.mode === 'dark' ? 0.18 : 0.06)}`,
                          })}
                        >
                          <Box
                            sx={(theme) => ({
                              height: '100%',
                              width: `${revenueShare}%`,
                              minWidth: revenueShare > 0 ? '4%' : 0,
                              borderRadius: 99,
                              transition: 'width 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
                              backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 42%, ${theme.palette.primary.dark} 100%)`,
                              boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.45)}, 0 0 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                            })}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                          Bagian dari total pendapatan periode ini
                        </Typography>
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
                  <Box key={b.staffId || b.staffName} className="flex justify-between items-center py-2 border-b last:border-0">
                    <Box className="flex items-center gap-2">
                      <Avatar src={b.photoUrl ?? undefined} sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 12 }}>
                        {!b.photoUrl && b.staffName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{b.staffName}</Typography>
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
