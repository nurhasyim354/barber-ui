/**
 * Konten landing marketing & asumsi simulasi pendapatan per vertikal bisnis.
 * Angka uplift ilustratif (bukan jaminan) — disesuaikan per jenis operasi.
 */

export type BusinessVerticalId =
  | 'klinik'
  | 'barbershop'
  | 'bengkel_motor'
  | 'spa_kecantikan'
  | 'carwash'
  | 'ppob'
  | 'jasa_umum';

export interface BusinessVertical {
  id: BusinessVerticalId;
  label: string;
  shortLabel: string;
  description: string;
  /** Estimasi omzet bulanan awal (Rp) jika pengguna belum mengisi */
  defaultMonthlyRevenue: number;
  /** Rentang peningkatan relatif (mis. no-show turun, slot terisi, upsell) */
  upliftMin: number;
  upliftMax: number;
}

export const BUSINESS_VERTICALS: BusinessVertical[] = [
  {
    id: 'klinik',
    label: 'Klinik / praktik dokter',
    shortLabel: 'Klinik',
    description: 'Antrian pasien, jadwal dokter, dan pembayaran di satu alur.',
    defaultMonthlyRevenue: 85_000_000,
    upliftMin: 0.06,
    upliftMax: 0.18,
  },
  {
    id: 'barbershop',
    label: 'Barbershop / salon',
    shortLabel: 'Barbershop',
    description: 'Booking slot stylist, antrian walk-in, dan kasir terintegrasi.',
    defaultMonthlyRevenue: 7_000_000,
    upliftMin: 0.1,
    upliftMax: 0.28,
  },
  {
    id: 'bengkel_motor',
    label: 'Bengkel motor',
    shortLabel: 'Bengkel motor',
    description: 'Antrian servis, penugasan mekanik, dan tagihan transparan.',
    defaultMonthlyRevenue: 10_000_000,
    upliftMin: 0.08,
    upliftMax: 0.22,
  },
  
  {
    id: 'spa_kecantikan',
    label: 'Spa & kecantikan',
    shortLabel: 'Spa',
    description: 'Reservasi perawatan, paket layanan, dan reminder pelanggan.',
    defaultMonthlyRevenue: 55_000_000,
    upliftMin: 0.07,
    upliftMax: 0.2,
  },
  {
    id: 'carwash',
    label: 'Carwash & Salon Mobil/Motor',
    shortLabel: 'Carwash',
    description: 'Antrian servis, penugasan mekanik, dan tagihan transparan.',
    defaultMonthlyRevenue: 15_000_000,
    upliftMin: 0.08,
    upliftMax: 0.22,
  },
  {
    id: 'ppob',
    label: 'PPOB, Pulsa & Token',
    shortLabel: 'PPOB',
    description: 'Antrian dan tagihan.',
    defaultMonthlyRevenue: 15_000_000,
    upliftMin: 0.08,
    upliftMax: 0.25,
  },
  {
    id: 'jasa_umum',
    label: 'Jasa umum',
    shortLabel: 'Jasa umum',
    description: 'Antrian dan tagihan.',
    defaultMonthlyRevenue: 15_000_000,
    upliftMin: 0.1,
    upliftMax: 0.28,
  },
];

export interface MarketingFeature {
  title: string;
  body: string;
}

export const MARKETING_FEATURES: MarketingFeature[] = [
  {
    title: 'Booking & antrian real-time',
    body: 'Pelanggan pesan dari HP; Anda lihat antrian hari ini, status layanan, dan estimasi tunggu.',
  },
  {
    title: 'Multi-outlet (multi-tenant)',
    body: 'Satu platform untuk banyak cabang: tema, layanan, dan staff per outlet.',
  },
  {
    title: 'Kasir & pembayaran',
    body: 'Tunai atau QRIS, nota cetak, riwayat transaksi — mengurangi salah input dan kebocoran.',
  },
  {
    title: 'Langganan & paket transaksi',
    body: 'Biaya platform mengikuti volume; super admin mengelola tagihan dan konfirmasi.',
  },
  {
    title: 'OTP WhatsApp',
    body: 'Login tanpa password untuk pelanggan dan staff — cocok untuk pengguna awam.',
  },
  {
    title: 'Laporan & insight',
    body: 'Ringkasan pendapatan harian dan laporan per tenaga untuk evaluasi kinerja.',
  },
  {
    title: 'Pengingat kunjungan (WhatsApp)',
    body: 'Setelah layanan selesai, outlet bisa menjadwalkan pesan undangan booking lagi — interval diatur per tenant; link langsung ke halaman booking.',
  },
  {
    title: 'Hasil layanan terakhir di app',
    body: 'Pelanggan melihat ringkasan kunjungan selesai terakhir dan foto dokumentasi di halaman booking & riwayat — cocok untuk portofolio atau bukti servis.',
  },
];

export function getVertical(id: BusinessVerticalId | string): BusinessVertical {
  const found = BUSINESS_VERTICALS.find((v) => v.id === id);
  return found ?? BUSINESS_VERTICALS[1];
}

export interface RevenueProjection {
  base: number;
  low: number;
  high: number;
  upliftPctMin: number;
  upliftPctMax: number;
}

/** Simulasi sederhana: base × (1 + uplift) dari rentang vertikal */
export function projectRevenue(
  monthlyBaseRp: number,
  vertical: BusinessVertical,
): RevenueProjection {
  const base = Math.max(0, monthlyBaseRp) || vertical.defaultMonthlyRevenue;
  return {
    base,
    low: Math.round(base * (1 + vertical.upliftMin)),
    high: Math.round(base * (1 + vertical.upliftMax)),
    upliftPctMin: Math.round(vertical.upliftMin * 100),
    upliftPctMax: Math.round(vertical.upliftMax * 100),
  };
}
