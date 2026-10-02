"use client";

import type { Locale } from "../../lib/i18n/segments";
import { summitDayState } from "../../lib/summit/time";
import { useBrowserNow } from "../../lib/time/use-time";
import { SUMMIT_COPY } from "./copy";
import styles from "./summit.module.css";

/**
 * Upcoming / Live by Istanbul calendar day, from the browser clock only. Renders
 * nothing on the server, during hydration, after the Summit day, or without a
 * date — so static HTML never carries time-derived state (design.md D7).
 */
export function SummitDayBadge({ date, locale }: { date: string | null; locale: Locale }) {
  const state = summitDayState(date, useBrowserNow());
  if (state === null) return null;
  return <span className={styles.badge} data-time-state={state}>
    {state === "live" ? SUMMIT_COPY[locale].live : SUMMIT_COPY[locale].upcoming}
  </span>;
}
