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
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import SpaIcon from '@mui/icons-material/Spa';
import HandymanIcon from '@mui/icons-material/Handyman';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CarIcon from '@mui/icons-material/CarRepair';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import InsightsIcon from '@mui/icons-material/Insights';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  BUSINESS_VERTICALS,
  MARKETING_FEATURES,
  type BusinessVertical,
  type BusinessVerticalId,
  projectRevenue,
} from '@/lib/marketingLanding';
import { TUTORIAL_PAGES, audienceLabel } from '@/lib/tutorialContent';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';

const verticalIcons: Record<BusinessVerticalId, React.ReactNode> = {
  klinik: <LocalHospitalIcon sx={{ fontSize: 40 }} />,
  barbershop: <ContentCutIcon sx={{ fontSize: 40 }} />,
  bengkel_motor: <TwoWheelerIcon sx={{ fontSize: 40 }} />,
  spa_kecantikan: <SpaIcon sx={{ fontSize: 40 }} />,
  carwash: <CarIcon sx={{ fontSize: 40 }} />,
  ppob: <PaymentsIcon sx={{ fontSize: 40 }} />,
  jasa_umum: <HandymanIcon sx={{ fontSize: 40 }} />,
};

const TENANT_BENEFITS: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <ScheduleIcon color="primary" />,
    title: 'Lebih sedikit tanya jawab di depan',
    body: 'Nomor antrian dan estimasi tunggu terlihat di HP pelanggan — staff fokus melayani, bukan menjelaskan berulang.',
  },
  {
    icon: <AccountBalanceWalletOutlinedIcon color="primary" />,
    title: 'Pendapatan tercatat rapi',
    body: 'Tunai maupun QRIS masuk ke sistem yang sama; Anda bisa cek omzet per hari, per layanan, atau per staff tanpa rekap manual.',
  },
  {
    icon: <ReplayIcon color="primary" />,
    title: 'Pelanggan lebih mudah kembali',
    body: 'Pengingat WhatsApp dan riwayat kunjungan memudahkan mereka booking lagi — potensi repeat order tanpa promosi besar-besaran.',
  },
  {
    icon: <InsightsIcon color="primary" />,
    title: 'Keputusan dari angka nyata',
    body: 'Lihat layanan yang paling laku, jam sibuk, dan performa outlet — cocok untuk menaikkan harga wajar atau menambah slot.',
  },
];

function fmtRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default function HomeMarketing() {
  const theme = useTheme();
  const [vertical, setVertical] = useState<BusinessVertical>(BUSINESS_VERTICALS[1]);
  const [revenueSlider, setRevenueSlider] = useState(35); // juta Rp
  const [tutorialAnchor, setTutorialAnchor] = useState<null | HTMLElement>(null);
  const closeTutorialMenu = () => setTutorialAnchor(null);

  const baseRp = useMemo(() => revenueSlider * 1_000_000, [revenueSlider]);
  const projection = useMemo(() => projectRevenue(baseRp, vertical), [baseRp, vertical]);

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
          <Typography variant="h6" fontWeight={800} color="primary" sx={{ flexGrow: 1 }}>
            Booking App
          </Typography>
          <Button
            id="tutorial-menu-button"
            color="inherit"
            onClick={(e) => setTutorialAnchor(e.currentTarget)}
            startIcon={<MenuBookIcon />}
            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
            sx={{ mr: 0.5, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Tutorial
          </Button>
          <Button
            color="inherit"
            onClick={(e) => setTutorialAnchor(e.currentTarget)}
            aria-label="Menu tutorial"
            sx={{ mr: 0.5, display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <MenuBookIcon />
          </Button>
          <Menu
            anchorEl={tutorialAnchor}
            open={Boolean(tutorialAnchor)}
            onClose={closeTutorialMenu}
            MenuListProps={{ 'aria-labelledby': 'tutorial-menu-button' }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { maxHeight: 420, minWidth: 280 } }}
          >
            <MenuItem component={Link} href="/tutorial" onClick={closeTutorialMenu}>
              <Typography variant="body2" fontWeight={700}>
                Semua panduan
              </Typography>
            </MenuItem>
            <Divider />
            {TUTORIAL_PAGES.map((p) => (
              <MenuItem
                key={p.slug}
                component={Link}
                href={`/tutorial/${p.slug}`}
                onClick={closeTutorialMenu}
                sx={{ alignItems: 'flex-start', py: 1.25 }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {p.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {audienceLabel(p.audience)} · ±{p.readMinutes} menit
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
          <Button component={Link} href="/login" color="inherit">
            Masuk
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
              <Typography variant="h3" component="h1" fontWeight={800} sx={{ fontSize: { xs: '1.85rem', sm: '2.5rem', md: '3rem' }, lineHeight: 1.15 }}>
                Antrian rapi, pendapatan lebih terukur
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
                Booking, staff, kasir, laporan, dan pengingat WA dalam satu tempat. Pilih jenis bisnis, cek simulasi omzet,
                lalu daftarkan outlet Anda.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                <Button component={Link} href={`/daftar?bisnis=${vertical.id}`} variant="contained" size="large">
                  Pakai untuk bisnis saya
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
                    <li>Pelanggan scan QR atau buka link booking di medsos atau outlet Anda.</li>
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

      {/* Kenapa harus daftar? */}
      <Box sx={{ bgcolor: (t) => (t.palette.mode === 'light' ? 'grey.50' : 'grey.900'), py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg" sx={{ px: UI_LAYOUT.containerGutters.px }}>
          <Typography variant="h4" fontWeight={800} textAlign="center" sx={{ mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Kenapa harus pakai?
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4, maxWidth: 640, mx: 'auto' }}>
            Yang Anda dapat bukan sekadar aplikasi booking — alur kerja outlet jadi lebih ringan dan hasil finansial lebih mudah dibaca.
          </Typography>
          <Grid container spacing={2}>
            {TENANT_BENEFITS.map((b) => (
              <Grid item xs={12} sm={6} key={b.title}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    borderRadius: 2,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ mt: 0.25 }}>{b.icon}</Box>
                      <Box>
                        <Typography fontWeight={700} gutterBottom>
                          {b.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {b.body}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
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
