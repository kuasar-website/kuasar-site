import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "../../lib/i18n/segments";
import { sectionAlternates } from "../../lib/i18n/metadata";
import { loadProjectPlatform, projectPlatformConfigured } from "./content";
import { PROJECT_PLATFORM_COPY } from "./copy";
import { ProjectPlatformView } from "./project-platform-view";

export type ProjectPlatformPageProps = { params: Promise<{ locale: string }> };
export function projectPlatformParams(locale: string, expected: Locale) {
  return projectPlatformConfigured() && locale === expected ? [{}] : [];
}
export async function projectPlatformMetadata(params: ProjectPlatformPageProps["params"], expected: Locale): Promise<Metadata> {
  if ((await params).locale !== expected || !projectPlatformConfigured()) notFound();
  return {
    title: `${PROJECT_PLATFORM_COPY[expected].heading} | KUASAR`,
    alternates: sectionAlternates("projects", expected),
  };
}
/** The route exists with no content at all: heading and two empty states, never a 404. */
export async function ProjectPlatformPage({ params, locale }: ProjectPlatformPageProps & { locale: Locale }) {
  if ((await params).locale !== locale || !projectPlatformConfigured()) notFound();
  return <ProjectPlatformView locale={locale} data={await loadProjectPlatform(locale)} />;
}
