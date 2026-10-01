import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/segments";

import { MISSION_COPY } from "./content";
import { MissionFacts } from "./mission-facts";
import { missionViews, requiresSansHeading, type MissionView } from "./model";
import styles from "./missions.module.css";

function ArchiveList({ missions }: { readonly missions: readonly MissionView[] }) {
  const copy = MISSION_COPY[missions[0]?.locale ?? "en"];
  const className = `${styles["archive-list"]} ${
    missions.length === 1 ? styles["archive-list-single"] : ""
  }`;

  return (
    <ol aria-label={copy.archiveSectionTitle} className={className}>
      {missions.map((mission) => (
        <li className={styles["archive-entry"]} key={mission.id}>
          <article>
            <Link
              aria-label={copy.openMission(mission.name)}
              className={styles["patch-link"]}
              href={mission.href}
            >
              <span className={styles["patch-frame"]}>
                <Image
                  alt={copy.patchAlt(mission.name)}
                  fill
                  sizes="(max-width: 48rem) 9rem, 11rem"
                  src={mission.facts.patch}
                />
              </span>
              <span aria-hidden="true" className={styles["patch-arrow"]}>
                →
              </span>
            </Link>

            <div className={styles["archive-copy"]}>
              <p className={styles.year}>{mission.facts.year}</p>
              <h2
                className={
                  requiresSansHeading(mission.name) ? styles["heading-sans"] : undefined
                }
              >
                {mission.name}
              </h2>
              <p className={styles.summary}>{mission.summary}</p>
              <MissionFacts mission={mission} />
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}

export function MissionArchivePage({ locale }: { readonly locale: Locale }) {
  const copy = MISSION_COPY[locale];
  const missions = missionViews(locale);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{copy.archiveEyebrow}</p>
        <h1>{copy.archiveTitle}</h1>
        <p className={styles.introduction}>{copy.archiveIntroduction}</p>
      </header>

      {missions.length > 0 ? (
        <ArchiveList missions={missions} />
      ) : (
        <p className={styles["empty-state"]}>{copy.archiveEmpty}</p>
      )}
    </div>
  );
}

export function MissionArchiveSection({ locale }: { readonly locale: Locale }) {
  const missions = missionViews(locale);
  if (missions.length === 0) return null;

  return (
    <section aria-labelledby="mission-archive-heading" className={styles["archive-section"]}>
      <h2 id="mission-archive-heading">{MISSION_COPY[locale].archiveSectionTitle}</h2>
      <ArchiveList missions={missions} />
    </section>
  );
}
