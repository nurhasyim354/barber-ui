import type { MetadataRoute } from 'next';
import { TUTORIAL_SLUGS } from '@/lib/tutorialContent';
import { getSiteOrigin } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteOrigin();
  const now = new Date();

  const staticPaths = ['', '/login', '/daftar', '/contact', '/tutorial'].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }));

  const tutorialArticles = TUTORIAL_SLUGS.map((slug) => ({
    url: `${base}/tutorial/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPaths, ...tutorialArticles];
}
