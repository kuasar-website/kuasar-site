import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, type Locale } from "../../lib/i18n/segments";
import { sectionAlternates } from "../../lib/i18n/metadata";
import { loadSummit, renderMediaImage, summitConfigured } from "./content";
import { SummitView } from "./summit-page";

export type SummitPageProps = { params: Promise<{ locale: string }> };
const isLocale = (value: string): value is Locale => LOCALES.some((locale) => locale === value);

/** The segment is the brand name in both locales, so one route serves both. */
export function summitParams() {
  return summitConfigured() ? [{}] : [];
}
export async function summitMetadata(params: SummitPageProps["params"]): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || !summitConfigured()) notFound();
  return { title: "Galactic Summit | KUASAR", alternates: sectionAlternates("galactic-summit", locale) };
}
/** The route exists with zero editions: an explicit message, never a 404. */
export async function SummitPage({ params }: SummitPageProps) {
  const { locale } = await params;
  if (!isLocale(locale) || !summitConfigured()) notFound();
  return <SummitView locale={locale} data={await loadSummit(locale)} renderImage={renderMediaImage} />;
}
