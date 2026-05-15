import type { TutorialPageDef } from '@/lib/tutorialContent';
import { SITE_NAME, getSiteOrigin } from '@/lib/site';

/** JSON-LD Article untuk halaman panduan (server). */
export default function JsonLdArticleTutorial({ page }: { page: TutorialPageDef }) {
  const url = `${getSiteOrigin()}/tutorial/${page.slug}`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: page.title,
    description: page.lead,
    url,
    inLanguage: 'id-ID',
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteOrigin(),
    },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
