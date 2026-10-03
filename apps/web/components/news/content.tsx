import "server-only";
import { cache } from "react";
import type { Locale } from "../../lib/i18n/segments";
import { fetchNewsData } from "../../lib/cms/announcements-data";

/** No placeholder CMS or fabricated records when an environment is not connected. */
export function newsConfigured() {
  if (!process.env.STRAPI_URL && process.env.VERCEL_ENV === "production") {
    throw new Error("News requires STRAPI_URL in production; see components/news/README.md");
  }
  return Boolean(process.env.STRAPI_URL);
}

/**
 * Build/revalidation only; the route is static and never fetches per request. Published
 * only, with no Draft Mode branch (lib/cms/announcements-data.ts explains why).
 */
export const loadNews = cache(async (locale: Locale) => {
  if (!newsConfigured()) return [];
  return fetchNewsData(locale, { origin: process.env.STRAPI_URL!, token: process.env.STRAPI_API_TOKEN });
});
