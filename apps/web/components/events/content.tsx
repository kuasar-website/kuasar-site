import "server-only";
import { isPreview, previewToken } from "../../lib/strapi/draft";
import { cache } from "react";
import type { Locale } from "../../lib/i18n/segments";
import { fetchEventsData } from "../../lib/events/data";
import { MediaImage } from "../media/media-image";
import { EventsShowcase, type NebulaNightView } from "./events-showcase";

/** No placeholder CMS or fabricated records when an environment is not connected. */
export function eventsConfigured() {
  if (!process.env.STRAPI_URL && process.env.VERCEL_ENV === "production") {
    throw new Error("Events require STRAPI_URL in production; see components/events/README.md");
  }
  return Boolean(process.env.STRAPI_URL);
}
export const loadEvents = cache(async (locale: Locale) => {
  if (!eventsConfigured()) return { talks: [], nights: [] };
  return fetchEventsData(locale, {
    origin: process.env.STRAPI_URL!, token: process.env.STRAPI_API_TOKEN,
    // Editor preview only (publish-integration): drafts via the server-only preview token.
    preview: await isPreview(), previewToken: previewToken(),
  });
});

/** DEV 2 may compose this server component directly; it returns null when empty. */
export async function EventsSection({ locale }: { locale: Locale }) {
  const data = await loadEvents(locale);
  const talks = data.talks.map(talk => ({ ...talk, speakerPortrait: talk.speakerPortrait
    ? <MediaImage image={talk.speakerPortrait} sizes="(min-width: 768px) 288px, 100vw" /> : null }));
  const nights: NebulaNightView[] = data.nights.map(night => {
    const [first, ...rest] = night.photos;
    if (!first) throw new Error(`Nebula Night ${night.id}: photo missing after validation`);
    const view = (photo: typeof first) => ({ id: photo.id, element: <MediaImage image={photo.image} sizes={night.photos.length === 1 ? "100vw" : "(min-width: 768px) 50vw, 100vw"} /> });
    return { ...night, photos: [view(first), ...rest.map(view)] };
  });
  return <EventsShowcase locale={locale} talks={talks} nights={nights} />;
}
