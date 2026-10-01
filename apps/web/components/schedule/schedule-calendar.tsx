"use client";

import { useMemo } from "react";
import type { Locale } from "../../lib/i18n/segments";
import { daysOccupied, formatMonth, monthKeyString, monthOf, type MonthKey } from "../../lib/schedule/calendar";
import type { ScheduleEvent } from "../../lib/schedule/data";
import { parseISO } from "../../lib/time/date";
import { SCHEDULE_COPY } from "./copy";
import { AgendaList, type PlacedEvent } from "./schedule-agenda";
import styles from "./schedule.module.css";

export function placeEvents(events: readonly ScheduleEvent[]): PlacedEvent[] {
  return events.map((event) => {
    // lib/schedule/data.ts has already rejected unparseable or reversed dates.
    const start = parseISO(event.startsAt)!;
    const end = event.endsAt === null ? null : parseISO(event.endsAt)!;
    return { ...event, start, end, days: daysOccupied(start, end) };
  });
}

/** Neutral grouping: a pure function of the data, never of "now". */
function byStartMonth(events: readonly PlacedEvent[]) {
  const groups = new Map<string, { month: MonthKey; events: PlacedEvent[] }>();
  for (const event of events) {
    const month = monthOf(event.start);
    const key = monthKeyString(month);
    if (!groups.has(key)) groups.set(key, { month, events: [] });
    groups.get(key)!.events.push(event);
  }
  return [...groups.values()];
}

/**
 * The Schedule. Server HTML and the first client render are the neutral
 * baseline: every event, chronological, grouped by month, with no "now".
 * See openspec/changes/schedule-calendar/design.md D1.
 */
export function ScheduleCalendar({ locale, events }: { locale: Locale; events: readonly ScheduleEvent[] }) {
  const copy = SCHEDULE_COPY[locale];
  const placed = useMemo(() => placeEvents(events), [events]);
  return <div className={styles.schedule}>
    <p className={styles.note}>{copy.timezoneNote}</p>
    {placed.length === 0
      ? <p className={styles.empty}>{copy.empty}</p>
      : byStartMonth(placed).map(({ month, events: group }) => {
        const label = formatMonth(month, locale);
        return <section key={monthKeyString(month)} aria-label={label} className={styles.month}>
          <h2 className={styles["month-heading"]}>{label}</h2>
          <AgendaList events={group} locale={locale} />
        </section>;
      })}
  </div>;
}
