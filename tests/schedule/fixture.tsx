import { ScheduleCalendar } from "../../apps/web/components/schedule/schedule-calendar";
import type { ScheduleEvent } from "../../apps/web/lib/schedule/data";

// Synthetic records exist only in tests. Production records come from Strapi.
type Locale = "en" | "tr";
const base = (locale: Locale, id: string, extra: Partial<ScheduleEvent>): ScheduleEvent => ({
  id, type: "talk", startsAt: "2026-11-07T07:00:00.000Z", endsAt: null, location: null, description: null, url: null,
  contentLocale: locale, title: `${locale === "tr" ? "Etkinlik" : "Event"} ${id}`, ...extra,
});

export function dataset(locale: Locale, set: string): ScheduleEvent[] {
  if (set === "zero") return [];
  if (set === "one") return [base(locale, "only", {})];
  if (set === "many") return Array.from({ length: 50 }, (_, i) => base(locale, `m${i}`, {
    type: (["talk", "screening", "summit", "workshop", "other"] as const)[i % 5],
    // Five events per day across ten November days: exercises "+N more".
    startsAt: new Date(Date.UTC(2026, 10, 2 + Math.floor(i / 5), 6 + (i % 5))).toISOString(),
  }));
  return [
    base(locale, "oct", { type: "other", startsAt: "2026-10-15T15:00:00.000Z" }),
    base(locale, "multi", { type: "summit", startsAt: "2026-11-06T07:00:00.000Z", endsAt: "2026-11-08T15:00:00.000Z",
      title: "Galactic Summit", location: locale === "tr" ? "Koç Üniversitesi" : "Koç University" }),
    base(locale, "talk", { endsAt: "2026-11-07T09:00:00.000Z", url: "https://example.org/talk",
      description: locale === "tr" ? "Roket motorları üzerine." : "On rocket engines." }),
    base(locale, "workshop", { type: "workshop", startsAt: "2026-11-07T12:00:00.000Z" }),
    // 22:30Z on 30 November is 01:30 on 1 December in Istanbul.
    base(locale, "late", { type: "screening", startsAt: "2026-11-30T22:30:00.000Z", endsAt: "2026-12-01T00:30:00.000Z" }),
    // Turkish route falls back to English text for this one.
    { ...base(locale, "fallback", { startsAt: "2026-12-12T16:00:00.000Z", title: "English-only event" }), contentLocale: "en" },
  ];
}

export function Fixture({ locale, events }: { locale: Locale; events: ScheduleEvent[] }) {
  return <main lang={locale}>
    <h1>{locale === "tr" ? "Takvim" : "Schedule"}</h1>
    <ScheduleCalendar locale={locale} events={events} />
  </main>;
}
