import type { Locale } from "../../lib/i18n/segments";
import type { NewsItem } from "../../lib/cms/announcements-data";
import { formatDate } from "../../lib/time/date";
import { MediaImage } from "../media/media-image";
import { MissionProse } from "../missions/mission-prose";
import { parseAnnouncementBody } from "./body";
import { NEWS_COPY } from "./copy";
import styles from "./news.module.css";

/**
 * The whole announcement is on the list page, each one an `<article>` with its slug as the
 * fragment id. There are deliberately no per-slug detail routes yet: every route under
 * [locale] uses dynamicParams = false, so a detail page for an announcement published after
 * the last deploy would 404 until the next one (publish-integration design D2). See
 * openspec/changes/announcements/design.md, "launch/news".
 */
export function NewsList({ locale, items }: { locale: Locale; items: readonly NewsItem[] }) {
  const copy = NEWS_COPY[locale];
  if (!items.length) return <p className={styles.empty}>{copy.empty}</p>;
  return (
    <ol className={styles.list}>
      {items.map((item) => {
        const blocks = parseAnnouncementBody(item.body);
        return (
          <li key={item.id}>
            <article id={item.slug} className={styles.article} lang={item.contentLocale}>
              {item.coverImage && (
                <div className={styles.cover}>
                  <MediaImage image={item.coverImage} sizes="(min-width: 768px) 48rem, 100vw" />
                </div>
              )}
              <div className={styles.meta} lang={locale}>
                {item.pinned && <span className={styles.pinned}>{copy.pinned}</span>}
                <span>
                  {copy.published}{" "}
                  {/* A publication date is never time-relative: plain server text, no client state. */}
                  <time dateTime={item.publishedAt}>{formatDate(item.publishedAt, locale, "Europe/Istanbul")}</time>
                </span>
              </div>
              <h2 className={styles.title}>
                <a href={`#${item.slug}`}>{item.title}</a>
              </h2>
              {item.excerpt && <p className={styles.excerpt}>{item.excerpt}</p>}
              {blocks.length > 0 && <MissionProse parsed={{ blocks, gallery: [] }} />}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
