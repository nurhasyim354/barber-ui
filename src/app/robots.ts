import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/site';

/** Jangan indeks area aplikasi (auth & dashboard); halaman marketing tetap boleh diindeks. */
export default function robots(): MetadataRoute.Robots {
  const host = getSiteOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/staff/',
          '/pos/',
          '/login',
          '/verify-phone-change',
          '/api/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  };
}
