import type { ReactElement } from "react";
import { Wordmark } from "./wordmark";
import styles from "./hero.module.css";

type HeroProps = {
  locale: "en" | "tr";
  /** Shared site-shell action with its real localized destination and label. */
  sponsorAction: ReactElement;
  /** Shared site-shell action with its real localized destination and label. */
  joinAction: ReactElement;
};

const copy = {
  en: { sponsors: "For sponsors and partners", members: "For prospective members" },
  tr: { sponsors: "Sponsorlar ve iş ortakları için", members: "Takıma katılmak isteyenler için" },
} as const;

/** Permanent server-rendered baseline; the home composition supplies shared actions. */
export function Hero({ locale, sponsorAction, joinAction }: HeroProps) {
  const labels = copy[locale];
  return (
    <section className={styles.hero} lang={locale} aria-label="KUASAR">
      <div className={styles.identity}>
        <div className={styles["mark-frame"]}>
          <h1 className={styles.wordmark} aria-label="KUASAR"><Wordmark /></h1>
        </div>
        <p className={styles.subtitle} lang="en">Koç University Association of Space &amp; Rocketry</p>
      </div>
      <div className={styles.actions}>
        <div className={styles.audience}>
          <p>{labels.sponsors}</p>
          {sponsorAction}
        </div>
        <div className={styles.audience}>
          <p>{labels.members}</p>
          {joinAction}
        </div>
      </div>
    </section>
  );
}
