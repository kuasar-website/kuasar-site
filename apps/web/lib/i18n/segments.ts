/**
 * The localized URL segment map — see design/i18n.md for the source table and
 * openspec/changes/locale-routing/design.md for why this is the only place it
 * is defined. Both the switcher's section-level resolution and `sitemap.ts`
 * read from `resolvedSegments()` below; there is no second copy.
 *
 * An entry can be `unresolved` (currently only `projects`/`projeler`, which
 * has no backing entity in design/content-model.md). `resolvedSegments()`
 * filters these out, and `resolveSegment()` throws if called on one — an
 * unresolved section must never produce a switcher target or a sitemap entry.
 *
 * Reusable pattern for future capabilities (not built by this change): a
 * section route can live under a dynamic `[segment]` folder whose
 * `generateStaticParams` receives the parent's already-resolved `locale` and
 * returns only `{ segment: resolveSegment(sectionKey, locale) }`, paired with
 * `export const dynamicParams = false`. See design.md, Decision 1, for the
 * full illustrative example. Adopting it is each capability's own choice.
 */

export type Locale = "en" | "tr";

export const LOCALES: readonly Locale[] = ["en", "tr"];

export const DEFAULT_LOCALE: Locale = "en";

export type SectionKey =
  | "about"
  | "schedule"
  | "galactic-summit"
  | "missions"
  | "events"
  | "projects"
  | "alumni"
  | "join"
  | "timeline"
  | "news";

type ResolvedSegmentEntry = {
  readonly en: string;
  readonly tr: string;
};

type UnresolvedSegmentEntry = {
  readonly unresolved: true;
  readonly reason: string;
};

type SegmentEntry = ResolvedSegmentEntry | UnresolvedSegmentEntry;

function isResolvedEntry(entry: SegmentEntry): entry is ResolvedSegmentEntry {
  return !("unresolved" in entry);
}

const SEGMENTS: Readonly<Record<SectionKey, SegmentEntry>> = {
  about: { en: "about", tr: "hakkimizda" },
  schedule: { en: "schedule", tr: "takvim" },
  "galactic-summit": { en: "galactic-summit", tr: "galactic-summit" },
  missions: { en: "missions", tr: "gorevler" },
  events: { en: "events", tr: "etkinlikler" },
  projects: {
    unresolved: true,
    reason:
      "design/i18n.md's segment map lists 'projects | projeler', but no " +
      "Project entity exists in design/content-model.md. Do not invent one " +
      "or a route for it — this is a recorded open question, tracked " +
      "separately from locale-routing (see proposal.md, Impact).",
  },
  alumni: { en: "alumni", tr: "mezunlar" },
  join: { en: "join", tr: "bize-katil" },
  timeline: { en: "timeline", tr: "zaman-cizelgesi" },
  news: { en: "news", tr: "duyurular" },
};

/**
 * Resolves a section's localized segment for one locale.
 * Throws if the section is marked `unresolved` in the segment map — callers
 * must go through `resolvedSegments()` to find out which sections are live.
 */
export function resolveSegment(section: SectionKey, locale: Locale): string {
  const entry = SEGMENTS[section];
  if (!isResolvedEntry(entry)) {
    throw new Error(
      `resolveSegment("${section}") was called on an unresolved segment-map entry: ${entry.reason}`,
    );
  }
  return entry[locale];
}

export type ResolvedSection = {
  readonly section: SectionKey;
  readonly en: string;
  readonly tr: string;
};

/**
 * Every section that has a real, live segment in both locales — excludes
 * anything marked `unresolved`. This is what the switcher and `sitemap.ts`
 * both iterate over.
 */
export function resolvedSegments(): readonly ResolvedSection[] {
  return (Object.keys(SEGMENTS) as SectionKey[])
    .filter((section) => isResolvedEntry(SEGMENTS[section]))
    .map((section) => {
      const entry = SEGMENTS[section] as ResolvedSegmentEntry;
      return { section, en: entry.en, tr: entry.tr };
    });
}

/** True for a section with no backing route yet (currently only `projects`). */
export function isUnresolvedSection(section: SectionKey): boolean {
  return !isResolvedEntry(SEGMENTS[section]);
}

/** The path for a section's home in one locale, e.g. `/en/missions`. */
export function sectionPath(section: SectionKey, locale: Locale): string {
  return `/${locale}/${resolveSegment(section, locale)}`;
}
