import "server-only";
import { isPreview, previewToken } from "../../lib/strapi/draft";
import { cache } from "react";
import type { Locale } from "../../lib/i18n/segments";
import { fetchScheduleData } from "../../lib/schedule/data";

/** No placeholder CMS or fabricated records when an environment is not connected. */
export function scheduleConfigured() {
  if (!process.env.STRAPI_URL && process.env.VERCEL_ENV === "production") {
    throw new Error("Schedule requires STRAPI_URL in production; see components/schedule/README.md");
  }
  return Boolean(process.env.STRAPI_URL);
}

/** Build/revalidation only; the route is static and never fetches per request. */
export const loadSchedule = cache(async (locale: Locale) => {
  if (!scheduleConfigured()) return [];
  return fetchScheduleData(locale, {
    origin: process.env.STRAPI_URL!, token: process.env.STRAPI_API_TOKEN,
    // Editor preview only (publish-integration): drafts via the server-only preview token.
    preview: await isPreview(), previewToken: previewToken(),
  });
});
