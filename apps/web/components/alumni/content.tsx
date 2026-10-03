import "server-only";
import { cache } from "react";
import type { Locale } from "../../lib/i18n/segments";
import { fetchAlumniData } from "../../lib/cms/alumni-data";

/** No placeholder CMS or fabricated records when an environment is not connected. */
export function alumniConfigured() {
  if (!process.env.STRAPI_URL && process.env.VERCEL_ENV === "production") {
    throw new Error("Alumni requires STRAPI_URL in production; see components/alumni/README.md");
  }
  return Boolean(process.env.STRAPI_URL);
}

/**
 * Build/revalidation only; the route is static and never fetches per request. Published
 * only, with no Draft Mode branch (lib/cms/alumni-data.ts explains why).
 */
export const loadAlumni = cache(async (locale: Locale) => {
  if (!alumniConfigured()) return [];
  return fetchAlumniData(locale, { origin: process.env.STRAPI_URL!, token: process.env.STRAPI_API_TOKEN });
});
