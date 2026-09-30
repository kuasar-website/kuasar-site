import {
  LOCALES,
  resolveSegment,
  type Locale,
} from "@/lib/i18n/segments";

export function isLocale(value: string): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

export function isMissionSection(locale: string, section: string): locale is Locale {
  return isLocale(locale) && section === resolveSegment("missions", locale);
}
