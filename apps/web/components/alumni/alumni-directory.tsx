import type { Locale } from "../../lib/i18n/segments";
import type { AlumniCardGroup } from "../../lib/cms/alumni-data";
import { MediaImage } from "../media/media-image";
import { ALUMNI_COPY } from "./copy";
import styles from "./alumni.module.css";

/**
 * Grouped by the year each person left, newest first; alphabetical within a year; people
 * with no recorded year last (openspec/changes/alumni-directory). The photo is genuinely
 * optional (design/content-model.md, Alumni): it renders only when the mapper's consent
 * gate let it through, and a card without one is complete.
 */
export function AlumniDirectory({ locale, groups }: { locale: Locale; groups: readonly AlumniCardGroup[] }) {
  const copy = ALUMNI_COPY[locale];
  if (!groups.length) return <p className={styles.empty}>{copy.empty}</p>;
  return (
    <div className={styles.directory}>
      {groups.map((group) => {
        const id = `alumni-${group.yearLeft ?? "unknown"}`;
        return (
          <section key={id} aria-labelledby={id}>
            <h2 id={id} className={styles.heading}>
              {group.yearLeft === null ? copy.yearUnknown : copy.yearLeft(group.yearLeft)}
            </h2>
            <ul className={styles.list}>
              {group.members.map((member) => (
                <li key={member.id} className={styles.card}>
                  {member.photo && (
                    <div className={styles.photo}>
                      <MediaImage image={member.photo} sizes="(min-width: 768px) 12rem, 40vw" />
                    </div>
                  )}
                  <div className={styles.details}>
                    <h3 className={styles.name}>{member.name}</h3>
                    {member.roleHeld && <p className={styles.role} lang={member.contentLocale}>{member.roleHeld}</p>}
                    <p className={styles.meta}>
                      {[
                        member.subTeam ? copy.subTeams[member.subTeam] : null,
                        member.yearJoined !== null
                          ? member.yearLeft !== null ? `${member.yearJoined}–${member.yearLeft}` : copy.joined(member.yearJoined)
                          : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                    {member.linkedinUrl && (
                      <a className={styles.link} href={member.linkedinUrl} rel="noopener noreferrer" target="_blank"
                        aria-label={copy.linkedin(member.name)}>
                        LinkedIn <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
