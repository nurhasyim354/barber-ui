'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  TextField, Button, Chip, Avatar, Divider, Grid,
} from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';

interface TenantReportItem {
  tenantId: string;
  tenantName: string;
  isActive: boolean;
  totalRevenue: number;
  totalTransactions: number;
  cashRevenue: number;
  qrisRevenue: number;
  totalServices: number;
  totalBarbers: number;
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

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin') { router.replace('/login'); return; }
    loadReport(from, to);
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
        <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.disabled">{sub}</Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box className="min-h-screen bg-gray-50 pb-10">
      <PageHeader title="Laporan Semua Tenant" back />

      <Box className="p-4 max-w-3xl mx-auto">
        {/* Filter */}
        <Card className="mb-4">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} mb={2}>
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
                label="Total Barbershop"
                value={String(report.summary.totalTenants)}
                sub={`${report.summary.activeTenants} aktif`}
                color="primary.main"
              />
            </Box>

            <Divider className="mb-4" />

            {/* Per-tenant list */}
            <Typography variant="h6" fontWeight={700} mb={2}>
              Detail per Barbershop
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
                            <Typography fontWeight={700}>{t.tenantName}</Typography>
                            <Chip
                              label={t.isActive ? 'Aktif' : 'Nonaktif'}
                              color={t.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Box>
                        <Typography variant="h6" fontWeight={800} color="success.main">
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
                              <Typography fontWeight={700}>{t.totalTransactions}</Typography>
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
                              <Typography fontWeight={700}>{formatRp(t.cashRevenue)}</Typography>
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
                              <Typography fontWeight={700}>{formatRp(t.qrisRevenue)}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={4} sm={4}>
                          <Box className="flex items-center gap-1">
                            <ContentCutIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Layanan
                              </Typography>
                              <Typography fontWeight={700}>{t.totalServices}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={4} sm={4}>
                          <Box className="flex items-center gap-1">
                            <ContentCutIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Barber
                              </Typography>
                              <Typography fontWeight={700}>{t.totalBarbers}</Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={4} sm={4}>
                          <Box className="flex items-center gap-1">
                            <PeopleIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Customer
                              </Typography>
                              <Typography fontWeight={700}>{t.totalCustomers}</Typography>
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
      </Box>
    </Box>
  );
}
