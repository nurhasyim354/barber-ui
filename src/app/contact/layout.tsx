import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = pageMetadata(
  'Kontak',
  `Hubungi nh-apps untuk pertanyaan produk ${SITE_NAME}, partnership, dan dukungan.`,
  { path: '/contact', keywords: ['kontak', 'dukungan', 'partnership'] },
);

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

