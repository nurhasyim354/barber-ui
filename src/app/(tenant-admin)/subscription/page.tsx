'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Chip, Divider, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Pagination, Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import StarIcon from '@mui/icons-material/Star';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ChatIcon from '@mui/icons-material/Chat';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { StaffBottomNav, TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface Plan {
  _id: string;
  name: string;
  displayName: string;
  minTransactions: number;
  maxTransactions: number | null;
  pricePerMonth: number;
  tenantTypes?: string[] | null;
}

interface Billing {
  _id: string;
  month: string;
  planName: string;
  planDisplayName: string;
  transactionCount: number;
  amount: number;
  status: 'free' | 'pending' | 'paid' | 'overdue';
  paymentRef?: string | null;
  paidAt?: string | null;
  adminNotes?: string | null;
}

interface PaymentInstructions {
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
  qrisImageBase64: string | null;
  supportWhatsAppDisplay: string | null;
  supportWhatsAppHref: string | null;
}

interface PaymentGatewayView {
  enabled: boolean;
  provider: 'midtrans';
  clientKey: string;
  snapJsUrl: string;
  isProduction: boolean;
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts?: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const statusChip: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  free: { label: 'Gratis', color: 'success' },
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

const PAGE_SIZE = 10;

export default function SubscriptionPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

