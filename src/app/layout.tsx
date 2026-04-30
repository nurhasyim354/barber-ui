import type { Metadata } from 'next';
import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';

export const metadata: Metadata = {
  title: 'Booking App',
  description:
    'Platform booking dan antrian untuk klinik, barbershop, bengkel, dan bisnis lainnya. Daftar tenant, kelola outlet, kasir, dan laporan.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
