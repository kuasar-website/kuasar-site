import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "../../lib/i18n/segments";
import { sectionAlternates } from "../../lib/i18n/metadata";
import { loadNews, newsConfigured } from "./content";
import { NEWS_COPY } from "./copy";
import { NewsList } from "./news-list";

export type NewsPageProps = { params: Promise<{ locale: string }> };
export function newsParams(locale: string, expected: Locale) {
  return newsConfigured() && locale === expected ? [{}] : [];
}
export async function newsMetadata(params: NewsPageProps["params"], expected: Locale): Promise<Metadata> {
  if ((await params).locale !== expected || !newsConfigured()) notFound();
  return { title: `${NEWS_COPY[expected].heading} | KUASAR`, alternates: sectionAlternates("news", expected) };
}
/** The route exists with zero announcements: an explicit empty message, never a 404. */
export async function NewsPage({ params, locale }: NewsPageProps & { locale: Locale }) {
  if ((await params).locale !== locale || !newsConfigured()) notFound();
  const items = await loadNews(locale);
  return <>
    <h1 className="px-6 pt-16 text-4xl font-semibold text-ink">{NEWS_COPY[locale].heading}</h1>
    <NewsList locale={locale} items={items} />
  </>;
}
