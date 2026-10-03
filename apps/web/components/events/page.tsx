import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "../../lib/i18n/segments";
import { sectionAlternates } from "../../lib/i18n/metadata";
import { EventsSection, eventsConfigured, loadEvents } from "./content";
import styles from "./events-showcase.module.css";

/** Page-only empty message. EventsSection stays null when empty, so home hides the block. */
const EMPTY: Readonly<Record<Locale, string>> = { en: "No events yet.", tr: "Henüz etkinlik yok." };

export type EventsPageProps = { params: Promise<{ locale: string }> };
export function eventsParams(locale: string, expected: Locale) {
  return eventsConfigured() && locale === expected ? [{}] : [];
}
export async function eventsMetadata(params: EventsPageProps['params'], expected: Locale): Promise<Metadata> {
  if ((await params).locale !== expected || !eventsConfigured()) notFound();
  return { title: `${expected === 'tr' ? 'Etkinlikler' : 'Events'} | KUASAR`, alternates: sectionAlternates('events', expected) };
}
/** The route exists with zero events: an explicit empty message, never a bare heading or a 404. */
export async function EventsPage({ params, locale }: EventsPageProps & { locale: Locale }) {
  if ((await params).locale !== locale || !eventsConfigured()) notFound();
  // loadEvents is React-cached, so EventsSection below reuses this same request.
  const { talks, nights } = await loadEvents(locale);
  return <><h1 className="px-6 pt-16 text-4xl font-semibold text-ink">{locale === 'tr' ? 'Etkinlikler' : 'Events'}</h1>
    {talks.length || nights.length ? <EventsSection locale={locale} /> : <p className={styles.empty}>{EMPTY[locale]}</p>}</>;
}
