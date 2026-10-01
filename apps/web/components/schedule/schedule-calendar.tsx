"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Locale } from "../../lib/i18n/segments";
import {
  addDays, addMonths, daysInMonth, daysOccupied, firstDay, formatDay, formatMonth, istanbulDayKey,
  monthKeyString, monthMatrix, monthOf, monthOfDay, overlapsMonth, sameMonth, weekdayIndex, weekdayNames,
  type MonthKey,
} from "../../lib/schedule/calendar";
import { SCHEDULE_EVENT_TYPES, type ScheduleEvent } from "../../lib/schedule/data";
import { classifyTime, parseISO, type TimeState } from "../../lib/time/date";
import { useBrowserNow } from "../../lib/time/use-time";
import actionStyles from "../ui/action-link.module.css";
import { SCHEDULE_COPY } from "./copy";
import { agendaId, AgendaList, type PlacedEvent } from "./schedule-agenda";
import styles from "./schedule.module.css";

const CHIP_LIMIT = 3;

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

function byDay(events: readonly PlacedEvent[]) {
  const days = new Map<string, PlacedEvent[]>();
  for (const event of events) {
    for (const day of event.days) {
      if (!days.has(day)) days.set(day, []);
      days.get(day)!.push(event);
    }
  }
  return days;
}

/** Visible month: following the browser's current month, or one the visitor chose. */
type Navigation = { follow: true } | { follow: false; month: MonthKey };

/**
 * The Schedule. Server HTML and the first client render are the neutral
 * baseline: every event, chronological, grouped by month, with no "now".
 * After mount the browser clock selects the month and each event's state.
 * See openspec/changes/schedule-calendar/design.md D1, D5 and D9.
 */
