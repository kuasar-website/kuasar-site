import type { Locale } from "../../lib/i18n/segments";
import type { PlatformProjectCard, ProjectPlatformData } from "../../lib/cms/project-platform-data";
import { MediaImage } from "../media/media-image";
import { MissionProse } from "../missions/mission-prose";
import { parseAnnouncementBody } from "../news/body";
import { ActionLink } from "../ui/action-link";
import { PROJECT_PLATFORM_COPY } from "./copy";
import styles from "./project-platform.module.css";

/**
 * The whole page, server-rendered with no client JS and no motion. Sections follow the
 * editor's `projectStatus` only. A block shown in English on /tr carries `lang="en"`;
 * interface copy is always in the page locale. Without a Project Platform entry, the page
 * keeps its heading and project sections and omits the intro, the WhatsApp button and the
 * functions (openspec/changes/project-platform-page).
 */
export function ProjectPlatformView({ locale, data }: { locale: Locale; data: ProjectPlatformData }) {
  const copy = PROJECT_PLATFORM_COPY[locale];
  const { page } = data;
  // The editor's label is in the entry's language; the default label is in the page's.
  const whatsappLabel = page?.whatsappLabel ?? copy.whatsappDefault;
  const whatsappLang = page?.whatsappLabel ? page.contentLocale : locale;
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heading}>{copy.heading}</h1>
        {page && (
          <div className={styles.intro} lang={page.contentLocale}>
            <MissionProse parsed={{ blocks: parseAnnouncementBody(page.intro), gallery: [] }} />
          </div>
        )}
        {page?.whatsappUrl && (
          <div className={styles.action} lang={whatsappLang}>
            <ActionLink
              aria-label={`${whatsappLabel} ${PROJECT_PLATFORM_COPY[whatsappLang].newTab}`}
              href={page.whatsappUrl}
              rel="noopener"
              target="_blank"
              variant="primary"
            >
              {whatsappLabel} <span aria-hidden="true">↗</span>
            </ActionLink>
          </div>
        )}
      </header>

      {page && page.features.length > 0 && (
        <section aria-labelledby="project-platform-functions" className={styles.section}>
          <h2 className={styles["section-heading"]} id="project-platform-functions">{copy.functions}</h2>
          <ul className={styles.features} lang={page.contentLocale}>
            {page.features.map((feature, index) => (
              <li className={styles.feature} key={index}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProjectSection empty={copy.currentEmpty} heading={copy.current} id="project-platform-current" locale={locale} projects={data.current} />
      <ProjectSection empty={copy.pastEmpty} heading={copy.past} id="project-platform-past" locale={locale} projects={data.past} />
    </div>
  );
}

type ProjectSectionProps = {
  empty: string;
  heading: string;
  id: string;
  locale: Locale;
  projects: readonly PlatformProjectCard[];
};

function ProjectSection({ empty, heading, id, locale, projects }: ProjectSectionProps) {
  return (
    <section aria-labelledby={id} className={styles.section}>
      <h2 className={styles["section-heading"]} id={id}>{heading}</h2>
      {projects.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.projects}>
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard locale={locale} project={project} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * From md up, a card with a cover is two columns, the cover shown whole (never cropped).
 * Without a cover there is no image slot: the card is text only, by design.
 */
function ProjectCard({ locale, project }: { locale: Locale; project: PlatformProjectCard }) {
  const copy = PROJECT_PLATFORM_COPY[locale];
  return (
    <article
      className={project.coverImage ? `${styles.project} ${styles["has-cover"]}` : styles.project}
      data-project={project.id}
      lang={project.contentLocale}
    >
      {project.coverImage && (
        <div className={styles.cover}>
          <MediaImage
            image={project.coverImage}
            sizes="(min-width: 68rem) 27rem, (min-width: 48rem) 40vw, calc(100vw - 3rem)"
          />
        </div>
      )}
      <div className={styles.text}>
        {/* Whole years: plain server text, never time-relative, no client state. */}
        <p className={styles.years}>{project.years}</p>
        <h3 className={styles.title}>{project.title}</h3>
        <p className={styles.summary}>{project.summary}</p>
        {project.applicationUrl && (
          <div className={styles.action} lang={locale}>
            <ActionLink
              aria-label={copy.applyName(project.title)}
              href={project.applicationUrl}
              rel="noopener"
              target="_blank"
              variant="primary"
            >
              {copy.apply} <span aria-hidden="true">↗</span>
            </ActionLink>
          </div>
        )}
      </div>
    </article>
  );
}
