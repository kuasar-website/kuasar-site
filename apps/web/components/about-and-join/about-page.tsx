import type { Locale } from "@/lib/i18n/segments";

import { ABOUT_COPY } from "./content";
import { ExternalAction } from "./external-action";
import { FORM_LINKS } from "./form-links";
import styles from "./page.module.css";

type AboutPageProps = {
  readonly locale: Locale;
};

export function AboutPage({ locale }: AboutPageProps) {
  const copy = ABOUT_COPY[locale];
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

      <div className={styles["content-grid"]}>
        <div className={styles["text-sections"]}>
          {copy.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>

        <ExternalAction
          accessibleLabel={copy.action.accessibleLabel}
          body={copy.action.body}
          heading={copy.action.heading}
          href={FORM_LINKS.connect}
          label={copy.action.label}
          notice={copy.action.externalNotice}
        />
      </div>
    </article>
  );
}
