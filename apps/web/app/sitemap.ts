import type { MetadataRoute } from "next";

/**
 * Intentionally empty. A segment-map entry being *resolved*
 * (`lib/i18n/segments.ts`) means it has a real entity and real localized
 * segments — it does not mean a page has been built for it. As of this
 * change, no section route exists anywhere in the repository (verified:
 * `find apps/web/app -type d` returns no subdirectories), so there is
 * nothing yet that a sitemap can honestly list — see
 * specs/localization/spec.md, "Sitemap and robots cover both locales", and
 * design.md, "A published route, not a resolved segment, is what the
 * sitemap advertises".
 *
 * When a section's route is published, whichever capability builds that
 * route is responsible for adding its entry here (see design.md for why no
 * automatic registration mechanism exists). Each entry needs an absolute
 * URL built from `<DOMAIN>` — see `robots.ts` for the same placeholder,
 * consistent with CLAUDE.md's "Unresolved, on purpose" — and both locales'
 * paths under `alternates.languages`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
