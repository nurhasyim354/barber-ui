'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, TextField,
  Button, InputAdornment, IconButton, CircularProgress,
  Tooltip,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function BookingQrPage() {
  const router = useRouter();
  const { user, isLoading, loadFromStorage } = useAuthStore();

  const [customerPhone, setCustomerPhone] = useState('');
  const [origin, setOrigin] = useState('');
  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFromStorage();
    setOrigin(window.location.origin);
  }, [loadFromStorage]);

  // Auth guard
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'customer' || user.role === 'barber') {
      router.replace('/booking');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const tenantId = user.tenantId;

  if (!tenantId) {
    return (
      <Box
        sx={{
          minHeight: '100svh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', p: 4, textAlign: 'center',
        }}
      >
        <Typography color="text.secondary">
          Akun ini tidak terhubung ke tenant manapun.
        </Typography>
      </Box>
    );
  }

  // Build QR URL
  const params = new URLSearchParams({ tenantId, type: 'booking' });
  if (customerPhone.trim()) params.set('customerPhone', customerPhone.trim());
  const qrUrl = `${origin}/booking?${params.toString()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl)
      .then(() => toast.success('Link disalin!'))
      .catch(() => toast.error('Gagal menyalin link'));
  };

  const handleDownload = () => {
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-booking-${tenantId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('QR berhasil diunduh');
  };

  return (
    <Box sx={{ minHeight: '100svh', p: 2, pb: 6, bgcolor: 'background.default' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} pt={2} mb={4}>
        <IconButton onClick={() => router.back()} size="small" sx={{ mr: 0.5 }}>
          <ArrowBackIcon />
        </IconButton>
        <QrCode2Icon sx={{ fontSize: 26, color: 'primary.main' }} />
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>QR Booking</Typography>
          <Typography variant="caption" color="text.secondary">
            Tampilkan ke pelanggan untuk scan
          </Typography>
        </Box>
      </Box>

      {/* QR Code Display */}
      <Card sx={{ mb: 3, overflow: 'visible' }}>
        <CardContent
          sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', p: 4, '&:last-child': { pb: 4 },
          }}
        >
          {/* QR Box */}
          <Box
            ref={qrContainerRef}
            sx={{
              p: 3, borderRadius: 3, bgcolor: 'white',
              boxShadow: '0 8px 40px rgba(139,58,42,0.2)',
              border: '1px solid', borderColor: 'divider',
              mb: 3,
            }}
          >
            <QRCode
              value={qrUrl}
              size={220}
              level="M"
              style={{ display: 'block' }}
            />
          </Box>

          {/* Tenant branding */}
          <Box display="flex" alignItems="center" gap={1} mb={0.75}>
            <Box
              sx={{
                width: 28, height: 28, borderRadius: '8px',
                bgcolor: 'primary.main',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ContentCutIcon sx={{ fontSize: 16, color: 'white' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {user.name || 'Barbershop'}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Scan untuk booking sekarang
          </Typography>

          {/* Action buttons */}
          <Box display="flex" gap={1.5}>
            <Tooltip title="Salin link">
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopy}
                size="small"
              >
                Salin Link
              </Button>
            </Tooltip>
            <Tooltip title="Unduh QR (SVG)">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                size="small"
              >
                Unduh QR
              </Button>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Pre-fill customer phone */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5} color="text.primary">
            QR untuk Pelanggan Tertentu
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Opsional — masukkan nomor HP pelanggan agar form terisi otomatis saat scan
          </Typography>

          <TextField
            fullWidth
            label="Nomor HP Pelanggan"
            placeholder="08xx xxxx xxxx"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
            inputMode="tel"
            helperText={customerPhone ? `QR berisi: …customerPhone=${customerPhone}&type=booking` : ' '}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: customerPhone ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setCustomerPhone('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </CardContent>
      </Card>

      {/* URL preview */}
      <Card>
        <CardContent>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            URL yang dikodekan dalam QR
          </Typography>
          <Box
            sx={{
              p: 1.5, borderRadius: 2,
              bgcolor: 'grey.100',
              border: '1px solid', borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'grey.200' },
            }}
            onClick={handleCopy}
          >
            <Typography
              variant="caption"
              sx={{ wordBreak: 'break-all', color: 'text.secondary', fontFamily: 'monospace' }}
            >
              {qrUrl}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.disabled" display="block" mt={1}>
            Ketuk URL di atas untuk menyalin
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
