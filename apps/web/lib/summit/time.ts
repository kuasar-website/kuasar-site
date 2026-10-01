/**
 * Summit Upcoming/Live by Istanbul calendar day (openspec/changes/galactic-summit
 * design.md D7). The schema has one datetime and no end, so "live" means "on the
 * Summit's Istanbul calendar day" — a fact already in the data, not an invented
 * duration. Pure: the caller supplies browser time; nothing here reads a clock.
 *
 * Follow-up: schedule-calendar (PR #35) has an identical Istanbul day-key helper;
 * consolidate both into one shared helper once both have merged.
 */
import { parseISO } from "../time/date.ts";

export const SUMMIT_TIME_ZONE = "Europe/Istanbul";
export type SummitDayState = "upcoming" | "live";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SUMMIT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

/** The Istanbul calendar day containing an instant, as `YYYY-MM-DD`, whatever the device zone. */
export function istanbulDayKey(instant: number): string {
  const parts = Object.fromEntries(dayKeyFormat.formatToParts(instant).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Before the Summit's Istanbul day → upcoming; on it → live; after it, or unknown → null. */
export function summitDayState(date: string | null | undefined, now: number | null): SummitDayState | null {
  if (now === null || !Number.isFinite(now)) return null;
  const instant = parseISO(date);
  if (instant === null) return null;
  const today = istanbulDayKey(now);
  const summitDay = istanbulDayKey(instant);
  if (today < summitDay) return "upcoming";
  return today === summitDay ? "live" : null;
}
