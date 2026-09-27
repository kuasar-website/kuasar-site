"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import {
  resolvedSegments,
  type Locale,
} from "@/lib/i18n/segments";
import { resolveSectionSwitch } from "@/lib/i18n/switcher";

import type { ShellCopy } from "./navigation";
import styles from "./site-shell.module.css";

type LanguageSwitcherProps = {
  readonly copy: ShellCopy;
  readonly locale: Locale;
};

const noSubscribe = () => () => undefined;

function detailAlternate(targetLocale: Locale): string | null {
  const alternate = document.querySelector<HTMLLinkElement>(
    `link[rel="alternate"][hreflang="${targetLocale}"]`,
  );

  if (!alternate?.href) {
    return null;
  }

  const url = new URL(alternate.href, window.location.href);
  if (url.origin !== window.location.origin) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function switchHref(
  pathname: string,
  locale: Locale,
  targetLocale: Locale,
  canReadDocument: boolean,
): string {
  const fallback = `/${targetLocale}/?notice=unavailable`;
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== locale) {
    return fallback;
  }

  if (parts.length === 1) {
    return `/${targetLocale}/`;
  }

  const currentSegment = parts[1];
  const section = resolvedSegments().find(
    (candidate) => candidate[locale] === currentSegment,
  );

  if (!section) {
    return fallback;
  }

  if (parts.length === 2) {
    const outcome = resolveSectionSwitch(section.section, targetLocale);
    return outcome.kind === "available" ? outcome.path : outcome.homePath;
  }

  return canReadDocument ? (detailAlternate(targetLocale) ?? fallback) : fallback;
}

export function LanguageSwitcher({ copy, locale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const canReadDocument = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const targetLocale: Locale = locale === "en" ? "tr" : "en";
  const href = switchHref(pathname, locale, targetLocale, canReadDocument);

  return (
    <div
      aria-label={copy.languageSwitcherLabel}
      className={styles["language-switcher"]}
      role="group"
    >
      {locale === "tr" ? (
        <span aria-current="page" lang="tr" title={copy.languageName.tr}>
          TR
        </span>
      ) : (
        <a href={href} hrefLang="tr" lang="tr" title={copy.languageName.tr}>
          TR
        </a>
      )}
      <span aria-hidden="true" className={styles["language-separator"]}>
        /
      </span>
      {locale === "en" ? (
        <span aria-current="page" lang="en" title={copy.languageName.en}>
          EN
        </span>
      ) : (
        <a href={href} hrefLang="en" lang="en" title={copy.languageName.en}>
          EN
        </a>
      )}
    </div>
  );
}
