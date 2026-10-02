import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "../../lib/i18n/segments";
import { sectionAlternates } from "../../lib/i18n/metadata";
import { loadSchedule, scheduleConfigured } from "./content";
import { SCHEDULE_COPY } from "./copy";
import { ScheduleCalendar } from "./schedule-calendar";

export type SchedulePageProps = { params: Promise<{ locale: string }> };
export function scheduleParams(locale: string, expected: Locale) {
  return scheduleConfigured() && locale === expected ? [{}] : [];
}
export async function scheduleMetadata(params: SchedulePageProps["params"], expected: Locale): Promise<Metadata> {
  if ((await params).locale !== expected || !scheduleConfigured()) notFound();
  return { title: `${SCHEDULE_COPY[expected].heading} | KUASAR`, alternates: sectionAlternates("schedule", expected) };
}
/** The route exists with zero events: an explicit empty message, never a 404. */
export async function SchedulePage({ params, locale }: SchedulePageProps & { locale: Locale }) {
  if ((await params).locale !== locale || !scheduleConfigured()) notFound();
  const events = await loadSchedule(locale);
  return <>
    <h1 className="px-6 pt-16 text-4xl font-semibold text-ink">{SCHEDULE_COPY[locale].heading}</h1>
    <ScheduleCalendar locale={locale} events={events} />
  </>;
}
