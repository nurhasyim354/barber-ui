import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLdArticleTutorial from '@/components/seo/JsonLdArticleTutorial';
import { pageMetadata } from '@/lib/seo';
import { TUTORIAL_BY_SLUG, TUTORIAL_SLUGS, isTutorialSlug } from '@/lib/tutorialContent';
import TutorialSlugClient from './TutorialSlugClient';

export function generateStaticParams() {
  return TUTORIAL_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  if (!isTutorialSlug(params.slug)) {
    return { title: 'Panduan' };
  }
  const p = TUTORIAL_BY_SLUG[params.slug];
  return pageMetadata(p.title, p.lead, {
    path: `/tutorial/${params.slug}`,
    keywords: [params.slug.replace(/-/g, ' '), 'tutorial', 'panduan'],
  });
}

export default function TutorialSlugPage({ params }: { params: { slug: string } }) {
  if (!isTutorialSlug(params.slug)) {
    notFound();
  }
  const page = TUTORIAL_BY_SLUG[params.slug];
  return (
    <>
      <JsonLdArticleTutorial page={page} />
      <TutorialSlugClient page={page} />
    </>
  );
}

