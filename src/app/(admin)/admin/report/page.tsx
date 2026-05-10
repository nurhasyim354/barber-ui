'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  TextField, Button, Chip, Avatar, Divider, Grid, Alert,
} from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ContentCutIcon from '@mui/icons-material/EditCalendar';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';

interface TenantReportItem {
  tenantId: string;
  tenantName: string;
  isActive: boolean;
  totalRevenue: number;
  totalTransactions: number;
  cashRevenue: number;
  qrisRevenue: number;
  totalServices: number;
  totalStaff: number;
  totalCustomers: number;
}

interface AdminReport {
  period: { from: string; to: string };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    totalTenants: number;
    activeTenants: number;
  };
  tenants: TenantReportItem[];
}

interface ReferralReportRow {
  referralName: string | null;
  referralPhone: string | null;
  count: number;
  outlets: { name: string; phone: string; pendingAdminName: string | null; createdAt: string }[];
}

interface ReferralReport {
  month: string;
  totalRegistrations: number;
  byReferral: ReferralReportRow[];
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toIsoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function AdminReportPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const today = toIsoDate(new Date());
  const firstOfMonth = toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(false);

  const [refMonth, setRefMonth] = useState(currentMonthStr());
  const [refReport, setRefReport] = useState<ReferralReport | null>(null);
  const [refLoading, setRefLoading] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  const loadReferralReport = useCallback(async (month: string) => {
    setRefLoading(true);
    try {
      const res = await api.get(`/admin/tenant-registrations/referral-report?month=${encodeURIComponent(month)}`);
      setRefReport(res.data as ReferralReport);
    } catch {
      toast.error('Gagal memuat laporan referral');
      setRefReport(null);
    } finally {
      setRefLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin') { router.replace(user.delegatedFromSuperAdmin ? '/dashboard' : '/login'); return; }
    loadReport(from, to);
    const m = currentMonthStr();
    setRefMonth(m);
    void loadReferralReport(m);
  }, [user, isLoading]);

  const loadReport = useCallback(async (f: string, t: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/report?from=${f}&to=${t}`);
      setReport(res.data);
    } catch {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilter = () => {
    if (!from || !to) { toast.error('Pilih rentang tanggal'); return; }
    if (from > to) { toast.error('Tanggal awal tidak boleh lebih dari tanggal akhir'); return; }
    loadReport(from, to);
  };

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setFrom(toIsoDate(start));
    setTo(toIsoDate(end));
    loadReport(toIsoDate(start), toIsoDate(end));
  };

  const SummaryCard = ({
    icon, label, value, sub, color = 'primary.main',
  }: {
    icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
  }) => (
    <Card sx={{ flex: 1 }}>
      <CardContent sx={{ p: 2 }}>
        <Box className="flex items-center gap-2 mb-1">
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
        </Box>
        <Typography variant="h6" fontWeight={600} sx={{ color, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.disabled">{sub}</Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AppPageShell variant="reportFooter">
      <PageHeader title="Laporan Semua Tenant" back />

      <PageContainer maxWidth="md">
        {/* Filter */}
        <Card className="mb-4">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={500} mb={2}>
              Filter Periode
            </Typography>
            <Box className="flex gap-2 flex-wrap mb-3">
              {[
                { label: 'Hari Ini', days: 1 },
                { label: '7 Hari', days: 7 },
                { label: '30 Hari', days: 30 },
              ].map((p) => (
                <Button
                  key={p.days}
                  size="small"
                  variant="outlined"
                  onClick={() => setPreset(p.days)}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const s = toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                  setFrom(s); setTo(today); loadReport(s, today);
                }}
              >
                Bulan Ini
              </Button>
            </Box>
            <Box className="flex gap-3 flex-wrap items-end">
              <TextField
                label="Dari"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />
              <TextField
                label="Sampai"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />
              <Button variant="contained" onClick={handleFilter} disabled={loading}>
                Tampilkan
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent>
            <Box className="flex items-center gap-2 mb-2">
              <PersonPinIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Registrasi tenant per referral (per bulan)
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Menghitung dokumen tenant yang dibuat di bulan kalender yang dipilih (termasuk menunggu persetujuan dan
              yang sudah aktif), dikelompokkan menurut nama &amp; HP referral di form pendaftaran.
            </Typography>
            <Box className="flex flex-wrap gap-2 items-end mb-2">
              <TextField
                label="Bulan"
                type="month"
                size="small"
                value={refMonth}
                onChange={(e) => setRefMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" size="small" onClick={() => void loadReferralReport(refMonth)} disabled={refLoading}>
                Muat laporan
              </Button>
            </Box>
            {refLoading ? (
              <Box className="flex justify-center py-4">
                <CircularProgress size={28} />
              </Box>
            ) : refReport ? (
              <>
                <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                  Total pendaftaran di bulan ini: <strong>{refReport.totalRegistrations}</strong>
                </Alert>
                {refReport.byReferral.length === 0 ? (
                  <Typography color="text.secondary">Tidak ada pendaftaran di bulan ini.</Typography>
                ) : (
                  <Box className="flex flex-col gap-2">
                    {refReport.byReferral.map((r, idx) => (
                      <Card key={idx} variant="outlined">
                        <CardContent className="py-3">
                          <Box className="flex justify-between items-start gap-2 mb-1">
                            <Typography fontWeight={600}>
                              {r.referralName || r.referralPhone
                                ? [r.referralName || '—', r.referralPhone || '—'].filter(Boolean).join(' · ')
                                : 'Tanpa referral'}
                            </Typography>
                            <Chip label={`${r.count} outlet`} size="small" color="primary" variant="outlined" />
                          </Box>
                          <Typography variant="caption" color="text.secondary" component="div">
                            {r.outlets.map((o) => o.name).join(', ')}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : report ? (
          <>
            {/* Period label */}
            <Typography variant="body2" color="text.secondary" mb={2}>
              Periode: <strong>{new Date(report.period.from).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              {' '}—{' '}
              <strong>{new Date(report.period.to).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </Typography>

            {/* Summary cards */}
            <Box className="flex gap-3 flex-wrap mb-4">
              <SummaryCard
                icon={<AttachMoneyIcon />}
                label="Total Pendapatan"
                value={formatRp(report.summary.totalRevenue)}
                color="success.main"
              />
              <SummaryCard
                icon={<ReceiptLongIcon />}
                label="Total Transaksi"
                value={String(report.summary.totalTransactions)}
                color="info.main"
              />
            </Box>
            <Box className="flex gap-3 flex-wrap mb-5">
              <SummaryCard
                icon={<StoreIcon />}
                label="Total Tenants"
                value={String(report.summary.totalTenants)}
                sub={`${report.summary.activeTenants} aktif`}
                color="primary.main"
              />
            </Box>

            <Divider className="mb-4" />

            {/* Per-tenant list */}
            <Typography variant="h6" fontWeight={500} mb={2}>
              Detail per Tenant
            </Typography>

            {report.tenants.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Typography color="text.secondary">Tidak ada data</Typography>
                </CardContent>
              </Card>
            ) : (
              <Box className="flex flex-col gap-3">
                {report.tenants.map((t) => (
                  <Card key={t.tenantId} className={t.isActive ? '' : 'opacity-60'}>
                    <CardContent>
                      {/* Header */}
                      <Box className="flex items-center gap-3 mb-3">
                        <Avatar sx={{ bgcolor: t.isActive ? 'primary.main' : 'grey.400', width: 44, height: 44 }}>
                          <StoreIcon />
                        </Avatar>
                        <Box className="flex-1">
                          <Box className="flex items-center gap-2">
                            <Typography fontWeight={500}>{t.tenantName}</Typography>
                            <Chip
                              label={t.isActive ? 'Aktif' : 'Nonaktif'}
                              color={t.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Box>
                        <Typography variant="h6" fontWeight={600} color="success.main">
                          {formatRp(t.totalRevenue)}
                        </Typography>
                      </Box>

                      <Divider sx={{ mb: 2 }} />

                      {/* Stats grid */}
                      <Grid container spacing={1.5}>
                        <Grid item xs={6} sm={4}>
                          <Box className="flex items-center gap-1">
                            <ReceiptLongIcon sx={{ fontSize: 16, color: 'info.main' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Transaksi
                              </Typography>
                              <Typography fontWeight={500}>{t.totalTransactions}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={4}>
                          <Box className="flex items-center gap-1">
                            <PaymentsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Tunai
                              </Typography>
                              <Typography fontWeight={500}>{formatRp(t.cashRevenue)}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={4}>
                          <Box className="flex items-center gap-1">
                            <QrCodeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                QRIS
                              </Typography>
                              <Typography fontWeight={500}>{formatRp(t.qrisRevenue)}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={4}>
                          <Box className="flex items-center gap-1">
                            <ContentCutIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Layanan
                              </Typography>
                              <Typography fontWeight={500}>{t.totalServices}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={4}>
                          <Box className="flex items-center gap-1">
                            <PeopleIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Customer
                              </Typography>
                              <Typography fontWeight={500}>{t.totalCustomers}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={4} sm={4}>
                          <Box className="flex items-center gap-1">
                            <ContentCutIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Staff
                              </Typography>
                              <Typography fontWeight={500}>{t.totalStaff}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </>
        ) : null}
      </PageContainer>
    </AppPageShell>
  );
}
