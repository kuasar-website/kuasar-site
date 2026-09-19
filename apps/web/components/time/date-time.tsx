"use client";

import { formatDate, parseISO, type TimeLocale, type TimeRange } from "../../lib/time/date";
import { useTimeState } from "../../lib/time/use-time";

// Fallbacks match design/tokens.md until the foundation installs the full theme.
const colors = {
  live: "var(--color-state-live, oklch(0.70 0.19 45))",
  upcoming: "var(--color-state-upcoming, oklch(0.75 0.15 58))",
  past: "var(--color-state-past, var(--color-ink-muted, oklch(0.70 0.010 260)))",
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
