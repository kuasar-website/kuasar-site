import type { MetadataRoute } from "next";
import { loadEvents } from "../components/events/content";
import { loadTimelineEntries } from "../lib/content/timeline";
import { LOCALES, sectionPath } from "../lib/i18n/segments";

/** Only populated, published routes belong here; segment mappings alone do not. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // No fabricated production domain while the repository's domain is unresolved.
  if (!siteUrl) return [];
  const events = await Promise.all(LOCALES.map(locale => loadEvents(locale)));
  const eventLanguages = Object.fromEntries(LOCALES.map(locale => [locale, new URL(sectionPath("events", locale), siteUrl).href]));
  const eventUrls = LOCALES.filter((_, i) => events[i].talks.length || events[i].nights.length).map(locale => ({ url: eventLanguages[locale], alternates: { languages: eventLanguages } }));
  if (loadTimelineEntries().length === 0) return eventUrls;
  const languages = Object.fromEntries(LOCALES.map((locale) => [locale, new URL(sectionPath("timeline", locale), siteUrl).href]));
  return [...eventUrls, ...LOCALES.map((locale) => ({
    url: languages[locale],
    alternates: { languages },
  }))];
}
