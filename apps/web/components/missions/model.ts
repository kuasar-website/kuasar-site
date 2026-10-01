import { loadMissions, type Mission } from "../../lib/content/missions.ts";
import { resolveSegment, type Locale } from "../../lib/i18n/segments.ts";

export type MissionView = {
  readonly id: string;
  readonly locale: Locale;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly body: string;
  readonly translationStatus?: "incomplete";
  readonly href: string;
  readonly alternateHref: string;
  readonly facts: Mission["facts"];
};

function requiredField(
  mission: Mission,
  locale: Locale,
  field: "name" | "summary",
): string {
  const value = mission.locales[locale].fields[field]?.trim();

  if (!value) {
    throw new Error(
      `Mission "${mission.id}", ${locale}.mdx: "${field}" must be a non-empty frontmatter field`,
    );
  }

  return value;
}

export function archivePath(locale: Locale): string {
  return `/${locale}/${resolveSegment("missions", locale)}`;
}

export function missionPath(locale: Locale, slug: string): string {
  return `${archivePath(locale)}/${slug}`;
}

export function toMissionView(mission: Mission, locale: Locale): MissionView {
  const localized = mission.locales[locale];
  const alternateLocale: Locale = locale === "en" ? "tr" : "en";

  return {
    id: mission.id,
    locale,
    slug: localized.slug,
    name: requiredField(mission, locale, "name"),
    summary: requiredField(mission, locale, "summary"),
    body: localized.body,
    translationStatus: localized.translationStatus,
    href: missionPath(locale, localized.slug),
    alternateHref: missionPath(
      alternateLocale,
      mission.locales[alternateLocale].slug,
    ),
    facts: mission.facts,
  };
}

export function missionViews(
  locale: Locale,
  missions: readonly Mission[] = loadMissions(),
): MissionView[] {
  return [...missions]
    .sort(
      (left, right) =>
        right.facts.year - left.facts.year || left.id.localeCompare(right.id),
    )
    .map((mission) => toMissionView(mission, locale));
}

export function findMissionView(
  locale: Locale,
  slug: string,
  missions: readonly Mission[] = loadMissions(),
): MissionView | null {
  const mission = missions.find((candidate) => candidate.locales[locale].slug === slug);
  return mission ? toMissionView(mission, locale) : null;
}

export function detailAlternates(view: MissionView) {
  const en = view.locale === "en" ? view.href : view.alternateHref;
  const tr = view.locale === "tr" ? view.href : view.alternateHref;

  return {
    canonical: view.href,
    languages: { en, tr, "x-default": en },
  } as const;
}

export function formatApogee(
  metres: number | null,
  locale: Locale,
  unconfirmed: string,
): string {
  return metres === null
    ? unconfirmed
    : `${new Intl.NumberFormat(locale).format(metres)} m`;
}

export function requiresSansHeading(value: string): boolean {
  return /[ğĞşŞİ]/.test(value);
}
