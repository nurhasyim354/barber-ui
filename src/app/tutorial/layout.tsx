import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(
  'Panduan & tutorial',
  'Panduan booking, dashboard outlet, staff, kasir POS, langganan, dan admin platform — langkah demi langkah.',
  { path: '/tutorial', keywords: ['tutorial', 'panduan', 'bantuan'] },
);

export default function TutorialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
