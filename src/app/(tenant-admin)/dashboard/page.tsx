'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Grid, IconButton, Divider,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import RefreshIcon from '@mui/icons-material/Refresh';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
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
            <Typography variant="h6" fontWeight={800}>{value}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
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
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        title="Dashboard"
        right={
          <IconButton color="inherit" onClick={loadRevenue}>
            <RefreshIcon />
          </IconButton>
        }
      />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <Box className="p-4 max-w-lg mx-auto">
          <Card className="mb-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white">
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>Pendapatan Hari Ini</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: 'white' }}>
                {fmt(summary?.totalRevenue || 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>{today}</Typography>
            </CardContent>
          </Card>

          <Grid container spacing={2} className="mb-4">
            <Grid item xs={6}>
              <StatCard
                title="Transaksi"
                value={String(summary?.totalTransactions || 0)}
                icon={<ReceiptIcon sx={{ color: '#7c3aed' }} />}
                color="#ede9fe"
              />
            </Grid>
            <Grid item xs={6}>
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
              <Typography variant="subtitle1" fontWeight={700} className="mb-3">
                Rincian Pembayaran
              </Typography>
              <Divider className="mb-3" />
              <Box className="flex justify-between items-center mb-2">
                <Box className="flex items-center gap-2">
                  <PaymentsIcon color="action" fontSize="small" />
                  <Typography>Tunai</Typography>
                </Box>
                <Typography fontWeight={700}>{fmt(summary?.cashTotal || 0)}</Typography>
              </Box>
              <Box className="flex justify-between items-center">
                <Box className="flex items-center gap-2">
                  <QrCodeIcon color="action" fontSize="small" />
                  <Typography>QRIS</Typography>
                </Box>
                <Typography fontWeight={700}>{fmt(summary?.qrisTotal || 0)}</Typography>
              </Box>
              <Divider className="my-3" />
              <Box className="flex justify-between items-center">
                <Box className="flex items-center gap-2">
                  <AttachMoneyIcon color="primary" />
                  <Typography fontWeight={700}>Total</Typography>
                </Box>
                <Typography fontWeight={800} color="primary" variant="h6">
                  {fmt(summary?.totalRevenue || 0)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      <TenantAdminBottomNav />
    </Box>
  );
}
