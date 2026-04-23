'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Typography, Button, Alert, Container } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import MarketingSiteAppBar from '@/components/marketing/MarketingSiteAppBar';
import MarketingSiteFooter from '@/components/marketing/MarketingSiteFooter';

function VerifyPhoneContent() {
  const params = useSearchParams();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const ok = params.get('ok');
  const err = params.get('err');

  useEffect(() => {
    if (ok === '1') logout();
  }, [ok, logout]);

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', p: 3, pt: 2 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Verifikasi nomor WhatsApp
      </Typography>
      {ok === '1' ? (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            Nomor berhasil diperbarui.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Silakan masuk lagi dengan nomor WhatsApp baru.
          </Typography>
          <Button variant="contained" onClick={() => router.replace('/login')}>
            Ke halaman masuk
          </Button>
        </>
      ) : err ? (
        <>
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
          <Button variant="outlined" onClick={() => router.replace('/login')}>
            Ke halaman masuk
          </Button>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Buka tautan verifikasi dari pesan WhatsApp. Jika Anda sudah mengklik tautan, periksa apakah alamat URL lengkap
          termasuk parameter token.
        </Typography>
      )}
    </Box>
  );
}

export default function VerifyPhoneChangePage() {
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <MarketingSiteAppBar showBack backHref="/login" pageHint="Verifikasi" />
      <Container maxWidth="sm" sx={{ flex: 1, py: 2 }}>
        <Suspense fallback={<Box py={4}>Memuat…</Box>}>
          <VerifyPhoneContent />
        </Suspense>
      </Container>
      <MarketingSiteFooter />
    </Box>
  );
}
