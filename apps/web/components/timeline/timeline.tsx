import type { ReactNode } from "react";
import styles from "./timeline.module.css";

export type TimelineEntry = {
  id: string;
  /** Valid ISO YYYY-MM-DD from the git content loader. */
  date: string;
  kind: "founding" | "competition" | "launch" | "milestone" | "recognition";
  title: string;
  body: ReactNode;
  image?: { src: string; alt: string; width: number; height: number };
  link?: string;
  /** Set by the adapter when the requested translation is incomplete. */
  availableTranslationHref?: string;
};

type Props = {
  /** Unique on the page; also prefixes accessible description IDs. */
  id: string;
  locale: "en" | "tr";
  entries: readonly TimelineEntry[];
  /** Supply only after the corresponding full timeline route exists. */
  viewMoreHref?: string;
};

const copy = {
  en: {
    title: "Timeline",
    now: "Now",
    direction: "Present → Past",
    instruction: "Scroll right to explore earlier milestones. Use the arrow keys when the timeline is focused, or swipe.",
    more: "Explore the timeline",
    entry: "Read more",
    incomplete: "This page is not yet available in English.",
    translation: "Read the available version",
    kinds: { founding: "Founding", competition: "Competition", launch: "Launch", milestone: "Milestone", recognition: "Recognition" },
  },
  tr: {
    title: "Zaman Çizelgesi",
    now: "Şimdi",
    direction: "Bugünden → Geçmişe",
    instruction: "Önceki dönüm noktalarını görmek için sağa kaydırın. Zaman çizelgesine odaklandığınızda ok tuşlarını kullanabilir veya parmağınızla kaydırabilirsiniz.",
    more: "Zaman çizelgesini keşfet",
    entry: "Devamını oku",
    incomplete: "Bu sayfa henüz Türkçe olarak mevcut değil.",
    translation: "Mevcut dilde oku",
    kinds: { founding: "Kuruluş", competition: "Yarışma", launch: "Fırlatma", milestone: "Dönüm noktası", recognition: "Takdir" },
  },
} as const;

/** Native baseline: no client boundary, clock, event handler or carousel library. */
export function Timeline({ id, locale, entries, viewMoreHref }: Props) {
  if (entries.length === 0) return null;
  const labels = copy[locale];
  // ISO date-only keys sort chronologically without a server clock or timezone.
  const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  return (
    <section className={styles.timeline} lang={locale} aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <h2 id={`${id}-title`}>{labels.title}</h2>
        {viewMoreHref && <a href={viewMoreHref}>{labels.more} <span aria-hidden="true">→</span></a>}
      </header>
      <p className={styles.direction}>{labels.now} · {labels.direction}</p>
      <p className={styles.instruction} id={`${id}-instructions`}>{labels.instruction}</p>
      <div className={styles.scroller} role="region" tabIndex={0}
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-instructions`}>
        <ol className={styles.entries} role="list">
          {ordered.map((entry) => (
            <li key={entry.id} className={styles.entry} tabIndex={0}>
              <p className={styles.meta}><time dateTime={entry.date}>{entry.date}</time> · {labels.kinds[entry.kind]}</p>
              <h3>{entry.title}</h3>
              {entry.image && (
                // Native lazy images keep this presentation independent of routing/image configuration.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image.src} alt={entry.image.alt} width={entry.image.width}
                  height={entry.image.height} loading="lazy" decoding="async" />
              )}
              <div className={styles.body}>{entry.body}</div>
              {entry.availableTranslationHref && (
                <p className={styles.notice}>{labels.incomplete}{" "}
                  <a href={entry.availableTranslationHref}>{labels.translation}</a>
                </p>
              )}
              {entry.link && <a href={entry.link}>{labels.entry}<span className={styles["sr-only"]}>: {entry.title}</span> <span aria-hidden="true">→</span></a>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
