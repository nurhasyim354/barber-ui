'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Pagination, IconButton, Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TuneIcon from '@mui/icons-material/Tune';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';

interface Billing {
  _id: string;
  tenantId: string;
  tenantName: string;
  month: string;
  planDisplayName: string;
  transactionCount: number;
  amount: number;
  status: 'free' | 'pending' | 'paid' | 'overdue';
  paymentRef?: string | null;
  paidAt?: string | null;
  adminNotes?: string | null;
}

const statusChip: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  free: { label: 'Gratis', color: 'default' },
  pending: { label: 'Belum Bayar', color: 'warning' },
  paid: { label: 'Lunas', color: 'success' },
  overdue: { label: 'Terlambat', color: 'error' },
};

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function formatRp(n: number) {
  return n === 0 ? 'Gratis' : 'Rp ' + n.toLocaleString('id-ID');
}

const PAGE_SIZE = 20;

export default function AdminSubscriptionsPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const router = useRouter();

  const [billings, setBillings] = useState<Billing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; billing: Billing | null }>({
    open: false, billing: null,
  });
  const [payRef, setPayRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; billingId: string | null }>({
    open: false, billingId: null,
  });

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin') { router.replace('/login'); return; }
    loadBillings(1, filterStatus, filterMonth);
  }, [user, isLoading]);

  const loadBillings = useCallback(async (p: number, status: string, month: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (status) params.set('status', status);
      if (month) params.set('month', month);
      const res = await api.get(`/admin/subscriptions?${params}`);
      setBillings(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);
    } catch {
      toast.error('Gagal memuat tagihan');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilter = () => loadBillings(1, filterStatus, filterMonth);

  const openConfirm = (b: Billing) => {
    setPayRef(b.paymentRef || '');
    setAdminNotes('');
    setConfirmDialog({ open: true, billing: b });
  };

  const handleMarkPaid = async () => {
    if (!confirmDialog.billing) return;
    setConfirming(true);
    try {
      await api.patch(`/admin/subscriptions/${confirmDialog.billing._id}/paid`, {
        paymentRef: payRef || undefined,
        adminNotes: adminNotes || undefined,
      });
      toast.success('Tagihan dikonfirmasi lunas');
      setConfirmDialog({ open: false, billing: null });
      loadBillings(page, filterStatus, filterMonth);
    } catch {
      toast.error('Gagal konfirmasi');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelDialog.billingId) return;
    try {
      await api.patch(`/admin/subscriptions/${cancelDialog.billingId}/cancel`);
      toast.success('Tagihan dibatalkan');
      setCancelDialog({ open: false, billingId: null });
      loadBillings(page, filterStatus, filterMonth);
    } catch {
      toast.error('Gagal membatalkan tagihan');
    }
  };

  const pendingCount = billings.filter((b) => b.status === 'pending' || b.status === 'overdue').length;

  return (
    <AppPageShell variant="adminFooter">
      <PageHeader
        title="Tagihan Langganan"
        back
        right={
          <Box className="flex items-center">
            <IconButton color="inherit" onClick={() => router.push('/admin/subscription-plans')} title="Konfigurasi Paket">
              <SettingsIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => router.push('/admin/report')}>
              <BarChartIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => { logout(); router.push('/login'); }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        }
      />

      <PageContainer maxWidth="md">
        {/* Alert for pending */}
        {pendingCount > 0 && !loading && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {pendingCount} tagihan menunggu konfirmasi pembayaran
          </Alert>
        )}

        {/* Filter */}
        <Card className="mb-4">
          <CardContent>
            <Box className="flex gap-3 flex-wrap items-end">
              <TextField
                select label="Status" value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                size="small" sx={{ minWidth: 140 }}
              >
                <MenuItem value="">Semua</MenuItem>
                <MenuItem value="pending">Belum Bayar</MenuItem>
                <MenuItem value="overdue">Terlambat</MenuItem>
                <MenuItem value="paid">Lunas</MenuItem>
                <MenuItem value="free">Gratis</MenuItem>
              </TextField>
              <TextField
                label="Bulan (YYYY-MM)" value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                size="small" placeholder="2026-04" sx={{ minWidth: 160 }}
              />
              <Button variant="contained" startIcon={<TuneIcon />} onClick={handleFilter} size="small">
                Filter
              </Button>
              <Button variant="text" size="small" onClick={() => {
                setFilterStatus(''); setFilterMonth('');
                loadBillings(1, '', '');
              }}>
                Reset
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          Total: {total} tagihan
        </Typography>

        {loading ? (
          <Box className="flex justify-center mt-8"><CircularProgress /></Box>
        ) : billings.length === 0 ? (
          <Card><CardContent className="text-center py-8">
            <Typography color="text.secondary">Tidak ada tagihan</Typography>
          </CardContent></Card>
        ) : (
          <>
            <Box className="flex flex-col gap-3 mb-4">
              {billings.map((b) => (
                <Card key={b._id} sx={{
                  borderLeft: 4,
                  borderLeftColor: b.status === 'paid' ? 'success.main'
                    : b.status === 'overdue' ? 'error.main'
                    : b.status === 'pending' ? 'warning.main' : 'grey.300',
                }}>
                  <CardContent>
                    <Box className="flex items-start justify-between mb-1">
                      <Box>
                        <Typography fontWeight={500}>{b.tenantName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatMonth(b.month)} · {b.planDisplayName} · {b.transactionCount} tx
                        </Typography>
                        {b.paymentRef && (
                          <Typography variant="caption" color="info.main">
                            Ref: {b.paymentRef}
                          </Typography>
                        )}
                        {b.adminNotes && (
                          <Typography variant="caption" color="text.disabled" display="block">
                            Catatan: {b.adminNotes}
                          </Typography>
                        )}
                      </Box>
                      <Box className="text-right">
                        <Chip label={statusChip[b.status]?.label} color={statusChip[b.status]?.color} size="small" />
                        <Typography variant="body2" fontWeight={500} mt={0.5}>
                          {formatRp(b.amount)}
                        </Typography>
                      </Box>
                    </Box>

                    {(b.status === 'pending' || b.status === 'overdue') && (
                      <Box className="flex gap-2 mt-2">
                        <Button
                          size="small" variant="contained" color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => openConfirm(b)}
                        >
                          Konfirmasi Lunas
                        </Button>
                        <Button
                          size="small" variant="outlined" color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => setCancelDialog({ open: true, billingId: b._id })}
                        >
                          Batalkan
                        </Button>
                      </Box>
                    )}
                    {b.status === 'paid' && b.paidAt && (
                      <Typography variant="caption" color="success.main" display="block" mt={0.5}>
                        ✓ Lunas {new Date(b.paidAt).toLocaleDateString('id-ID')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>

            {totalPages > 1 && (
              <Box className="flex justify-center">
                <Pagination count={totalPages} page={page}
                  onChange={(_, v) => loadBillings(v, filterStatus, filterMonth)}
                  color="primary" size="small" />
              </Box>
            )}
          </>
        )}
      </PageContainer>

      {/* Confirm Paid Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, billing: null })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>Konfirmasi Pembayaran</DialogTitle>
        <DialogContent>
          {confirmDialog.billing && (
            <Box className="bg-gray-50 rounded-lg p-3 mb-3">
              <Typography variant="body2"><strong>{confirmDialog.billing.tenantName}</strong></Typography>
              <Typography variant="body2" color="text.secondary">
                {formatMonth(confirmDialog.billing.month)} — {formatRp(confirmDialog.billing.amount)}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth label="Referensi Pembayaran (opsional)" value={payRef}
            onChange={(e) => setPayRef(e.target.value)} sx={{ mb: 2, mt: 1 }} size="small"
          />
          <TextField
            fullWidth label="Catatan Admin (opsional)" value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)} size="small" multiline rows={2}
          />
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button fullWidth variant="outlined" onClick={() => setConfirmDialog({ open: false, billing: null })}>Batal</Button>
          <Button fullWidth variant="contained" color="success" onClick={handleMarkPaid} disabled={confirming}>
            {confirming ? <CircularProgress size={20} color="inherit" /> : 'Konfirmasi Lunas'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirm */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, billingId: null })} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={500}>Batalkan Tagihan?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">Tagihan akan diubah menjadi Gratis dan tidak perlu dibayar.</Typography>
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button fullWidth variant="outlined" onClick={() => setCancelDialog({ open: false, billingId: null })}>Tidak</Button>
          <Button fullWidth variant="contained" color="error" onClick={handleCancel}>Ya, Batalkan</Button>
        </DialogActions>
      </Dialog>
    </AppPageShell>
  );
}
