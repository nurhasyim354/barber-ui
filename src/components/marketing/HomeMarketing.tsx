'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
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
import CarIcon from '@mui/icons-material/CarRepair';
import PaymentsIcon from '@mui/icons-material/Payments';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import InsightsIcon from '@mui/icons-material/Insights';
import {
  BUSINESS_VERTICALS,
  MARKETING_FEATURES,
  type BusinessVertical,
  type BusinessVerticalId,
  projectRevenue,
} from '@/lib/marketingLanding';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';
import { alpha } from '@mui/material/styles';
import MarketingSiteFooter from '@/components/marketing/MarketingSiteFooter';
import MarketingSiteAppBar from '@/components/marketing/MarketingSiteAppBar';

/** Grafik vektor inline — tanpa file gambar, aman untuk performa halaman. */
function HeroQueueIllustration({ primary, paper }: { primary: string; paper: string }) {
  return (
    <svg
      viewBox="0 0 400 220"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustrasi antrian dan booking di perangkat"
      width="100%"
      height="auto"
      style={{ maxWidth: 360, display: 'block' }}
    >
      <defs>
        <linearGradient id="hm-hero-blob" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primary} stopOpacity="0.22" />
          <stop offset="100%" stopColor={primary} stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="hm-hero-phone" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={paper} stopOpacity="0.95" />
          <stop offset="100%" stopColor={paper} stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <ellipse cx="268" cy="118" rx="132" ry="96" fill="url(#hm-hero-blob)" />
      <path
        d="M48 118 C 48 78, 88 58, 130 72 C 172 86, 200 52, 238 68"
        fill="none"
        stroke={primary}
        strokeWidth="2"
        strokeDasharray="6 8"
        strokeLinecap="round"
        opacity="0.35"
      />
      <g transform="translate(32, 56)">
        <rect width="112" height="128" rx="10" fill="url(#hm-hero-phone)" stroke={primary} strokeWidth="1.5" opacity="0.9" />
        <rect x="12" y="14" width="88" height="36" rx="6" fill={primary} opacity="0.12" />
        <rect x="12" y="58" width="56" height="8" rx="4" fill={primary} opacity="0.2" />
        <rect x="12" y="72" width="72" height="8" rx="4" fill={primary} opacity="0.12" />
        <rect x="12" y="86" width="64" height="8" rx="4" fill={primary} opacity="0.1" />
        <circle cx="56" cy="112" r="14" fill={primary} opacity="0.18" />
        <path d="M50 112 L54 116 L64 106" fill="none" stroke={primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      </g>
      <g transform="translate(248, 44)">
        <rect width="108" height="168" rx="14" fill={paper} stroke={primary} strokeWidth="1.5" opacity="0.92" />
        <rect x="44" y="12" width="20" height="5" rx="2.5" fill={primary} opacity="0.25" />
        <rect x="14" y="32" width="80" height="40" rx="8" fill={primary} opacity="0.1" />
        <rect x="14" y="82" width="80" height="28" rx="6" fill={primary} opacity="0.08" />
        <rect x="14" y="118" width="52" height="10" rx="5" fill={primary} opacity="0.15" />
        <circle cx="86" cy="123" r="5" fill={primary} opacity="0.45" />
      </g>
      <g opacity="0.85">
        <circle cx="188" cy="46" r="9" fill={primary} opacity="0.35" />
        <circle cx="212" cy="38" r="7" fill={primary} opacity="0.28" />
        <circle cx="200" cy="58" r="6" fill={primary} opacity="0.22" />
      </g>
    </svg>
  );
}

/** Mini grafik garis untuk aksen kartu simulasi — murni path, sangat ringan. */
function SparklineAccent({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 120 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      width={120}
      height={48}
      style={{ position: 'absolute', right: 12, top: 12, opacity: 0.35 }}
    >
      <path
        d="M4 38 L22 28 L40 34 L58 18 L76 24 L94 10 L116 14"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="116" cy="14" r="3" fill={color} />
    </svg>
  );
}

const verticalIcons: Record<BusinessVerticalId, React.ReactNode> = {
  klinik: <LocalHospitalIcon sx={{ fontSize: 40 }} />,
  barbershop: <ContentCutIcon sx={{ fontSize: 40 }} />,
  bengkel_motor: <TwoWheelerIcon sx={{ fontSize: 40 }} />,
  spa_kecantikan: <SpaIcon sx={{ fontSize: 40 }} />,
  carwash: <CarIcon sx={{ fontSize: 40 }} />,
  ppob: <PaymentsIcon sx={{ fontSize: 40 }} />,
  jasa_umum: <HandymanIcon sx={{ fontSize: 40 }} />,
  restaurant: <RestaurantIcon sx={{ fontSize: 40 }} />,
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

  const baseRp = useMemo(() => revenueSlider * 1_000_000, [revenueSlider]);
  const projection = useMemo(() => projectRevenue(baseRp, vertical), [baseRp, vertical]);

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
      <MarketingSiteAppBar />

      {/* Hero */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: (t) =>
            `linear-gradient(165deg, ${t.palette.primary.main}14 0%, ${t.palette.background.default} 45%, ${t.palette.background.paper} 100%)`,
          py: { xs: 6, md: 10 },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: (t) =>
              `radial-gradient(circle at 1px 1px, ${alpha(t.palette.primary.main, 0.07)} 1px, transparent 0)`,
            backgroundSize: { xs: '24px 24px', md: '28px 28px' },
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ px: UI_LAYOUT.containerGutters.px, position: 'relative', zIndex: 1 }}>
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
              <Stack spacing={2.5}>
                <Box sx={{ px: { xs: 0, sm: 1 } }}>
                  <HeroQueueIllustration primary={theme.palette.primary.main} paper={theme.palette.background.paper} />
                </Box>
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
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Kenapa harus daftar? */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: (t) => (t.palette.mode === 'light' ? 'grey.50' : 'grey.900'),
          py: { xs: 6, md: 8 },
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 420,
            height: 420,
            top: -120,
            right: -80,
            borderRadius: '50%',
            background: (t) => `radial-gradient(circle, ${alpha(t.palette.primary.main, 0.09)} 0%, transparent 68%)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ px: UI_LAYOUT.containerGutters.px, position: 'relative', zIndex: 1 }}>
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
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2, maxWidth: 640, mx: 'auto' }}>
          Dirancang untuk operasional nyata: antrian, multi-outlet, dan pembayaran dalam satu stack.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1.25,
            mb: 4,
            opacity: 0.55,
          }}
          aria-hidden
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
          <Box sx={{ width: 36, height: 2, borderRadius: 1, bgcolor: 'primary.main', opacity: 0.35 }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
          <Box sx={{ width: 36, height: 2, borderRadius: 1, bgcolor: 'primary.main', opacity: 0.35 }} />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
        </Box>
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
                  position: 'relative',
                  overflow: 'hidden',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: 'common.white',
                }}
              >
                <SparklineAccent color={theme.palette.common.white} />
                <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
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

      <MarketingSiteFooter />
    </Box>
  );
}