export function ScheduleCalendar({ locale, events }: { locale: Locale; events: readonly ScheduleEvent[] }) {
  const copy = SCHEDULE_COPY[locale];
  const placed = useMemo(() => placeEvents(events), [events]);
  const now = useBrowserNow();
  const [navigation, setNavigation] = useState<Navigation>({ follow: true });
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const grid = useRef<HTMLTableElement>(null);

  const today = now === null ? null : istanbulDayKey(now);
  const current = today === null ? null : monthOfDay(today);
  const visible = current === null ? null : navigation.follow ? current : navigation.month;
  const visibleKey = visible === null ? null : monthKeyString(visible);

  // Recomputed per month, not per clock tick.
  const view = useMemo(() => {
    if (visibleKey === null) return null;
    const month = monthOfDay(`${visibleKey}-01`);
    const inMonth = placed.filter((event) => overlapsMonth(event.days, month));
    return { month, weeks: monthMatrix(month), inMonth, days: byDay(inMonth) };
  }, [placed, visibleKey]);

  useEffect(() => {
    if (focusRequest) grid.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
  }, [focusRequest]);

  const live = <p className={styles["sr-only"]} aria-live="polite">
    {view === null ? "" : copy.showing(formatMonth(view.month, locale))}
  </p>;

  if (now === null || view === null || today === null || current === null) {
    return <div className={styles.schedule}>
      <p className={styles.note}>{copy.timezoneNote}</p>
      <div className={styles["grid-slot"]}>{live}</div>
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

  const monthLabel = formatMonth(view.month, locale);
  const prefix = monthKeyString(view.month);
  const active = chosenDay?.startsWith(prefix) ? chosenDay
    : today.startsWith(prefix) ? today : firstDay(view.month);
  const states = new Map<string, TimeState | null>(view.inMonth.map((event) => [event.id, classifyTime(event, now)]));

  const show = (month: MonthKey) => setNavigation(sameMonth(month, current) ? { follow: true } : { follow: false, month });
  const moveTo = (day: string) => {
    setChosenDay(day);
    const month = monthOfDay(day);
    if (!sameMonth(month, view.month)) show(month);
    setFocusRequest((n) => n + 1);
  };
  const shiftMonth = (day: string, delta: number) => {
    const target = addMonths(monthOfDay(day), delta);
    const date = Math.min(Number(day.slice(8, 10)), daysInMonth(target));
    return `${monthKeyString(target)}-${String(date).padStart(2, "0")}`;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const keys: Record<string, () => string> = {
      ArrowLeft: () => addDays(day, -1), ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7), ArrowDown: () => addDays(day, 7),
      Home: () => addDays(day, -weekdayIndex(day)), End: () => addDays(day, 6 - weekdayIndex(day)),
      PageUp: () => shiftMonth(day, -1), PageDown: () => shiftMonth(day, 1),
    };
    const target = keys[event.key];
    if (!target) return;
    event.preventDefault();
    moveTo(target());
  };
  const openDay = (day: string) => {
    setChosenDay(day);
    const first = view.days.get(day)?.[0];
    if (first) document.getElementById(agendaId(first.id))?.focus();
  };

  const longNames = weekdayNames(locale);
  const shortNames = weekdayNames(locale, "short");
  const control = `${actionStyles.action} ${actionStyles.secondary}`;

  return <div className={styles.schedule}>
    <p className={styles.note}>{copy.timezoneNote}</p>
    <div className={styles["grid-slot"]}>
      {live}
      <div className={styles.controls} role="group" aria-label={copy.controls}>
        <button type="button" className={control} aria-label={copy.previousMonth}
          onClick={() => show(addMonths(view.month, -1))}><span aria-hidden="true">‹</span></button>
        <button type="button" className={control} aria-label={copy.nextMonth}
          onClick={() => show(addMonths(view.month, 1))}><span aria-hidden="true">›</span></button>
        <button type="button" className={control}
          onClick={() => { setChosenDay(null); setNavigation({ follow: true }); }}><span>{copy.today}</span></button>
      </div>
      <ul className={styles.legend} aria-label={copy.legend}>
        {SCHEDULE_EVENT_TYPES.map((type) => <li key={type} className={styles["legend-item"]}>
          <span className={styles.swatch} data-type={type} aria-hidden="true" />
          <span className={styles.mark} aria-hidden="true">{copy.typeMarks[type]}</span>
          <span>{copy.types[type]}</span>
        </li>)}
      </ul>
      <table ref={grid} className={styles.grid}>
        <caption className={styles.caption}>{monthLabel}</caption>
        <thead><tr>{longNames.map((name, i) => <th key={name} scope="col" className={styles.weekday}>
          <span aria-hidden="true">{shortNames[i]}</span><span className={styles["sr-only"]}>{name}</span>
        </th>)}</tr></thead>
        <tbody>{view.weeks.map((week) => <tr key={week[0].key}>{week.map(({ key, inMonth }) => {
          if (!inMonth) return <td key={key} className={styles.outside} />;
          const dayEvents = view.days.get(key) ?? [];
          const types = [...new Set(dayEvents.map((event) => event.type))];
          const label = `${formatDay(key, locale)}, ${copy.events(dayEvents.length)}`
            + (types.length ? `: ${types.map((type) => copy.types[type]).join(", ")}` : "");
          return <td key={key} className={styles.day}>
            <button type="button" className={styles["day-button"]} tabIndex={key === active ? 0 : -1}
              aria-label={label} aria-current={key === today ? "date" : undefined}
              data-has-events={dayEvents.length ? "" : undefined}
              onKeyDown={(event) => onKeyDown(event, key)} onClick={() => openDay(key)}>
              <span className={styles["day-number"]} aria-hidden="true">{Number(key.slice(8, 10))}</span>
              {dayEvents.length > 0 && <span className={styles.chips} aria-hidden="true">
                {dayEvents.slice(0, CHIP_LIMIT).map((event) => <span key={event.id} className={styles.chip} data-type={event.type}>
                  <span className={styles["chip-type"]}>{copy.types[event.type]}</span>
                  <span lang={event.contentLocale}>{event.title}</span>
                </span>)}
                {dayEvents.length > CHIP_LIMIT && <span className={styles.more}>{copy.more(dayEvents.length - CHIP_LIMIT)}</span>}
              </span>}
              {dayEvents.length > 0 && <span className={styles.marks} aria-hidden="true">
                {types.map((type) => {
                  const count = dayEvents.filter((event) => event.type === type).length;
                  return <span key={type} className={styles.chip} data-type={type}>{copy.typeMarks[type]}{count > 1 ? count : ""}</span>;
                })}
              </span>}
            </button>
          </td>;
        })}</tr>)}</tbody>
      </table>
    </div>
    <section aria-label={monthLabel} className={styles.month}>
      <h2 className={styles["month-heading"]}>{monthLabel}</h2>
      {view.inMonth.length === 0
        ? <p className={styles.empty}>{placed.length === 0 ? copy.empty : copy.emptyMonth(monthLabel)}</p>
        : <AgendaList events={view.inMonth} locale={locale} states={states} />}
    </section>
  </div>;
}
