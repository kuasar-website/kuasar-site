import type { ReactElement } from "react";
import type { Locale } from "../../lib/i18n/segments";
import { parseISO } from "../../lib/time/date";
import { DateTime } from "../time/date-time";
import { ActionLink } from "../ui/action-link";
import styles from "./events-showcase.module.css";

// Presentation data only. A server adapter supplies localized CMS text and validated
// MediaImage elements; these types are not a second content store or CMS schema.
type EventView = {
  id: string;
  title: string;
  date?: string | null;
  contentLocale?: Locale;
};

export type StellarTalkView = EventView & {
  eventNumber: number;
  speakerName: string;
  speakerPortrait?: ReactElement | null;
  insight?: string | null;
  watchUrl?: string | null;
  readUrl?: string | null;
};

export type EventPhoto = { id: string; element: ReactElement };
export type NebulaNightView = EventView & {
  description?: string | null;
  filmTitle?: string | null;
  photos: readonly [EventPhoto, ...EventPhoto[]];
};

const copy = {
  en: { watch: "Watch talk", read: "Read more", date: "Date to be announced" },
  tr: { watch: "Konuşmayı izle", read: "Devamını oku", date: "Tarih açıklanacak" },
};

function newestFirst<T extends EventView>(entries: readonly T[]): T[] {
  // Fixed dates only: no server clock, and missing dates follow dated records.
  return [...entries].sort((a, b) => {
    const left = a.date ? parseISO(a.date) : null;
    const right = b.date ? parseISO(b.date) : null;
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return right - left;
  });
}

function EventDate({ date, locale }: { date?: string | null; locale: Locale }) {
  return <p className={styles.date}>{date
    ? <DateTime startsAt={date} locale={locale} />
    : copy[locale].date}</p>;
}

export function EventsShowcase({ locale, talks, nights, id = "events" }: {
  locale: Locale;
  talks: readonly StellarTalkView[];
  nights: readonly NebulaNightView[];
  /** Unique page-level prefix if a page contains more than one showcase. */
  id?: string;
}) {
  if (!talks.length && !nights.length) return null;
  for (const night of nights) {
    if (!night.photos.length) throw new Error(`Nebula Night ${night.id}: at least one validated photo is required`);
  }
  return <div id={id} lang={locale} className={styles.showcase}>
    {talks.length > 0 && <section aria-labelledby={`${id}-talks`}>
      <h2 id={`${id}-talks`} className={styles.heading} lang="en">Stellar Talk</h2>
      <ul className={styles.list}>
        {newestFirst(talks).map((talk) => <li key={talk.id}>
          <article className={styles.talk}>
            {talk.speakerPortrait && <div className={styles.portrait}>{talk.speakerPortrait}</div>}
            <div className={styles.editorial}>
              <p className={styles.number} lang="en">Stellar Talk #{talk.eventNumber}</p>
              <h3 className={styles.title} lang={talk.contentLocale ?? locale}>{talk.title}</h3>
              <p className={styles.speaker}>{talk.speakerName}</p>
              <EventDate date={talk.date} locale={locale} />
              {talk.insight && <blockquote className={styles.insight} lang={talk.contentLocale ?? locale}>{talk.insight}</blockquote>}
              {(talk.watchUrl || talk.readUrl) && <div className={styles.actions}>
                {talk.watchUrl && <ActionLink variant="text" href={talk.watchUrl}>{copy[locale].watch}</ActionLink>}
                {talk.readUrl && <ActionLink variant="text" href={talk.readUrl}>{copy[locale].read}</ActionLink>}
              </div>}
            </div>
          </article>
        </li>)}
      </ul>
    </section>}
    {nights.length > 0 && <section aria-labelledby={`${id}-nights`}>
      <h2 id={`${id}-nights`} className={styles.heading} lang="en">Nebula Night</h2>
      <ul className={styles.list}>
        {newestFirst(nights).map((night) => <li key={night.id}>
          <article className={styles.night}>
            <div className={styles.gallery}>
              {night.photos.map((photo) => <div className={styles.photo} key={photo.id}>{photo.element}</div>)}
            </div>
            <div className={styles["night-copy"]}>
              <h3 className={styles.title} lang={night.contentLocale ?? locale}>{night.title}</h3>
              <EventDate date={night.date} locale={locale} />
              {night.filmTitle && <p className={styles.film}><cite>{night.filmTitle}</cite></p>}
              {night.description && <p className={styles.description} lang={night.contentLocale ?? locale}>{night.description}</p>}
            </div>
          </article>
        </li>)}
      </ul>
    </section>}
  </div>;
}
