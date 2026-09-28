import type { MetadataRoute } from "next";
import { loadTimelineEntries } from "../lib/content/timeline";
import { LOCALES, sectionPath } from "../lib/i18n/segments";

/** Only populated, published routes belong here; segment mappings alone do not. */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // No fabricated production domain while the repository's domain is unresolved.
  if (!siteUrl || loadTimelineEntries().length === 0) return [];
  const languages = Object.fromEntries(LOCALES.map((locale) => [locale, new URL(sectionPath("timeline", locale), siteUrl).href]));
  return LOCALES.map((locale) => ({
    url: languages[locale],
    alternates: { languages },
  }));
}
