import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "../../lib/i18n/segments";
import { sectionAlternates } from "../../lib/i18n/metadata";
import { loadTimelineViews } from "./content";
import { Timeline } from "./timeline";

export type TimelinePageProps = { params: Promise<{ locale: string }> };

export async function timelineMetadata(params: TimelinePageProps["params"], expected: Locale): Promise<Metadata> {
  if ((await params).locale !== expected) notFound();
  const entries = await loadTimelineViews(expected);
  if (!entries.length) notFound();
  return {
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
    title: `${expected === "tr" ? "Zaman Çizelgesi" : "Timeline"} | KUASAR`,
    alternates: sectionAlternates("timeline", expected),
  };
}

export async function TimelinePage({ params, locale }: TimelinePageProps & { locale: Locale }) {
  if ((await params).locale !== locale) notFound();
  const entries = await loadTimelineViews(locale);
  if (!entries.length) notFound();
  return <Timeline id="timeline" headingLevel={1} locale={locale} entries={entries} />;
}

export function TimelineNotFound({ locale }: { locale: Locale }) {
  return <section lang={locale}>
    <h1>{locale === "tr" ? "Zaman çizelgesi bulunamadı" : "Timeline not found"}</h1>
    <p>{locale === "tr" ? "Henüz yayımlanmış bir zaman çizelgesi bulunmuyor." : "No timeline has been published yet."}</p>
  </section>;
}
