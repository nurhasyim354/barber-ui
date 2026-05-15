import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(
  'Daftar outlet',
  'Daftarkan bisnis Anda: barbershop, salon, klinik, bengkel, laundry, atau jasa lain. Mulai pakai sistem booking & antrian multi-outlet.',
  { path: '/daftar', keywords: ['daftar', 'registrasi tenant', 'bisnis'] },
);

export default function DaftarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
