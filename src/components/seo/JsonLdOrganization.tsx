import { SITE_DESCRIPTION, SITE_NAME, getSiteOrigin } from '@/lib/site';

/** JSON-LD Organization + WebSite untuk halaman beranda (server component). */
export default function JsonLdOrganization() {
  const url = getSiteOrigin();
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${url}/#organization`,
      name: SITE_NAME,
      url,
      description: SITE_DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      '@id': `${url}/#website`,
      name: SITE_NAME,
      url,
      description: SITE_DESCRIPTION,
      inLanguage: 'id-ID',
      publisher: { '@id': `${url}/#organization` },
    },
  ];

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': graph,
        }),
      }}
    />
  );
}
