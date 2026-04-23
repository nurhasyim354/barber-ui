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
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { BUSINESS_VERTICALS, type BusinessVerticalId } from '@/lib/marketingLanding';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';
import MarketingSiteAppBar from '@/components/marketing/MarketingSiteAppBar';

function DaftarForm() {
  const searchParams = useSearchParams();
  const bisnisParam = searchParams.get('bisnis') ?? '';

  const [businessType, setBusinessType] = useState<BusinessVerticalId>(
    (BUSINESS_VERTICALS.some((b) => b.id === bisnisParam) ? bisnisParam : 'barbershop') as BusinessVerticalId,
  );
  const [outletName, setOutletName] = useState('');
  const [address, setAddress] = useState('');
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
    if (
      !outletName.trim() ||
      !address.trim() ||
      !contactName.trim() ||
      phone.replace(/\D/g, '').length < 9
    ) {
      toast.error('Isi nama outlet, alamat, nama PIC, dan nomor WA PIC yang valid');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/public/tenant-registrations', {
        outletName: outletName.trim(),
        address: address.trim(),
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
      toast.success('Outlet berhasil dibuat dan aktif. Silakan masuk dengan nomor WA PIC melalui halaman login.');
      setOutletName('');
      setAddress('');
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
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Daftar sebagai tenant
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Outlet langsung aktif setelah formulir terkirim. <strong>Nama PIC</strong> dan <strong>nomor WhatsApp PIC</strong>{' '}
        wajib diisi — gunakan nomor yang sama untuk masuk dengan OTP.
      </Typography>

      <Alert severity="success" sx={{ mb: 2 }}>
        Setelah daftar, Anda bisa langsung ke halaman <strong>Masuk</strong> dan login dengan OTP ke nomor PIC.
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
          <TextField
            label="Nama outlet / usaha (wajib)"
            value={outletName}
            onChange={(e) => setOutletName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Alamat outlet (wajib)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            required
            multiline
            minRows={2}
            placeholder="Jl., kelurahan, kota — tampil untuk pelanggan & admin"
          />
          <TextField
            label="Nama PIC (wajib)"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Nomor WhatsApp PIC (wajib)"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            fullWidth
            required
            inputMode="tel"
            helperText="Nomor ini dipakai untuk OTP login sebagai admin outlet"
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
              disabled={
                !outletName.trim() ||
                !address.trim() ||
                !contactName.trim() ||
                phone.length < 9 ||
                submitting
              }
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
      <MarketingSiteAppBar showBack pageHint="Daftar" />
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
