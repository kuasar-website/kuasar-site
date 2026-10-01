import Image from "next/image";

import { ActionLink } from "@/components/ui/action-link";

import { MISSION_COPY } from "./content";
import { parseMissionBody } from "./markdown";
import { MissionFacts } from "./mission-facts";
import { MissionProse } from "./mission-prose";
import { archivePath, requiresSansHeading, type MissionView } from "./model";
import styles from "./missions.module.css";

export function MissionDetail({ mission }: { readonly mission: MissionView }) {
  const copy = MISSION_COPY[mission.locale];
  const parsed = parseMissionBody(
    mission.body,
    mission.facts.gallery,
    `Mission "${mission.id}", ${mission.locale}.mdx`,
  );

  return (
    <article className={styles.page}>
      <ActionLink href={archivePath(mission.locale)} variant="text">
        {copy.backToArchive}
      </ActionLink>

      {mission.translationStatus === "incomplete" ? (
        <aside className={styles["translation-notice"]}>
          <h2>{copy.incompleteTitle}</h2>
          <p>{copy.incompleteBody}</p>
          <ActionLink href={mission.alternateHref} variant="text">
            {copy.incompleteLink}
          </ActionLink>
        </aside>
      ) : null}

      <header className={styles["detail-hero"]}>
        <div className={styles["detail-copy"]}>
          <p className={styles.eyebrow}>{copy.detailEyebrow}</p>
          <h1
            className={
              requiresSansHeading(mission.name) ? styles["heading-sans"] : undefined
            }
          >
            {mission.name}
          </h1>
          <p className={styles.introduction}>{mission.summary}</p>
        </div>
        <div className={styles["detail-patch"]}>
          <Image
            alt={copy.patchAlt(mission.name)}
            fill
            sizes="(max-width: 48rem) 11rem, 16rem"
            src={mission.facts.patch}
          />
        </div>
      </header>

      <MissionFacts mission={mission} />
      <MissionProse parsed={parsed} />

      {parsed.gallery.length > 0 ? (
        <section aria-labelledby="mission-gallery-heading" className={styles["detail-section"]}>
          <h2 id="mission-gallery-heading">{copy.galleryTitle}</h2>
          <ul className={styles.gallery}>
            {parsed.gallery.map((image) => (
              <li key={image.src}>
                <div className={styles["gallery-image"]}>
                  <Image alt={image.alt} fill sizes="(max-width: 48rem) 100vw, 50vw" src={image.src} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mission.facts.links.length > 0 ? (
        <section aria-labelledby="mission-links-heading" className={styles["detail-section"]}>
          <h2 id="mission-links-heading">{copy.linksTitle}</h2>
          <ul className={styles["link-list"]}>
            {mission.facts.links.map((link) => (
              <li key={link.url}>
                <ActionLink href={link.url} rel="noopener" target="_blank" variant="text">
                  {link.label}
                </ActionLink>
                <span className={styles["external-notice"]}>{copy.externalNotice}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mission.facts.team.length > 0 ? (
        <section aria-labelledby="mission-team-heading" className={styles["detail-section"]}>
          <h2 id="mission-team-heading">{copy.teamTitle}</h2>
          <ul className={styles["team-list"]}>
            {mission.facts.team.map((member) => (
              <li key={`${member.name}-${member.role}`}>
                <strong>{member.name}</strong>
                <span>{member.role}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
