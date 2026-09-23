/**
 * The language switcher's route-resolution contract. This module decides
 * *where* switching locale should go; it renders nothing. The switcher's
 * visible markup lives in Dev 2 (INCO)'s shell (`components/shell/`), which
 * imports this and branches on the returned outcome — see
 * openspec/changes/locale-routing/design.md, "The switcher's resolution
 * contract has three outcomes, returned as data".
 */

import {
  isUnresolvedSection,
  resolveSegment,
  type Locale,
  type SectionKey,
} from "./segments";

export type SwitcherOutcome =
  | { readonly kind: "available"; readonly path: string }
  | {
      readonly kind: "unavailable";
      readonly homePath: string;
      readonly reason: "no-equivalent-content";
    };

/**
 * Resolves switching a fixed section page (e.g. the missions index) to the
 * other locale. Section pages are always available in both locales once
 * their segment-map entry is resolved.
 */
export function resolveSectionSwitch(
  section: SectionKey,
  targetLocale: Locale,
): SwitcherOutcome {
  if (isUnresolvedSection(section)) {
    throw new Error(
      `resolveSectionSwitch("${section}") was called on an unresolved section — ` +
        "no switcher target should ever be offered for it.",
    );
  }
  return {
    kind: "available",
    path: `/${targetLocale}/${resolveSegment(section, targetLocale)}`,
  };
}

/**
 * What the calling capability (e.g. `announcements`, `git-content-pipeline`)
 * knows about an entity's presence in the target locale. This capability
 * does not look any of this up itself — the caller supplies the answer.
 *
 * `targetSlug: null` with a `defaultLocaleSlug` can only be a real state for
 * CMS-backed content. CI makes it impossible for git-resident content (every
 * git content directory is required to declare a slug in both locales), so
 * git-content callers should never construct this variant.
 */
export type EntityLocaleAvailability =
  | { readonly hasEquivalent: true; readonly targetSlug: string }
  | {
      readonly hasEquivalent: true;
      readonly targetSlug: null;
      readonly defaultLocaleSlug: string;
    }
  | { readonly hasEquivalent: false };

/**
 * Resolves switching an entity detail page (e.g. one mission, one
 * announcement) to the other locale, given what the caller knows about that
 * entity's availability there.
 */
export function resolveEntitySwitch(
  section: SectionKey,
  targetLocale: Locale,
  availability: EntityLocaleAvailability,
): SwitcherOutcome {
  if (isUnresolvedSection(section)) {
    throw new Error(
      `resolveEntitySwitch("${section}") was called on an unresolved section — ` +
        "no switcher target should ever be offered for it.",
    );
  }

  if (!availability.hasEquivalent) {
    return {
      kind: "unavailable",
      homePath: `/${targetLocale}/`,
      reason: "no-equivalent-content",
    };
  }

  const slug = availability.targetSlug ?? availability.defaultLocaleSlug;
  const segment = resolveSegment(section, targetLocale);
  return { kind: "available", path: `/${targetLocale}/${segment}/${slug}` };
}
