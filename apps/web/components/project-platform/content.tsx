import "server-only";
import { cache } from "react";
import type { Locale } from "../../lib/i18n/segments";
import { fetchProjectPlatformData } from "../../lib/cms/project-platform-data";

/** No placeholder CMS or fabricated records when an environment is not connected. */
export function projectPlatformConfigured() {
  if (!process.env.STRAPI_URL && process.env.VERCEL_ENV === "production") {
    throw new Error("Project Platform requires STRAPI_URL in production; see components/project-platform/README.md");
  }
  return Boolean(process.env.STRAPI_URL);
}

/**
 * Build/revalidation only; the route is static and never fetches per request. Published
 * only, with no Draft Mode branch (lib/cms/project-platform-data.ts explains why).
 */
export const loadProjectPlatform = cache(async (locale: Locale) => {
  if (!projectPlatformConfigured()) return { page: null, current: [], past: [] };
  return fetchProjectPlatformData(locale, { origin: process.env.STRAPI_URL!, token: process.env.STRAPI_API_TOKEN });
});
