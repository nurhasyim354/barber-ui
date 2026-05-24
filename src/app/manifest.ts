import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_LOGO_PATH, SITE_ICON_PATH, SITE_NAME } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#3788D9',
    lang: 'id',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: SITE_ICON_PATH,
        sizes: '32x32',
        type: 'image/x-icon',
        purpose: 'any',
      },
    ],
  };
}
