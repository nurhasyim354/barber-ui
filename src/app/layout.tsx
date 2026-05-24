import type { Metadata } from 'next';
import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';
import { rootMetadata } from '@/lib/seo';

export const metadata: Metadata = rootMetadata();

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
