import { formatDay, formatTime, istanbulDayKey } from "../../lib/schedule/calendar.ts";
import type { Locale } from "../../lib/i18n/segments.ts";
import { parseISO } from "../../lib/time/date.ts";

/**
 * An announcement's editorial date-time, in Europe/Istanbul whatever the visitor's device
 * zone, with the schedule's own formatters, e.g. "Monday, October 5, 2026 · 14:30" /
 * "5 Ekim 2026 Pazartesi · 14:30". The time makes same-day order visible. The value is
 * `announcementDate`, never Strapi's `publishedAt`.
 */
export function formatAnnouncementDate(value: string, locale: Locale): string {
  const instant = parseISO(value);
  if (instant === null) throw new Error(`Announcement: invalid announcementDate "${value}"`);
  return `${formatDay(istanbulDayKey(instant), locale)} · ${formatTime(instant, locale)}`;
}
