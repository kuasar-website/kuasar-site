export type TimeState = "past" | "live" | "upcoming";
export type TimeLocale = "tr" | "en";
export type TimeRange = { startsAt?: string | null; endsAt?: string | null };

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const instantPattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

/** Accept ISO calendar days or offset-qualified instants, never local-time guesses. */
export function parseISO(value?: string | null): number | null {
  if (!value || (!dayPattern.test(value) && !instantPattern.test(value))) return null;
  const day = value.slice(0, 10);
  const midnight = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== day) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Caller supplies browser time; null is the permanent server snapshot. */
export function classifyTime(range: TimeRange, now: number | null): TimeState | null {
  if (now === null || !Number.isFinite(now)) return null;
  const start = parseISO(range.startsAt);
  if (start === null) return null;
  const end = range.endsAt == null
    ? start + (dayPattern.test(range.startsAt!) ? 86_400_000 : 0)
    : parseISO(range.endsAt);
  if (end === null || end < start) return null;
  if (now < start) return "upcoming";
  return now < end ? "live" : "past";
}

export function formatDate(value: string, locale: TimeLocale, timeZone = "UTC"): string {
  const instant = parseISO(value);
  if (instant === null) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "long", day: "numeric",
    // A calendar date is not an instant in the viewer's timezone.
    timeZone: dayPattern.test(value) ? "UTC" : timeZone,
  }).format(instant);
}
