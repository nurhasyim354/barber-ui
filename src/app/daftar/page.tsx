'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  MenuItem,
  Card,
  CardContent,
  Stack,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { BUSINESS_VERTICALS, type BusinessVerticalId } from '@/lib/marketingLanding';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';

function DaftarForm() {
  const searchParams = useSearchParams();
  const bisnisParam = searchParams.get('bisnis') ?? '';

  const [businessType, setBusinessType] = useState<BusinessVerticalId>(
    (BUSINESS_VERTICALS.some((b) => b.id === bisnisParam) ? bisnisParam : 'barbershop') as BusinessVerticalId,
  );
  const [outletName, setOutletName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralName, setReferralName] = useState('');
  const [referralPhone, setReferralPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bisnisParam && BUSINESS_VERTICALS.some((b) => b.id === bisnisParam)) {
      setBusinessType(bisnisParam as BusinessVerticalId);
    }
  }, [bisnisParam]);

  const handleSubmit = async () => {
    if (!outletName.trim() || !contactName.trim() || phone.length < 9) return;
    setSubmitting(true);
    try {
      await api.post('/public/tenant-registrations', {
        outletName: outletName.trim(),
        contactName: contactName.trim(),
        phone,
        businessType,
        message: message.trim() || undefined,
        referralName: referralName.trim() || undefined,
        referralPhone: (() => {
          const digits = referralPhone.replace(/\D/g, '');
          return digits.length >= 9 ? digits : undefined;
        })(),
      });
      toast.success('Pengajuan berhasil dikirim. Tim akan meninjau dan mengaktifkan outlet Anda.');
      setOutletName('');
      setContactName('');
      setPhone('');
      setReferralName('');
      setReferralPhone('');
      setMessage('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Gagal mengirim pengajuan. Coba lagi nanti.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4, px: UI_LAYOUT.containerGutters.px }}>
      <Button component={Link} href="/" startIcon={<ArrowBackIcon />} color="inherit" sx={{ mb: 2 }}>
        Kembali ke beranda
      </Button>

      <Typography variant="h4" fontWeight={800} gutterBottom>
        Daftar sebagai tenant
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Data dikirim ke server sebagai pengajuan tenant. Setelah disetujui super admin, Anda akan dapat masuk dengan OTP
        WhatsApp menggunakan nomor PIC di bawah.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Status awal: <strong>menunggu persetujuan</strong>. Gunakan nomor WA yang sama saat login setelah outlet diaktifkan.
      </Alert>

      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3 }}>
          <TextField
            select
            label="Jenis bisnis"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value as BusinessVerticalId)}
            fullWidth
          >
            {BUSINESS_VERTICALS.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Nama outlet / usaha" value={outletName} onChange={(e) => setOutletName(e.target.value)} fullWidth required />
          <TextField label="Nama PIC" value={contactName} onChange={(e) => setContactName(e.target.value)} fullWidth required />
          <TextField
            label="Nomor WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            fullWidth
            required
            inputMode="tel"
            helperText="Aktifkan WhatsApp untuk komunikasi aktivasi"
          />
          <TextField
            label="Nama referral (opsional)"
            value={referralName}
            onChange={(e) => setReferralName(e.target.value)}
            fullWidth
            placeholder="Mis. nama mitra / sales"
          />
          <TextField
            label="HP referral (opsional)"
            value={referralPhone}
            onChange={(e) => setReferralPhone(e.target.value.replace(/\D/g, ''))}
            fullWidth
            inputMode="tel"
            helperText="Isi jika ada orang yang mengarahkan Anda mendaftar"
          />
          <TextField
            label="Catatan (opsional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            placeholder="Jumlah cabang, kota, kebutuhan khusus, dll."
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={() => void handleSubmit()}
              disabled={!outletName.trim() || !contactName.trim() || phone.length < 9 || submitting}
            >
              {submitting ? 'Mengirim…' : 'Kirim pengajuan'}
            </Button>
            <Button component={Link} href="/login" variant="outlined" size="large">
              Sudah terdaftar? Masuk
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function DaftarTenantPage() {
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
      <Suspense
        fallback={
          <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary">Memuat…</Typography>
          </Container>
        }
      >
        <DaftarForm />
      </Suspense>
    </Box>
  );
}
