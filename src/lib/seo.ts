import type { Metadata } from 'next';
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  getMetadataBase,
  getSiteOrigin,
} from '@/lib/site';

/** Metadata dasar untuk root layout (bukan canonical per-rute). */
export function rootMetadata(): Metadata {
  const base = getMetadataBase();
  const origin = getSiteOrigin();
  const defaultTitle = `${SITE_NAME} — Platform booking & antrian multi-outlet`;

  const meta: Metadata = {
    metadataBase: base,
    title: {
      default: defaultTitle,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    authors: [{ name: SITE_NAME, url: origin }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      telephone: true,
      email: false,
      address: false,
    },
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      alternateLocale: ['id'],
      url: origin,
      siteName: SITE_NAME,
      title: defaultTitle,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: 'summary',
      title: defaultTitle,
      description: SITE_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    category: 'business',
  };

  const verify = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  if (verify) {
    meta.other = { 'google-site-verification': verify };
  }

  return meta;
}

/** Satu halaman marketing: title singkat (tanpa suffix template jika pakai `absolute`). */
export function pageMetadata(
  title: string,
  description?: string,
  opts?: { path?: string; keywords?: string[] },
): Metadata {
  const desc = description ?? SITE_DESCRIPTION;
  const path = opts?.path ?? '';
  const url = `${getSiteOrigin()}${path.startsWith('/') ? path : `/${path}`}`;

  return {
    title,
    description: desc,
    ...(opts?.keywords?.length ? { keywords: [...SITE_KEYWORDS, ...opts.keywords] } : {}),
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description: desc,
      url,
    },
    twitter: {
      title: `${title} · ${SITE_NAME}`,
      description: desc,
    },
    alternates: {
      canonical: url,
    },
  };
}
