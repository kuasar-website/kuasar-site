import type { Locale } from "@/lib/i18n/segments";

import { JOIN_COPY } from "./content";
import { ExternalAction } from "./external-action";
import { FORM_LINKS } from "./form-links";
import styles from "./page.module.css";

type JoinPageProps = {
  readonly locale: Locale;
};

export function JoinPage({ locale }: JoinPageProps) {
  const copy = JOIN_COPY[locale];
  const headingClassName =
    copy.titleFont === "sans"
      ? `${styles.heading} ${styles["heading-sans"]}`
      : styles.heading;

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={headingClassName}>{copy.title}</h1>
        <p className={styles.introduction}>{copy.introduction}</p>
      </header>

      <section
        aria-labelledby="sub-teams-heading"
        className={styles["teams-section"]}
      >
        <h2 id="sub-teams-heading">{copy.teamsLabel}</h2>
        <ol className={styles["team-grid"]}>
          {copy.teams.map((team, index) => (
            <li key={team.name}>
              <article className={styles.team}>
                <p aria-hidden="true" className={styles["team-index"]}>
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3>{team.name}</h3>
                <p>{team.responsibility}</p>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <ExternalAction
        accessibleLabel={copy.action.accessibleLabel}
        body={copy.action.body}
        heading={copy.action.heading}
        href={FORM_LINKS.join}
        label={copy.action.label}
        notice={copy.action.externalNotice}
      />
    </article>
  );
}
