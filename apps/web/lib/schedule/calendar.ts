/**
 * Pure calendar arithmetic for the Schedule (openspec/changes/schedule-calendar,
 * design.md D2–D4). Every function receives instants as arguments; none reads
 * a clock. "Now" comes only from the browser via lib/time/use-time.ts.
 *
 * Placement and formatting use Europe/Istanbul, whatever the visitor's device
 * zone: the events happen in Istanbul. Calendar-day keys (`YYYY-MM-DD`) are
 * plain calendar dates, so day-to-day arithmetic on them is done in UTC, where
 * every day has exactly 24 hours.
 */
import type { TimeLocale } from "../time/date.ts";

export const CALENDAR_TIME_ZONE = "Europe/Istanbul";
const DAY_MS = 86_400_000;

/** `month` is 1–12. */
export type MonthKey = { readonly year: number; readonly month: number };
export type DayCell = { readonly key: string; readonly inMonth: boolean };

const keyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CALENDAR_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

/** The Istanbul calendar day containing an instant, as `YYYY-MM-DD`. */
export function istanbulDayKey(instant: number): string {
  const parts = Object.fromEntries(keyFormat.formatToParts(instant).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function monthOfDay(key: string): MonthKey {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) };
}

/** The Istanbul month containing an instant. */
export function monthOf(instant: number): MonthKey {
  return monthOfDay(istanbulDayKey(instant));
}

export function monthKeyString({ year, month }: MonthKey): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function sameMonth(a: MonthKey, b: MonthKey): boolean {
  return a.year === b.year && a.month === b.month;
}

export function addMonths({ year, month }: MonthKey, delta: number): MonthKey {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function dayToUTC(key: string): number {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function utcToDay(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function addDays(key: string, delta: number): string {
  return utcToDay(dayToUTC(key) + delta * DAY_MS);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: string): number {
  return (new Date(dayToUTC(key)).getUTCDay() + 6) % 7;
}

export function daysInMonth({ year, month }: MonthKey): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function firstDay(month: MonthKey): string {
  return `${monthKeyString(month)}-01`;
}

export function lastDay(month: MonthKey): string {
  return `${monthKeyString(month)}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

/** Monday-first weeks covering the month; padding cells belong to adjacent months. */
export function monthMatrix(month: MonthKey): DayCell[][] {
  const start = addDays(firstDay(month), -weekdayIndex(firstDay(month)));
  const end = addDays(lastDay(month), 6 - weekdayIndex(lastDay(month)));
  const prefix = monthKeyString(month);
  const weeks: DayCell[][] = [];
  for (let key = start; key <= end; key = addDays(key, 1)) {
    if (weekdayIndex(key) === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ key, inMonth: key.startsWith(prefix) });
  }
  return weeks;
}

/**
 * Istanbul days an interval occupies: half-open `[start, end)`. No end, or an
 * end equal to the start, is an instant on its start day; an end exactly at an
 * Istanbul midnight does not spill into the next day. Callers must reject a
 * reversed interval before calling (lib/schedule/data.ts fails the build).
 */
export function daysOccupied(start: number, end: number | null): string[] {
  const first = istanbulDayKey(start);
  if (end === null || end <= start) return [first];
  const last = istanbulDayKey(end - 1);
  const days: string[] = [];
  for (let key = first; key <= last; key = addDays(key, 1)) days.push(key);
  return days;
}

export function overlapsMonth(days: readonly string[], month: MonthKey): boolean {
  const prefix = monthKeyString(month);
  return days.some((day) => day.startsWith(prefix));
}

// --- Locale formatting. Calendar-day keys are dates, so they format in UTC;
// --- instants format in Istanbul. Neither depends on the device zone.

export function formatMonth(month: MonthKey, locale: TimeLocale): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
    .format(Date.UTC(month.year, month.month - 1, 1));
}

export function formatDay(key: string, locale: TimeLocale): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(dayToUTC(key));
}

export function formatTime(instant: number, locale: TimeLocale): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: CALENDAR_TIME_ZONE,
  }).format(instant);
}

/** Weekday names, Monday first. 2024-01-01 was a Monday. */
export function weekdayNames(locale: TimeLocale, width: "long" | "short" = "long"): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) => format.format(Date.UTC(2024, 0, 1 + i)));
}
