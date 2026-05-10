'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Avatar, Divider, Chip, Button, TextField, Tab, Tabs,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import SearchIcon from '@mui/icons-material/Search';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import GroupsIcon from '@mui/icons-material/Groups';
import DownloadIcon from '@mui/icons-material/Download';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { exportWorkbook } from '@/lib/excelUtils';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

/* ─── Tipe ─────────────────────────────────────────────────────── */
interface StaffRevenueRow {
  staffId: string;
  staffName: string;
  photoUrl?: string | null;
  totalRevenue: number;
  totalTransactions: number;
  completedBookings: number;
}

interface ServiceRevenueRow {
  serviceId: string;
  serviceName: string;
  unit?: string | null;
  totalQty: number;
  totalRevenue: number;
  totalBookings: number;
}

interface RevenueSummary {
  totalRevenue: number;
  totalTransactions: number;
  cashTotal: number;
  qrisTotal: number;
  completedBookings: number;
}

interface StaffRevenueReport {
  period: { from: string; to: string };
  summary: RevenueSummary;
  byStaff: StaffRevenueRow[];
}

interface ServiceRevenueReport {
  period: { from: string; to: string };
  summary: RevenueSummary;
  byService: ServiceRevenueRow[];
}

/* ─── Util ──────────────────────────────────────────────────────── */
function toLocalDateStr(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const medal = (i: number) => {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return null;
};

/* ─── Komponen Ringkasan Umum ──────────────────────────────────── */
function SummaryCard({ summary }: { summary: RevenueSummary }) {
  return (
    <Card sx={{ mb: 2, overflow: 'hidden' }}>
      <CardContent
        sx={(theme) => ({
          py: 2.5,
          background: `linear-gradient(118deg, ${alpha(theme.palette.primary.dark, 0.96)} 0%, ${theme.palette.primary.main} 52%, ${alpha(theme.palette.primary.light, 0.58)} 100%)`,
          color: theme.palette.primary.contrastText,
          boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.42)}`,
        })}
      >
        <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Pendapatan</Typography>
        <Typography variant="h5" fontWeight={600} sx={{ textShadow: '0 1px 2px rgba(0,0,0,0.12)' }}>
          {fmt(summary.totalRevenue)}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.88, mt: 0.5 }}>
          {summary.completedBookings} booking selesai · {summary.totalTransactions} transaksi
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, mt: 1.75, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentsIcon sx={{ fontSize: 18, opacity: 0.9 }} />
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.78 }}>Tunai</Typography>
              <Typography variant="body2" fontWeight={600}>{fmt(summary.cashTotal)}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeIcon sx={{ fontSize: 18, opacity: 0.9 }} />
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.78 }}>QRIS</Typography>
              <Typography variant="body2" fontWeight={600}>{fmt(summary.qrisTotal)}</Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ─── Tab Per Staff ─────────────────────────────────────────────── */
function StaffTab({ report }: { report: StaffRevenueReport }) {
  const sorted = [...report.byStaff].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const grandTotal = report.summary.totalRevenue;

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <GroupsIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography color="text.secondary" mt={1}>Belum ada data untuk periode ini</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <SummaryCard summary={report.summary} />

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }} color="text.primary">
        <EmojiEventsIcon sx={{ color: 'warning.main' }} />
        Peringkat Staff
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sorted.map((b, i) => {
          const share = grandTotal > 0 ? Math.round((b.totalRevenue / grandTotal) * 100) : 0;
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={b.photoUrl ?? undefined}
                      sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22, fontWeight: 700 }}
                    >
                      {!b.photoUrl && b.staffName.charAt(0).toUpperCase()}
                    </Avatar>
                    {medal(i) && (
                      <Box sx={{ position: 'absolute', top: -4, right: -4, fontSize: 18, lineHeight: 1 }}>
                        {medal(i)}
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography fontWeight={500}>{b.staffName}</Typography>
                      {i === 0 && <Chip label="Terbaik" size="small" color="warning" />}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {b.completedBookings} booking selesai
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography fontWeight={600} color="primary">{fmt(b.totalRevenue)}</Typography>
                    <Typography variant="body2" color="text.secondary">{b.totalTransactions} transaksi</Typography>
                    <Chip label={`${share}%`} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
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
                        width: `${share}%`,
                        minWidth: share > 0 ? '4%' : 0,
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

      {/* Tabel ringkasan */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon color="primary" />
            Ringkasan
          </Typography>
          {sorted.map((b) => (
            <Box key={b.staffId || b.staffName} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar src={b.photoUrl ?? undefined} sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 12 }}>
                  {!b.photoUrl && b.staffName.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{b.staffName}</Typography>
                  <Typography variant="caption" color="text.secondary">{b.completedBookings} selesai</Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={500} color="primary">{fmt(b.totalRevenue)}</Typography>
                <Typography variant="caption" color="text.secondary">{b.totalTransactions}x transaksi</Typography>
              </Box>
            </Box>
          ))}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={500}>Grand Total</Typography>
            <Typography fontWeight={600} color="primary" variant="h6">{fmt(grandTotal)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Tunai / QRIS</Typography>
            <Typography variant="body2" fontWeight={600}>
              {fmt(report.summary.cashTotal)} / {fmt(report.summary.qrisTotal)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </>
  );
}

/* ─── Tab Per Layanan ──────────────────────────────────────────── */
function ServiceTab({ report }: { report: ServiceRevenueReport }) {
  const rows = report.byService;
  const grandTotal = report.summary.totalRevenue;

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <ContentCutIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography color="text.secondary" mt={1}>Belum ada data untuk periode ini</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <SummaryCard summary={report.summary} />

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }} color="text.primary">
        <LocalMallIcon sx={{ color: 'secondary.main' }} />
        Laporan Per Layanan
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((svc, i) => {
          const share = grandTotal > 0 ? Math.round((svc.totalRevenue / grandTotal) * 100) : 0;
          const isTop = i === 0;

          const qtyLabel =
            svc.unit
              ? `${svc.totalQty % 1 === 0 ? svc.totalQty : svc.totalQty.toFixed(2)} ${svc.unit}`
              : `${svc.totalQty % 1 === 0 ? svc.totalQty : svc.totalQty.toFixed(2)}x`;

          return (
            <Card
              key={svc.serviceId || i}
              sx={(theme) =>
                isTop
                  ? {
                      border: '2px solid',
                      borderColor: 'secondary.main',
                      boxShadow: `0 4px 18px ${alpha(theme.palette.secondary.main, 0.2)}, inset 0 1px 0 ${alpha('#ffffff', 0.72)}`,
                    }
                  : {}
              }
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar
                    sx={(theme) => ({
                      width: 46,
                      height: 46,
                      bgcolor: isTop
                        ? alpha(theme.palette.secondary.main, 0.15)
                        : alpha(theme.palette.primary.main, 0.1),
                      color: isTop ? 'secondary.main' : 'primary.main',
                      fontSize: 20,
                      fontWeight: 700,
                    })}
                  >
                    {i + 1}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography fontWeight={600} noWrap sx={{ maxWidth: 180 }}>{svc.serviceName}</Typography>
                      {isTop && <Chip label="Terlaris" size="small" color="secondary" />}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary">
                        {svc.totalBookings} booking
                      </Typography>
                      <Typography variant="caption" color="text.secondary">·</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {qtyLabel} terjual
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography fontWeight={600} color="primary">{fmt(svc.totalRevenue)}</Typography>
                    <Chip label={`${share}%`} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Box
                    sx={(theme) => ({
                      height: 8,
                      borderRadius: 99,
                      overflow: 'hidden',
                      backgroundColor: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.22)}`,
                    })}
                  >
                    <Box
                      sx={(theme) => ({
                        height: '100%',
                        width: `${share}%`,
                        minWidth: share > 0 ? '4%' : 0,
                        borderRadius: 99,
                        transition: 'width 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
                        backgroundImage: `linear-gradient(90deg, ${theme.palette.secondary.light} 0%, ${theme.palette.secondary.main} 60%, ${theme.palette.secondary.dark} 100%)`,
                        boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.45)}`,
                      })}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Tabel ringkasan */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon color="primary" />
            Ringkasan Layanan
          </Typography>
          {rows.map((svc) => {
            const qtyLabel =
              svc.unit
                ? `${svc.totalQty % 1 === 0 ? svc.totalQty : svc.totalQty.toFixed(2)} ${svc.unit}`
                : `${svc.totalQty % 1 === 0 ? svc.totalQty : svc.totalQty.toFixed(2)}x`;
            return (
              <Box key={svc.serviceId || svc.serviceName} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{svc.serviceName}</Typography>
                  <Typography variant="caption" color="text.secondary">{qtyLabel} terjual · {svc.totalBookings} booking</Typography>
                </Box>
                <Typography variant="body2" fontWeight={500} color="primary">{fmt(svc.totalRevenue)}</Typography>
              </Box>
            );
          })}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={500}>Grand Total</Typography>
            <Typography fontWeight={600} color="primary" variant="h6">{fmt(grandTotal)}</Typography>
          </Box>
        </CardContent>
      </Card>
    </>
  );
}

/* ─── Halaman Utama ──────────────────────────────────────────────── */
export default function ReportsPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const today = toLocalDateStr(new Date());
  const firstOfMonth = toLocalDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [activeTab, setActiveTab] = useState(0);
  const [staffReport, setStaffReport] = useState<StaffRevenueReport | null>(null);
  const [serviceReport, setServiceReport] = useState<ServiceRevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
    void loadAll(firstOfMonth, today);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  const loadAll = useCallback(async (from: string, to: string) => {
    if (!from || !to) { toast.error('Pilih rentang tanggal'); return; }
    if (from > to) { toast.error('Tanggal awal tidak boleh setelah tanggal akhir'); return; }
    setLoading(true);
    try {
      const [staffRes, serviceRes] = await Promise.all([
        api.get(`/revenue/staff?from=${from}&to=${to}`),
        api.get(`/revenue/service?from=${from}&to=${to}`),
      ]);
      setStaffReport(staffRes.data as StaffRevenueReport);
      setServiceReport(serviceRes.data as ServiceRevenueReport);
    } catch {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => void loadAll(fromDate, toDate);

  const handleExport = () => {
    if (!staffReport && !serviceReport) { toast.error('Tidak ada data untuk diekspor'); return; }

    const sheets = [];

    if (staffReport?.byStaff?.length) {
      const sorted = [...staffReport.byStaff].sort((a, b) => b.totalRevenue - a.totalRevenue);
      sheets.push({
        name: 'Per Staff',
        rows: sorted.map((s, i) => ({
          'No': i + 1,
          'Nama Staff': s.staffName,
          'Booking Selesai': s.completedBookings,
          'Jumlah Transaksi': s.totalTransactions,
          'Total Pendapatan (Rp)': s.totalRevenue,
        })),
      });
      sheets.push({
        name: 'Ringkasan',
        rows: [
          { 'Label': 'Periode', 'Nilai': `${staffReport.period.from} – ${staffReport.period.to}` },
          { 'Label': 'Total Pendapatan (Rp)', 'Nilai': staffReport.summary.totalRevenue },
          { 'Label': 'Tunai (Rp)', 'Nilai': staffReport.summary.cashTotal },
          { 'Label': 'QRIS (Rp)', 'Nilai': staffReport.summary.qrisTotal },
          { 'Label': 'Booking Selesai', 'Nilai': staffReport.summary.completedBookings },
          { 'Label': 'Jumlah Transaksi', 'Nilai': staffReport.summary.totalTransactions },
        ],
      });
    }

    if (serviceReport?.byService?.length) {
      sheets.push({
        name: 'Per Layanan',
        rows: serviceReport.byService.map((s, i) => ({
          'No': i + 1,
          'Nama Layanan': s.serviceName,
          'Satuan': s.unit ?? '',
          'Total Terjual': s.totalQty,
          'Jumlah Booking': s.totalBookings,
          'Total Pendapatan (Rp)': s.totalRevenue,
        })),
      });
    }

    if (sheets.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }

    const label = staffReport ? `${staffReport.period.from}_${staffReport.period.to}` : 'laporan';
    exportWorkbook(sheets, `laporan_${label}`);
    toast.success('File Excel berhasil diunduh');
  };

  const hasData = activeTab === 0
    ? (staffReport?.byStaff?.length ?? 0) > 0
    : (serviceReport?.byService?.length ?? 0) > 0;

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title="Laporan" back />

      <PageContainer>
        {/* Filter tanggal */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: '12px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={500}>
                Rentang Tanggal
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                disabled={!staffReport && !serviceReport}
              >
                Export Excel
              </Button>
            </Box>
            <Box
              sx={{
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

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v: number) => setActiveTab(v)}
          variant="fullWidth"
          sx={{ mb: 2, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1 }}
        >
          <Tab
            icon={<GroupsIcon fontSize="small" />}
            iconPosition="start"
            label="Per Staff"
            sx={{ minHeight: 48, fontSize: 13 }}
          />
          <Tab
            icon={<ContentCutIcon fontSize="small" />}
            iconPosition="start"
            label="Per Layanan"
            sx={{ minHeight: 48, fontSize: 13 }}
          />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : !hasData && (staffReport !== null || serviceReport !== null) ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <ReceiptLongIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="text.secondary" mt={1}>
                Belum ada data untuk periode ini
              </Typography>
            </CardContent>
          </Card>
        ) : activeTab === 0 && staffReport ? (
          <StaffTab report={staffReport} />
        ) : activeTab === 1 && serviceReport ? (
          <ServiceTab report={serviceReport} />
        ) : null}
      </PageContainer>

      <TenantAdminBottomNav />
    </AppPageShell>
  );
}
