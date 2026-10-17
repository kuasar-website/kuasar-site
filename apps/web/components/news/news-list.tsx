import type { Locale } from "../../lib/i18n/segments";
import type { NewsItem } from "../../lib/cms/announcements-data";
import { MediaImage } from "../media/media-image";
import { MissionProse } from "../missions/mission-prose";
import { parseAnnouncementBody } from "./body";
import { NEWS_COPY } from "./copy";
import { formatAnnouncementDate } from "./date";
import styles from "./news.module.css";

/**
 * The whole announcement is on the list page, each one an `<article>` with its slug as the
 * fragment id. There are deliberately no per-slug detail routes yet: every route under
 * [locale] uses dynamicParams = false, so a detail page for an announcement published after
 * the last deploy would 404 until the next one (publish-integration design D2). See
 * openspec/changes/announcements/design.md, "launch/news".
 *
 * From md up, an article with a cover is two columns: the cover on the left, the text on the
 * right. The cover is shown whole, never cropped: editors upload designed posters with text
 * near the edges, so it is letterboxed inside a height-capped frame (news.module.css).
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
            <article
              id={item.slug}
              className={item.coverImage ? `${styles.article} ${styles["has-cover"]}` : styles.article}
              lang={item.contentLocale}
            >
              {item.coverImage && (
                <div className={styles.cover}>
                  <MediaImage
                    image={item.coverImage}
                    sizes="(min-width: 68rem) 27rem, (min-width: 48rem) 40vw, calc(100vw - 3rem)"
                  />
                </div>
              )}
              <div className={styles.text}>
                <div className={styles.meta} lang={locale}>
                  {item.pinned && <span className={styles.pinned}>{copy.pinned}</span>}
                  <span>
                    {copy.published}{" "}
                    {/* The editorial announcementDate (never publishedAt). Never time-relative:
                        plain server text, no client state. */}
                    <time dateTime={item.announcementDate}>{formatAnnouncementDate(item.announcementDate, locale)}</time>
                  </span>
                </div>
                <h2 className={styles.title}>
                  <a href={`#${item.slug}`}>{item.title}</a>
                </h2>
                {item.excerpt && <p className={styles.excerpt}>{item.excerpt}</p>}
                {blocks.length > 0 && (
                  <div className={styles.body}>
                    <MissionProse parsed={{ blocks, gallery: [] }} />
                  </div>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
