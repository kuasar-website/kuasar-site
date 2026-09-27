import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import type { Locale } from "@/lib/i18n/segments";

import { LanguageSwitcher } from "./language-switcher";
import { LocaleUnavailableNotice } from "./locale-unavailable-notice";
import { navigationFor, SHELL_COPY } from "./navigation";
import styles from "./site-shell.module.css";
import { Wordmark } from "./wordmark";

type SiteShellProps = {
  readonly children: ReactNode;
  readonly locale: Locale;
};

type WordmarkLinkProps = {
  readonly homeLabel: string;
  readonly locale: Locale;
};

function WordmarkLink({ homeLabel, locale }: WordmarkLinkProps) {
  return (
    <Link
      aria-label={homeLabel}
      className={styles["wordmark-link"]}
      href={`/${locale}/`}
    >
      <Wordmark className={styles.wordmark} />
    </Link>
  );
}

export function SiteShell({ children, locale }: SiteShellProps) {
  const copy = SHELL_COPY[locale];
  const navigation = navigationFor(locale);

  return (
    <div className={styles.shell} lang={locale}>
      <a className={styles["skip-link"]} href="#main-content">
        {copy.skipToContent}
      </a>

      <header className={styles.header}>
        <div className={styles["header-inner"]}>
          <WordmarkLink homeLabel={copy.homeLabel} locale={locale} />

          <nav
            aria-label={copy.primaryNavigationLabel}
            className={styles["primary-navigation"]}
          >
            <ul className={styles["navigation-list"]}>
              {navigation.map((item) => (
                <li key={item.section}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <LanguageSwitcher copy={copy} locale={locale} />
        </div>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <Suspense fallback={null}>
          <LocaleUnavailableNotice message={copy.unavailableNotice} />
        </Suspense>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles["footer-inner"]}>
          <WordmarkLink homeLabel={copy.homeLabel} locale={locale} />
          <p>{copy.footerDescription}</p>
        </div>
      </footer>
    </div>
  );
}
