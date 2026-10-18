import type { MetadataRoute } from "next";
import { loadEvents } from "../components/events/content";
import { loadNews } from "../components/news/content";
import { loadProjectPlatform } from "../components/project-platform/content";
import { scheduleConfigured } from "../components/schedule/content";
import { summitConfigured } from "../components/summit/content";
import { hasProjectPlatformContent } from "../lib/cms/project-platform-data";
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
  // The schedule route exists whenever the CMS is configured, even with zero events.
  const scheduleLanguages = Object.fromEntries(LOCALES.map(locale => [locale, new URL(sectionPath("schedule", locale), siteUrl).href]));
  const scheduleUrls = scheduleConfigured() ? LOCALES.map(locale => ({ url: scheduleLanguages[locale], alternates: { languages: scheduleLanguages } })) : [];
  // The Galactic Summit route exists whenever the CMS is configured, even with zero editions.
  const summitLanguages = Object.fromEntries(LOCALES.map(locale => [locale, new URL(sectionPath("galactic-summit", locale), siteUrl).href]));
  const summitUrls = summitConfigured() ? LOCALES.map(locale => ({ url: summitLanguages[locale], alternates: { languages: summitLanguages } })) : [];
  // News is listed only once it has a published announcement; the empty page is not indexed.
  const news = await Promise.all(LOCALES.map(locale => loadNews(locale)));
  const newsLanguages = Object.fromEntries(LOCALES.map(locale => [locale, new URL(sectionPath("news", locale), siteUrl).href]));
  const newsUrls = LOCALES.filter((_, i) => news[i].length).map(locale => ({ url: newsLanguages[locale], alternates: { languages: newsLanguages } }));
  // Project Platform is listed per locale only once it has content (a page entry or a project).
  const platform = await Promise.all(LOCALES.map(locale => loadProjectPlatform(locale)));
  const platformLanguages = Object.fromEntries(LOCALES.map(locale => [locale, new URL(sectionPath("projects", locale), siteUrl).href]));
  const platformUrls = LOCALES.filter((_, i) => hasProjectPlatformContent(platform[i])).map(locale => ({ url: platformLanguages[locale], alternates: { languages: platformLanguages } }));
  const cmsUrls = [...eventUrls, ...scheduleUrls, ...summitUrls, ...newsUrls, ...platformUrls];
  if (loadTimelineEntries().length === 0) return cmsUrls;
  const languages = Object.fromEntries(LOCALES.map((locale) => [locale, new URL(sectionPath("timeline", locale), siteUrl).href]));
  return [...cmsUrls, ...LOCALES.map((locale) => ({
    url: languages[locale],
    alternates: { languages },
  }))];
}
