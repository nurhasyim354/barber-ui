import type { Metadata } from 'next';
import {
  SITE_DESCRIPTION,
  SITE_ICON_PATH,
  SITE_KEYWORDS,
  SITE_LOGO_PATH,
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
    icons: {
      icon: [{ url: SITE_ICON_PATH, type: 'image/x-icon', sizes: 'any' }],
      shortcut: [{ url: SITE_ICON_PATH, type: 'image/x-icon' }],
      apple: [{ url: SITE_ICON_PATH }],
    },
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
      images: [
        {
          url: SITE_LOGO_PATH,
          width: 1024,
          height: 682,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      description: SITE_DESCRIPTION,
      images: [SITE_LOGO_PATH],
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
      images: [{ url: SITE_LOGO_PATH, width: 1024, height: 682, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · ${SITE_NAME}`,
      description: desc,
      images: [SITE_LOGO_PATH],
    },
    alternates: {
      canonical: url,
    },
  };
}
