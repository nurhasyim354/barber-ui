import type { Metadata } from 'next';
import { Italianno } from 'next/font/google';
import JsonLdOrganization from '@/components/seo/JsonLdOrganization';
import HomeClient from './home-client';
import { pageMetadata } from '@/lib/seo';
import { SITE_DESCRIPTION } from '@/lib/site';

/** Giambattista (Wiescher Design) tidak tersedia gratis untuk web; Italianno ≈ nuansa script klasik Italia pada hero. */
const marketingHeroScript = Italianno({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = pageMetadata(
  'Platform booking & antrian multi-outlet',
  SITE_DESCRIPTION,
  { path: '/', keywords: ['beranda', 'landing', 'SaaS'] },
);

export default function HomePage() {
  return (
    <>
      <JsonLdOrganization />
      <HomeClient marketingHeroHeadingFontFamily={marketingHeroScript.style.fontFamily} />
    </>
  );
}
