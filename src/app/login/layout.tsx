import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(
  'Login',
  'Masuk dengan nomor WhatsApp (OTP) — admin outlet, staff, atau pelanggan.',
  { path: '/login', keywords: ['login', 'OTP', 'WhatsApp'] },
);

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
