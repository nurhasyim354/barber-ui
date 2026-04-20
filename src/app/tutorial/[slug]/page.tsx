import { notFound } from 'next/navigation';
import { TUTORIAL_BY_SLUG, TUTORIAL_SLUGS, isTutorialSlug } from '@/lib/tutorialContent';
import TutorialSlugClient from './TutorialSlugClient';

export function generateStaticParams() {
  return TUTORIAL_SLUGS.map((slug) => ({ slug }));
}

export default function TutorialSlugPage({ params }: { params: { slug: string } }) {
  if (!isTutorialSlug(params.slug)) {
    notFound();
  }
  const page = TUTORIAL_BY_SLUG[params.slug];
  return <TutorialSlugClient page={page} />;
}
