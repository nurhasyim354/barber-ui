import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kontak — Booking App',
  description: 'Hubungi nh-apps untuk pertanyaan produk Booking App, partnership, dan dukungan.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
