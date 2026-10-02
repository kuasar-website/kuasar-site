import type { Locale } from "../../lib/i18n/segments";
import type { ScheduleEventType } from "../../lib/schedule/data";

/**
 * Every fixed Schedule string, verbatim from the "Bilingual interface copy"
 * requirement in openspec/changes/schedule-calendar/specs. All strings here,
 * including the narrow-grid type marks, were approved in bilingual review
 * (tasks.md 6.2, 2026-10-01). Change wording here only — no component holds its own copy. `month` is always produced by
 * formatMonth() in lib/schedule/calendar.ts.
 */
export type ScheduleCopy = {
  heading: string;
  timezoneNote: string;
  empty: string;
  emptyMonth: (month: string) => string;
  previousMonth: string;
  nextMonth: string;
  today: string;
  showing: (month: string) => string;
  liveBadge: string;
  state: { upcoming: string; past: string; live: string };
  types: Record<ScheduleEventType, string>;
  /** Short visible type marks for the compact (< md) grid; legend pairs each with its label. */
  typeMarks: Record<ScheduleEventType, string>;
  legend: string;
  events: (count: number) => string;
  more: (count: number) => string;
  details: string;
  controls: string;
};

export const SCHEDULE_COPY: Readonly<Record<Locale, ScheduleCopy>> = {
  en: {
    heading: "Schedule",
    timezoneNote: "All times are shown in Istanbul time (GMT+3).",
    empty: "No events are scheduled yet.",
    emptyMonth: (month) => `No events in ${month}.`,
    previousMonth: "Previous month",
    nextMonth: "Next month",
    today: "Today",
    showing: (month) => `Showing ${month}`,
    liveBadge: "Live now",
    state: { upcoming: "Upcoming", past: "Past", live: "Live now" },
    types: { talk: "Talk", screening: "Screening", summit: "Summit", workshop: "Workshop", other: "Other" },
    typeMarks: { talk: "T", screening: "Sc", summit: "Su", workshop: "W", other: "O" },
    legend: "Event types",
    events: (count) => `${count} ${count === 1 ? "event" : "events"}`,
    more: (count) => `+${count} more`,
    details: "Details",
    controls: "Month navigation",
  },
  tr: {
    heading: "Takvim",
    timezoneNote: "Tüm saatler İstanbul saatiyle (GMT+3) gösterilir.",
    empty: "Henüz planlanmış etkinlik yok.",
    emptyMonth: (month) => `${month} ayında etkinlik yok.`,
    previousMonth: "Önceki ay",
    nextMonth: "Sonraki ay",
    today: "Bugün",
    showing: (month) => `${month} gösteriliyor`,
    liveBadge: "Şimdi",
    state: { upcoming: "Yaklaşan", past: "Geçmiş", live: "Şimdi" },
    types: { talk: "Söyleşi", screening: "Gösterim", summit: "Zirve", workshop: "Atölye", other: "Diğer" },
    typeMarks: { talk: "S", screening: "G", summit: "Z", workshop: "A", other: "D" },
    legend: "Etkinlik türleri",
    events: (count) => `${count} etkinlik`,
    more: (count) => `+${count} daha`,
    details: "Ayrıntılar",
    controls: "Aylar arasında gezinme",
  },
};
