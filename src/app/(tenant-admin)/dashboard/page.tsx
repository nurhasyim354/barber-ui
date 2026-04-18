'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Grid, IconButton, Divider, Button,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface RevenueSummary {
  totalRevenue: number;
  totalTransactions: number;
  cashTotal: number;
  qrisTotal: number;
  completedBookings: number;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box className="flex items-center gap-3">
          <Box
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            sx={{ bgcolor: color }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h6" fontWeight={600}>{value}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const router = useRouter();
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'customer') { router.replace('/booking'); return; }
    if (user.role === 'super_admin') { router.replace('/admin/tenants'); return; }
    loadRevenue();
  }, [user, isLoading]);

  const loadRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/revenue/today');
      setSummary(res.data);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader
        title="Dashboard"
        right={
          <Box className="flex items-center">
            <IconButton color="inherit" onClick={() => router.push('/reports')}>
              <BarChartIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => router.push('/settings')}>
              <SettingsIcon />
            </IconButton>
            <IconButton color="inherit" onClick={loadRevenue}>
              <RefreshIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => { logout(); router.push('/login'); }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        }
      />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <PageContainer>
          <Card
            sx={{
              mb: 3,
              background: (t) =>
                `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
              boxShadow: (t) => `0 8px 32px ${t.palette.primary.main}44`,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Pendapatan Hari Ini</Typography>
              <Typography variant="h4" fontWeight={600} sx={{ color: 'white', my: 0.5 }}>
                {fmt(summary?.totalRevenue || 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>{today}</Typography>
            </CardContent>
          </Card>

          <Grid container spacing={2} className="mb-4">
            <Grid item xs={12} sm={6}>
              <StatCard
                title="Transaksi"
                value={String(summary?.totalTransactions || 0)}
                icon={<ReceiptIcon sx={{ color: '#7c3aed' }} />}
                color="#ede9fe"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <StatCard
                title="Selesai"
                value={String(summary?.completedBookings || 0)}
                icon={<PeopleIcon sx={{ color: '#0891b2' }} />}
                color="#cffafe"
              />
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={500} className="mb-3">
                Rincian Pembayaran
              </Typography>
              <Divider className="mb-3" />
              <Box className="flex justify-between items-center mb-2">
                <Box className="flex items-center gap-2">
                  <PaymentsIcon color="action" fontSize="small" />
                  <Typography>Tunai</Typography>
                </Box>
                <Typography fontWeight={500}>{fmt(summary?.cashTotal || 0)}</Typography>
              </Box>
              <Box className="flex justify-between items-center">
                <Box className="flex items-center gap-2">
                  <QrCodeIcon color="action" fontSize="small" />
                  <Typography>QRIS</Typography>
                </Box>
                <Typography fontWeight={500}>{fmt(summary?.qrisTotal || 0)}</Typography>
              </Box>
              <Divider className="my-3" />
              <Box className="flex justify-between items-center">
                <Box className="flex items-center gap-2">
                  <AttachMoneyIcon color="primary" />
                  <Typography fontWeight={500}>Total</Typography>
                </Box>
                <Typography fontWeight={600} color="primary" variant="h6">
                  {fmt(summary?.totalRevenue || 0)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5,
              mt: 1,
            }}
          >
            <Button
              variant="contained"
              fullWidth
              startIcon={<QrCodeIcon />}
              onClick={() => router.push('/dashboard/booking-qr')}
              sx={{ py: 1.5, gridColumn: { xs: 'span 1', sm: 'span 2' } }}
            >
              QR Booking Pelanggan
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<BarChartIcon />}
              onClick={() => router.push('/reports')}
              sx={{ py: 1.5 }}
            >
              Laporan Barber
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<SettingsIcon />}
              onClick={() => router.push('/settings')}
              sx={{ py: 1.5 }}
            >
              Pengaturan
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<CreditCardIcon />}
              onClick={() => router.push('/subscription')}
              sx={{ py: 1.5, gridColumn: { xs: 'span 1', sm: 'span 2' } }}
              color="secondary"
            >
              Tagihan & Langganan
            </Button>
          </Box>
        </PageContainer>
      )}

      <TenantAdminBottomNav />
    </AppPageShell>
  );
}
