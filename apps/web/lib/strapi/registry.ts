import { LOCALES, sectionPath, type Locale, type SectionKey } from "../i18n/segments.ts";

/**
 * The one map from Strapi content types to what publish-integration revalidates and
 * previews (openspec/changes/publish-integration, design D2). Loaders keep their own
 * exported tag constants; registry.test.ts asserts they equal these strings.
 *
 * - `tags`: cache tags the content type's loader puts on its fetches.
 * - `section`: the public route (both locales) showing it; null when nothing shows it.
 * - `preview`: whether the Strapi admin may preview it. Off until a page exists.
 */
export const CACHE_TAGS = {
  events: "events-showcase",
  schedule: "schedule-calendar",
  summit: "galactic-summit",
  /** Reserved for Dev 3's announcements capability. */
  announcements: "announcements",
  /** Reserved for Dev 3's alumni-directory capability. */
  alumni: "alumni-directory",
} as const;

export type ContentTypeEntry = { readonly tags: readonly string[]; readonly section: SectionKey | null; readonly preview: boolean };

export const CONTENT_TYPES: Readonly<Record<string, ContentTypeEntry>> = {
  "api::stellar-talk.stellar-talk": { tags: [CACHE_TAGS.events], section: "events", preview: true },
  "api::nebula-night.nebula-night": { tags: [CACHE_TAGS.events], section: "events", preview: true },
  "api::schedule-event.schedule-event": { tags: [CACHE_TAGS.schedule], section: "schedule", preview: true },
  "api::galactic-summit.galactic-summit": { tags: [CACHE_TAGS.summit], section: "galactic-summit", preview: true },
  // Dev 3: enable preview when the News / Alumni routes exist (and add slug detail paths).
  "api::announcement.announcement": { tags: [CACHE_TAGS.announcements], section: "news", preview: false },
  "api::alumnus.alumnus": { tags: [CACHE_TAGS.alumni], section: "alumni", preview: false },
  // Sponsors showcase is held (trademark permission); nothing public reads sponsors.
  "api::sponsor.sponsor": { tags: [], section: null, preview: false },
};

/**
 * Public paths for a content type in both locales (Turkish may show English fallback).
 * Documentation and preview only — revalidation is tag-only (never revalidatePath).
 */
export function pathsFor(uid: string): string[] {
  const section = CONTENT_TYPES[uid]?.section;
  return section ? LOCALES.map((locale) => sectionPath(section, locale)) : [];
}

export function allTags(): string[] {
  return [...new Set(Object.values(CONTENT_TYPES).flatMap((entry) => entry.tags))];
}

/** The preview target, derived only from the registry — never from request input. */
export function previewPathFor(uid: string, locale: Locale): string | null {
  const entry = CONTENT_TYPES[uid];
  return entry?.preview && entry.section ? sectionPath(entry.section, locale) : null;
}
