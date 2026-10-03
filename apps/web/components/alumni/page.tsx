import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "../../lib/i18n/segments";
import { sectionAlternates } from "../../lib/i18n/metadata";
import { alumniConfigured, loadAlumni } from "./content";
import { ALUMNI_COPY } from "./copy";
import { AlumniDirectory } from "./alumni-directory";

export type AlumniPageProps = { params: Promise<{ locale: string }> };
export function alumniParams(locale: string, expected: Locale) {
  return alumniConfigured() && locale === expected ? [{}] : [];
}
export async function alumniMetadata(params: AlumniPageProps["params"], expected: Locale): Promise<Metadata> {
  if ((await params).locale !== expected || !alumniConfigured()) notFound();
  return {
    title: `${ALUMNI_COPY[expected].heading} | KUASAR`,
    alternates: sectionAlternates("alumni", expected),
    // A directory of named former members: reachable from the navigation, never indexed
    // (openspec/changes/alumni-directory, "launch/alumni"). Sitemap exclusion alone doesn't
    // stop indexing. robots.txt must NOT block this route, or crawlers can't read the
    // directive. nofollow: the page's only own links are personal LinkedIn profiles.
    robots: { index: false, follow: false },
  };
}
/** The route exists with zero alumni: an explicit empty message, never a 404. */
export async function AlumniPage({ params, locale }: AlumniPageProps & { locale: Locale }) {
  if ((await params).locale !== locale || !alumniConfigured()) notFound();
  const groups = await loadAlumni(locale);
  return <>
    <h1 className="px-6 pt-16 text-4xl font-semibold text-ink">{ALUMNI_COPY[locale].heading}</h1>
    <AlumniDirectory locale={locale} groups={groups} />
  </>;
}
