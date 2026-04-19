'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Stack,
  Slider,
  Chip,
  useTheme,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import SpaIcon from '@mui/icons-material/Spa';
import HandymanIcon from '@mui/icons-material/Handyman';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import {
  BUSINESS_VERTICALS,
  MARKETING_FEATURES,
  type BusinessVertical,
  type BusinessVerticalId,
  projectRevenue,
} from '@/lib/marketingLanding';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';

const verticalIcons: Record<BusinessVerticalId, React.ReactNode> = {
  klinik: <LocalHospitalIcon sx={{ fontSize: 40 }} />,
  barbershop: <ContentCutIcon sx={{ fontSize: 40 }} />,
  bengkel_motor: <TwoWheelerIcon sx={{ fontSize: 40 }} />,
  spa_kecantikan: <SpaIcon sx={{ fontSize: 40 }} />,
  jasa_umum: <HandymanIcon sx={{ fontSize: 40 }} />,
};

function fmtRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default function HomeMarketing() {
  const theme = useTheme();
  const [vertical, setVertical] = useState<BusinessVertical>(BUSINESS_VERTICALS[1]);
  const [revenueSlider, setRevenueSlider] = useState(35); // juta Rp

  const baseRp = useMemo(() => revenueSlider * 1_000_000, [revenueSlider]);
  const projection = useMemo(() => projectRevenue(baseRp, vertical), [baseRp, vertical]);

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
          <Typography variant="h6" fontWeight={800} color="primary" sx={{ flexGrow: 1 }}>
            BookingOutlet
          </Typography>
          <Button component={Link} href="/login" color="inherit">
            Masuk
          </Button>
          <Button component={Link} href={`/daftar?bisnis=${vertical.id}`} variant="contained" sx={{ ml: 1 }}>
            Daftar tenant
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box
        sx={{
          background: (t) =>
            `linear-gradient(165deg, ${t.palette.primary.main}14 0%, ${t.palette.background.default} 45%, ${t.palette.background.paper} 100%)`,
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg" sx={{ px: UI_LAYOUT.containerGutters.px }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip label="Multi-tenant · Mobile-first" size="small" sx={{ mb: 2 }} color="primary" variant="outlined" />
              <Typography variant="h3" component="h1" fontWeight={800} sx={{ fontSize: { xs: '1.85rem', sm: '2.5rem', md: '3rem' }, lineHeight: 1.15 }}>
                Antrian rapi, pendapatan lebih terukur — untuk klinik, barbershop, bengkel, dan bisnis servis lainnya.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
                Satu aplikasi untuk booking pelanggan, mengelola staff, kasir, QRIS, dan laporan — termasuk pengingat WA agar
                pelanggan kembali dan tampilan hasil layanan terakhir di HP mereka. Pilih jenis bisnis Anda, lihat simulasi
                potensi kenaikan omzet, lalu ajukan pembukaan outlet.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                <Button component={Link} href={`/daftar?bisnis=${vertical.id}`} variant="contained" size="large">
                  Daftar jadi tenant
                </Button>
                <Button component={Link} href="/login" variant="outlined" size="large">
                  Sudah punya akun
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card elevation={3} sx={{ borderRadius: 3, border: 1, borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <QrCode2Icon color="primary" />
                    <Typography fontWeight={700}>Alur singkat</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" component="ol" sx={{ pl: 2, m: 0, '& li': { mb: 1 } }}>
                    <li>Pelanggan scan QR atau buka link booking outlet Anda.</li>
                    <li>Mereka pilih layanan & (opsional) staff — dapat nomor antrian.</li>
                    <li>Di kasir: status layanan, bayar tunai/QRIS, cetak nota.</li>
                    <li>Setelah selesai: opsional foto hasil; pengingat WhatsApp bisa mengajak booking lagi.</li>
                    <li>Pelanggan lihat ringkasan & foto kunjungan terakhir di app; Anda pantau omzet & laporan per staff.</li>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 }, px: UI_LAYOUT.containerGutters.px }}>
        <Typography variant="h4" fontWeight={800} textAlign="center" sx={{ mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
          Fitur unggulan
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 4, maxWidth: 640, mx: 'auto' }}>
          Dirancang untuk operasional nyata: antrian, multi-outlet, dan pembayaran dalam satu stack.
        </Typography>
        <Grid container spacing={2}>
          {MARKETING_FEATURES.map((f) => (
            <Grid item xs={12} sm={6} md={4} key={f.title}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Typography fontWeight={700} gutterBottom>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.body}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Business picker + simulation */}
      <Box sx={{ bgcolor: (t) => (t.palette.mode === 'light' ? 'grey.50' : 'grey.900'), py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg" sx={{ px: UI_LAYOUT.containerGutters.px }}>
          <Typography variant="h4" fontWeight={800} textAlign="center" sx={{ mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Pilih jenis bisnis Anda
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3, maxWidth: 560, mx: 'auto' }}>
            Kami menyesuaikan contoh angka simulasi — ilustrasi skenario setelah proses booking & kasir lebih terdigitasi.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              mb: 4,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(5, minmax(0, 1fr))',
              },
            }}
          >
            {BUSINESS_VERTICALS.map((v) => {
              const selected = v.id === vertical.id;
              return (
                <Card
                  key={v.id}
                  component="button"
                  type="button"
                  onClick={() => setVertical(v)}
                  variant="outlined"
                  sx={{
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 2,
                    borderColor: selected ? 'primary.main' : 'divider',
                    borderWidth: selected ? 2 : 1,
                    bgcolor: selected ? 'primary.main' + '0a' : 'background.paper',
                    transition: '0.2s',
                    '&:hover': { borderColor: 'primary.light' },
                  }}
                >
                  <CardContent sx={{ py: 2, px: 1.5, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ color: selected ? 'primary.main' : 'text.secondary', mb: 1 }}>
                      {verticalIcons[v.id]}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {v.shortLabel}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {vertical.description}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography fontWeight={700} gutterBottom>
                Omzet bulanan perkiraan saat ini
              </Typography>
              <Typography variant="h5" fontWeight={800} color="primary" sx={{ mb: 2 }}>
                {fmtRp(baseRp)}
              </Typography>
              <Slider
                value={revenueSlider}
                onChange={(_, v) => setRevenueSlider(v as number)}
                min={5}
                max={200}
                step={5}
                marks={[
                  { value: 5, label: '5 jt' },
                  { value: 50, label: '50 jt' },
                  { value: 100, label: '100 jt' },
                  { value: 200, label: '200 jt' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v} juta`}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: 'common.white',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <TrendingUpIcon />
                    <Typography fontWeight={700}>Simulasi setelah optimalisasi</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                    Asumsi peningkatan {projection.upliftPctMin}–{projection.upliftPctMax}% dari pemenuhan slot, penurunan no-show,
                    dan penjualan tambahan — angka indikatif, bukan janji pasti.
                  </Typography>
                  <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap" useFlexGap>
                    <Typography variant="h4" fontWeight={900}>
                      {fmtRp(projection.low)}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.85 }}>
                      —
                    </Typography>
                    <Typography variant="h4" fontWeight={900}>
                      {fmtRp(projection.high)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 1 }}>
                    per bulan · vertikal: {vertical.label}
                  </Typography>
                  <Button
                    component={Link}
                    href={`/daftar?bisnis=${vertical.id}`}
                    fullWidth
                    variant="contained"
                    color="secondary"
                    size="large"
                    sx={{ mt: 3, fontWeight: 700 }}
                    startIcon={<PaymentsIcon />}
                  >
                    Ajukan pembukaan outlet
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer CTA */}
      <Box sx={{ py: 6, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="sm">
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Siap digitalisasi antrian & kasir?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Isi formulir singkat — tim kami akan menghubungi Anda untuk aktivasi tenant.
          </Typography>
          <Button component={Link} href={`/daftar?bisnis=${vertical.id}`} variant="contained" size="large">
            Link pendaftaran tenant
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