  const [billing, setBilling] = useState<Billing | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<Billing[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [payDialog, setPayDialog] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [paymentGateway, setPaymentGateway] = useState<PaymentGatewayView | null>(null);
  const [snapReady, setSnapReady] = useState(false);
  const [snapPayBusy, setSnapPayBusy] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin' && user.role !== 'staff') { router.replace('/'); return; }
    loadCurrent();
    loadHistory(1);
  }, [user, isLoading]);

  const loadCurrent = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscription/current');
      setBilling(res.data.billing);
      setPlans(res.data.plans);
      setPaymentInstructions(res.data.paymentInstructions ?? null);
      setPaymentGateway(res.data.paymentGateway ?? null);
    } catch {
      toast.error('Gagal memuat info langganan');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = useCallback(async (p: number) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/subscription/history?page=${p}&limit=${PAGE_SIZE}`);
      setHistory(res.data.data);
      setHistoryTotal(res.data.total);
      setHistoryTotalPages(res.data.totalPages);
      setHistoryPage(p);
    } catch {
      toast.error('Gagal memuat riwayat tagihan');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSubmitRef = async () => {
    if (!payRef.trim()) { toast.error('Isi referensi pembayaran'); return; }
    if (!billing) return;
    setSubmitting(true);
    try {
      await api.post(`/subscription/${billing._id}/pay-ref`, { paymentRef: payRef.trim() });
      toast.success('Referensi pembayaran berhasil dikirim');
      setPayDialog(false);
      setPayRef('');
      loadCurrent();
    } catch {
      toast.error('Gagal mengirim referensi');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!paymentGateway?.enabled) {
      setSnapReady(false);
      return;
    }
    const cid = paymentGateway.clientKey;
    const src = paymentGateway.snapJsUrl;
    const markerId = 'midtrans-snap-loader';
    document.getElementById(markerId)?.remove();
    setSnapReady(false);
    const script = document.createElement('script');
    script.id = markerId;
    script.src = src;
    script.async = true;
    script.setAttribute('data-client-key', cid);
    script.onload = () => setSnapReady(true);
    script.onerror = () => toast.error('Gagal memuat Midtrans Snap');
    document.body.appendChild(script);
  }, [paymentGateway?.enabled, paymentGateway?.clientKey, paymentGateway?.snapJsUrl]);

  const handlePayMidtrans = async () => {
    if (!billing || !paymentGateway?.enabled) return;
    if (!snapReady || typeof window.snap?.pay !== 'function') {
      toast.error('Snap belum siap — tunggu sebentar atau muat ulang halaman.');
      return;
    }
    setSnapPayBusy(true);
    try {
      const res = await api.post<{ snapToken: string }>('subscription/midtrans/snap-token', {
        billingId: billing._id,
      });
      window.snap.pay(res.data.snapToken, {
        onSuccess: () => {
          setSnapPayBusy(false);
          toast.success('Pembayaran selesai. Status akan diperbarui setelah konfirmasi Midtrans.');
          void loadCurrent();
        },
        onPending: () => {
          setSnapPayBusy(false);
          toast('Pembayaran tertunda — selesaikan di aplikasi pembayaran Anda.', { icon: '⏳' });
          void loadCurrent();
        },
        onError: () => {
          setSnapPayBusy(false);
          toast.error('Pembayaran dibatalkan atau gagal.');
        },
        onClose: () => {
          setSnapPayBusy(false);
          void loadCurrent();
        },
      });
    } catch (err: unknown) {
      setSnapPayBusy(false);
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal memulai Midtrans',
      );
    }
  };

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader title="Langganan & Tagihan" back />

      <PageContainer>
        {loading ? (
          <Box className="flex justify-center mt-12"><CircularProgress /></Box>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Tier dan harga mengikuti <strong>jenis bisnis</strong> outlet Anda
              {user?.tenantType ? (
                <> (<code>{user.tenantType}</code>)</>
              ) : null}
              . Transaksi dihitung dari pembayaran lunas per bulan.
            </Alert>

            {paymentInstructions?.supportWhatsAppHref && paymentInstructions.supportWhatsAppDisplay && (
              <Alert
                severity="success"
                icon={<ChatIcon />}
                sx={{ mb: 2, borderRadius: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    href={paymentInstructions.supportWhatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chat WhatsApp
                  </Button>
                }
              >
                <Typography variant="body2" fontWeight={600} component="span" display="block" gutterBottom>
                  Bantuan WhatsApp
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hubungi admin platform: <strong>{paymentInstructions.supportWhatsAppDisplay}</strong>
                </Typography>
              </Alert>
            )}

            <Card className="mb-4" variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  Cara pembayaran langganan
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {paymentGateway?.enabled ? (
                    <>
                      Anda dapat membayar secara <strong>online (Midtrans)</strong>, atau{' '}
                      <strong>transfer bank</strong> / <strong>QRIS</strong> lalu kirim nomor referensi manual.
                      Setelah transfer manual kirim nomor referensi melalui tombol di bawah agar tim mengonfirmasi.
                    </>
                  ) : (
                    <>
                      Anda dapat membayar dengan <strong>transfer bank</strong> atau <strong>QRIS</strong>. Setelah itu
                      kirim nomor referensi lewat tombol &quot;Kirim Bukti / Referensi Pembayaran&quot; agar tim mengonfirmasi.
                    </>
                  )}
                </Typography>

                {paymentGateway?.enabled && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Pembayaran online Midtrans aktif untuk tagihan Anda. Lunasi dari kartu/dompet digital mendukung Midtrans Snap.
                  </Alert>
                )}

                <Box mb={3}>
                  <Box className="flex items-center gap-1 mb-1">
                    <AccountBalanceIcon fontSize="small" color="primary" />
                    <Typography fontWeight={600}>Transfer bank</Typography>
                  </Box>
                  {paymentInstructions &&
                  (paymentInstructions.bankName ||
                    paymentInstructions.bankAccount ||
                    paymentInstructions.accountHolder) ? (
                    <>
                      {paymentInstructions.bankName && (
                        <Typography variant="body2">
                          Bank: <strong>{paymentInstructions.bankName}</strong>
                        </Typography>
                      )}
                      {paymentInstructions.bankAccount && (
                        <Typography variant="body2">
                          No. rekening: <strong>{paymentInstructions.bankAccount}</strong>
                        </Typography>
                      )}
                      {paymentInstructions.accountHolder && (
                        <Typography variant="body2">
                          Atas nama: <strong>{paymentInstructions.accountHolder}</strong>
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      Data rekening tujuan belum diisi di pengaturan platform. Silakan hubungi admin untuk nomor rekening
                      resmi.
                    </Alert>
                  )}
                </Box>

                <Box>
                  <Box className="flex items-center gap-1 mb-1">
                    <QrCode2Icon fontSize="small" color="primary" />
                    <Typography fontWeight={600}>QRIS</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Scan kode QRIS dari aplikasi e-wallet atau mobile banking (menu bayar dengan QR).
                  </Typography>
                  {paymentInstructions?.qrisImageBase64 ? (
                    <Box className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={paymentInstructions.qrisImageBase64}
                        alt="QRIS pembayaran langganan"
                        className="max-w-[220px] w-full h-auto rounded border border-gray-200"
                      />
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      Gambar QRIS belum diunggah. Hubungi admin platform atau gunakan transfer bank jika tersedia.
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
            {/* Current Billing Card */}
            {billing && (
              <Card className="mb-4" sx={{
                borderLeft: 4,
                borderLeftColor: billing.status === 'paid' || billing.status === 'free'
                  ? 'success.main'
                  : billing.status === 'overdue' ? 'error.main' : 'warning.main',
              }}>
                <CardContent>
                  <Box className="flex items-center justify-between mb-2">
                    <Typography variant="h6" fontWeight={500}>
                      Bulan Ini — {formatMonth(billing.month)}
                    </Typography>
                    <Chip
                      label={statusChip[billing.status]?.label}
                      color={statusChip[billing.status]?.color}
                      size="small"
                    />
                  </Box>

                  <Box className="flex items-center gap-2 mb-1">
                    <StarIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography fontWeight={600}>{billing.planDisplayName}</Typography>
                  </Box>
                  <Box className="flex items-center gap-2 mb-3">
                    <ReceiptLongIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography color="text.secondary">
                      {billing.transactionCount} transaksi bulan ini
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Box className="flex justify-between items-center">
                    <Typography fontWeight={600}>Tagihan</Typography>
                    <Typography variant="h6" fontWeight={600}
                      color={billing.amount === 0 ? 'success.main' : 'primary.main'}>
                      {formatRp(billing.amount)}
                    </Typography>
                  </Box>

                  {billing.status === 'paid' && billing.paidAt && (
                    <Box className="flex items-center gap-1 mt-2">
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="body2" color="success.main">
                        Lunas pada {new Date(billing.paidAt).toLocaleDateString('id-ID')}
                      </Typography>
                    </Box>
                  )}

                  {billing.paymentRef && billing.status !== 'paid' && (
                    <Alert severity="info" sx={{ mt: 2 }} icon={<HourglassEmptyIcon />}>
                      Menunggu konfirmasi admin. Ref: <strong>{billing.paymentRef}</strong>
                    </Alert>
                  )}

                  {billing.status === 'overdue' && (
                    <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorIcon />}>
                      Tagihan ini melewati jatuh tempo. Segera hubungi admin.
                    </Alert>
                  )}

                  {(billing.status === 'pending' || billing.status === 'overdue') && billing.amount > 0 && !billing.paymentRef && (
                    paymentGateway?.enabled ? (
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="secondary"
                          disabled={snapPayBusy || !snapReady}
                          onClick={() => void handlePayMidtrans()}
                        >
                          {snapPayBusy || !snapReady ? (
                            <CircularProgress size={22} color="inherit" />
                          ) : (
                            'Bayar online (Midtrans)'
                          )}
                        </Button>
                        <Button fullWidth variant="outlined" onClick={() => setPayDialog(true)}>
                          Kirim bukti transfer manual
                        </Button>
                      </Box>
                    ) : (
                      <Button
                        fullWidth variant="contained" sx={{ mt: 2 }}
                        onClick={() => setPayDialog(true)}
                      >
                        Kirim Bukti / Referensi Pembayaran
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {/* Plans Info */}
            <Card className="mb-4">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={500} mb={2}>Paket Berlangganan</Typography>
                {[...plans].sort((a, b) => a.minTransactions - b.minTransactions).map((p) => (
                  <Box key={p._id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <Box>
                      <Typography fontWeight={600}>{p.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.minTransactions}
                        {p.maxTransactions != null ? `–${p.maxTransactions}` : '+'} transaksi/bulan
                      </Typography>
                    </Box>
                    <Typography fontWeight={500} color={p.pricePerMonth === 0 ? 'success.main' : 'primary.main'}>
                      {formatRp(p.pricePerMonth)}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            {/* History */}
            <Typography variant="subtitle1" fontWeight={500} mb={2}>
              Riwayat Tagihan {historyTotal > 0 && `(${historyTotal})`}
            </Typography>

            {historyLoading ? (
              <Box className="flex justify-center py-6"><CircularProgress size={28} /></Box>
            ) : history.length === 0 ? (
              <Card><CardContent className="text-center py-6">
                <Typography color="text.secondary">Belum ada riwayat tagihan</Typography>
              </CardContent></Card>
            ) : (
              <>
                <Box className="flex flex-col gap-2 mb-4">
                  {history.map((h) => (
                    <Card key={h._id} className="opacity-90">
                      <CardContent className="py-3 flex justify-between items-start">
                        <Box>
                          <Typography fontWeight={600}>{formatMonth(h.month)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {h.planDisplayName} · {h.transactionCount} tx
                          </Typography>
                          {h.paymentRef && (
                            <Typography variant="caption" color="text.disabled">
                              Ref: {h.paymentRef}
                            </Typography>
                          )}
                        </Box>
                        <Box className="text-right">
                          <Chip label={statusChip[h.status]?.label} color={statusChip[h.status]?.color} size="small" />
                          <Typography variant="body2" fontWeight={500} mt={0.5}>
                            {formatRp(h.amount)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                {historyTotalPages > 1 && (
                  <Box className="flex justify-center">
                    <Pagination count={historyTotalPages} page={historyPage}
                      onChange={(_, v) => loadHistory(v)} color="primary" size="small" />
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </PageContainer>

      {/* Payment Ref Dialog */}
      <Dialog open={payDialog} onClose={() => setPayDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>Konfirmasi Pembayaran</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Transfer ke rekening admin dan masukkan nomor referensi / bukti transfer di bawah ini.
            Admin akan mengkonfirmasi dalam 1×24 jam.
          </Typography>
          {billing && (
            <Box className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
              <Typography variant="caption" color="text.secondary">Jumlah yang harus dibayar</Typography>
              <Typography variant="h5" fontWeight={600} color="primary">
                {formatRp(billing.amount)}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth label="Nomor Referensi / Kode Transfer"
            placeholder="Contoh: TRF20260401001"
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button fullWidth variant="outlined" onClick={() => setPayDialog(false)}>Batal</Button>
          <Button fullWidth variant="contained" onClick={handleSubmitRef} disabled={submitting}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Kirim'}
          </Button>
        </DialogActions>
      </Dialog>

      {user?.role === 'staff' ? <StaffBottomNav /> : <TenantAdminBottomNav />}
    </AppPageShell>
  );
}
