"use client";

import { formatDate, parseISO, type TimeLocale, type TimeRange } from "../../lib/time/date";
import { useTimeState } from "../../lib/time/use-time";

const colors = {
  live: "var(--color-state-live)",
  upcoming: "var(--color-state-upcoming)",
  past: "var(--color-state-past)",
};

export function DateTime({ startsAt, endsAt, locale, timeZone = "UTC" }: TimeRange & {
  locale: TimeLocale;
  timeZone?: string;
}) {
  const state = useTimeState({ startsAt, endsAt });
  if (!startsAt) return null;
  return (
    <time
      dateTime={parseISO(startsAt) === null ? undefined : startsAt}
      data-time-state={state ?? undefined}
      style={state ? { color: colors[state] } : undefined}
    >
      {formatDate(startsAt, locale, timeZone)}
    </time>
  );
}
