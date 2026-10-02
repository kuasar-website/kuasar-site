import type { Locale } from "../../lib/i18n/segments";
import { formatDay, formatTime, istanbulDayKey } from "../../lib/schedule/calendar";
import type { ScheduleEvent } from "../../lib/schedule/data";
import type { TimeState } from "../../lib/time/date";
import actionStyles from "../ui/action-link.module.css";
import { SCHEDULE_COPY } from "./copy";
import styles from "./schedule.module.css";

/** A validated event plus the instants and Istanbul days derived from it. */
export type PlacedEvent = ScheduleEvent & { start: number; end: number | null; days: readonly string[] };

export const agendaId = (id: string) => `schedule-event-${id}`;

function When({ event, locale }: { event: PlacedEvent; locale: Locale }) {
  const startDay = istanbulDayKey(event.start);
  const start = `${formatDay(startDay, locale)} · ${formatTime(event.start, locale)}`;
  if (event.end === null || event.endsAt === null || event.end === event.start) {
    return <p className={styles.when}><time dateTime={event.startsAt}>{start}</time></p>;
  }
  const endDay = istanbulDayKey(event.end);
  const end = endDay === startDay
    ? formatTime(event.end, locale)
    : `${formatDay(endDay, locale)} · ${formatTime(event.end, locale)}`;
  return <p className={styles.when}>
    <time dateTime={event.startsAt}>{start}</time>{" – "}<time dateTime={event.endsAt}>{end}</time>
  </p>;
}

/**
 * One agenda entry. `state` is null on the server and during hydration, so the
 * neutral form carries no state text, attribute or styling (ADR 0001 §3).
 */
export function AgendaEvent({ event, locale, state }: { event: PlacedEvent; locale: Locale; state: TimeState | null }) {
  const copy = SCHEDULE_COPY[locale];
  return <article id={agendaId(event.id)} tabIndex={-1} className={styles.event}
    data-type={event.type} data-time-state={state ?? undefined}>
    <p className={styles.meta}>
      <span className={styles.type} data-type={event.type}>{copy.types[event.type]}</span>
      {state === "live" && <span className={styles.live}>{copy.liveBadge}</span>}
      {state && state !== "live" && <span className={styles["sr-only"]}>{copy.state[state]}</span>}
    </p>
    <h3 className={styles.title} lang={event.contentLocale}>{event.title}</h3>
    <When event={event} locale={locale} />
    {event.location && <p className={styles.location} lang={event.contentLocale}>{event.location}</p>}
    {event.description && <p className={styles.description} lang={event.contentLocale}>{event.description}</p>}
    {event.url && <a href={event.url} className={`${actionStyles.action} ${actionStyles.text}`}>
      <span>{copy.details}<span className={styles["sr-only"]} lang={event.contentLocale}>: {event.title}</span></span>
      <span aria-hidden="true" className={actionStyles.arrow}>→</span>
    </a>}
  </article>;
}

export function AgendaList({ events, locale, states }: {
  events: readonly PlacedEvent[]; locale: Locale; states?: ReadonlyMap<string, TimeState | null>;
}) {
  return <ul className={styles.agenda}>
    {events.map((event) => <li key={event.id}>
      <AgendaEvent event={event} locale={locale} state={states?.get(event.id) ?? null} />
    </li>)}
  </ul>;
}
