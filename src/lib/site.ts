/** Nama produk (marketing & SEO). */
export const SITE_NAME = 'Bookita';

/** Slogan singkat (alt text, manifest, copy). */
export const SITE_TAGLINE = 'Booking & Antrian Made Easy';

/** Logo marketing di `public/` (JPEG). */
export const SITE_LOGO_PATH = '/bookita-logo.png';
export const SITE_ICON_PATH = '/favicon.ico';

/** Deskripsi default untuk meta tag & JSON-LD. */
export const SITE_DESCRIPTION =
  'Bookita — Booking & Antrian Made Easy. Platform booking dan antrian multi-outlet untuk restaurant, barbershop, salon, klinik, bengkel, laundry, spa, dan bisnis jasa lainnya. Antrian digital, POS, laporan, dan pengingat pelanggan.';

/** Kata kunci umum (bahasa Indonesia + istilah teknis singkat). */
export const SITE_KEYWORDS: string[] = [
  'Bookita',
  'booking online',
  'antrian digital',
  'SaaS booking',
  'sistem antrian',
  'multi tenant',
  'restaurant',
  'spa',
  'carwash',
  'ppob',
  'jasa umum',
  'barbershop',
  'salon',
  'klinik',
  'bengkel',
  'laundry',
  'POS',
  'kasir',
  'QRIS',
  'WhatsApp OTP',
];

/**
 * URL origin situs (tanpa trailing slash).
 * Produksi: set `NEXT_PUBLIC_SITE_URL` (mis. https://app.domain.com).
 */
export function getSiteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://booking.nh-apps.com').trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export function getMetadataBase(): URL {
  return new URL(`${getSiteOrigin()}/`);
}
