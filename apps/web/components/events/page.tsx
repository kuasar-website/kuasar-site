import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "../../lib/i18n/segments";
import { sectionAlternates } from "../../lib/i18n/metadata";
import { EventsSection, eventsConfigured } from "./content";

export type EventsPageProps = { params: Promise<{ locale: string }> };
export function eventsParams(locale: string, expected: Locale) {
  return eventsConfigured() && locale === expected ? [{}] : [];
}
export async function eventsMetadata(params: EventsPageProps['params'], expected: Locale): Promise<Metadata> {
  if ((await params).locale !== expected || !eventsConfigured()) notFound();
  return { title: `${expected === 'tr' ? 'Etkinlikler' : 'Events'} | KUASAR`, alternates: sectionAlternates('events', expected) };
}
export async function EventsPage({ params, locale }: EventsPageProps & { locale: Locale }) {
  if ((await params).locale !== locale || !eventsConfigured()) notFound();
  return <><h1 className="px-6 pt-16 text-4xl font-semibold text-ink">{locale === 'tr' ? 'Etkinlikler' : 'Events'}</h1><EventsSection locale={locale} /></>;
}
