/**
 * Discovery metadata (hreflang/canonical) for a section's home page in one
 * locale. This is a reusable primitive, not attached to any page by this
 * change — no section route exists yet for it to attach to (see
 * openspec/changes/locale-routing/design.md, Non-Goals). A future page's
 * `generateMetadata` calls this and spreads the result into its own
 * `alternates` field.
 *
 * Matches Next.js's `Metadata['alternates']` shape: the `languages` object's
 * keys are used verbatim as the `hreflang` attribute, so `x-default` is
 * produced by including that literal string as a key — see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md.
 */

import { DEFAULT_LOCALE, sectionPath, type Locale, type SectionKey } from "./segments";

export type LocaleAlternates = {
  readonly canonical: string;
  readonly languages: {
    readonly en: string;
    readonly tr: string;
    readonly "x-default": string;
  };
};

/**
 * `locale` is the locale of the page calling this — `canonical` is always
 * self-referential to that page, never to the other locale's URL, even
 * though `languages` lists both.
 */
export function sectionAlternates(section: SectionKey, locale: Locale): LocaleAlternates {
  const en = sectionPath(section, "en");
  const tr = sectionPath(section, "tr");
  const self = locale === "en" ? en : tr;
  const defaultUrl = sectionPath(section, DEFAULT_LOCALE);

  return {
    canonical: self,
    languages: {
      en,
      tr,
      "x-default": defaultUrl,
    },
  };
}
