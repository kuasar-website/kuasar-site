import "server-only";
import { isPreview, previewToken } from "../../lib/strapi/draft";
import { cache } from "react";
import type { Locale } from "../../lib/i18n/segments";
import { fetchSummitData } from "../../lib/summit/data";
import { MediaImage } from "../media/media-image";
import type { RenderImage } from "./summit-page";

/** No placeholder CMS or fabricated editions when an environment is not connected. */
export function summitConfigured() {
  if (!process.env.STRAPI_URL && process.env.VERCEL_ENV === "production") {
    throw new Error("Galactic Summit requires STRAPI_URL in production; see components/summit/README.md");
  }
  return Boolean(process.env.STRAPI_URL);
}

/** Build/revalidation only; the route is static and never fetches per request. */
export const loadSummit = cache(async (locale: Locale) => {
  if (!summitConfigured()) return { current: null, others: [] };
  return fetchSummitData(locale, {
    origin: process.env.STRAPI_URL!, token: process.env.STRAPI_API_TOKEN,
    // Editor preview only (publish-integration): drafts via the server-only preview token.
    preview: await isPreview(), previewToken: previewToken(),
  });
});

/** Every Summit image goes through the shared media pipeline's component. */
export const renderMediaImage: RenderImage = (image, { sizes, aspectRatio, eager }) =>
  <MediaImage image={image} sizes={sizes} aspectRatio={aspectRatio} eager={eager} />;
