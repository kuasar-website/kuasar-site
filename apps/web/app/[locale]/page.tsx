import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FORM_LINKS } from "@/components/about-and-join/form-links";
import { EventsSection } from "@/components/events/content";
import { HomeHero } from "@/components/hero/home-hero";
import { MissionArchiveSection } from "@/components/missions/mission-archive";
import { TimelineSection } from "@/components/timeline/section";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/segments";

type HomePageProps = {
  readonly params: Promise<{ readonly locale: string }>;
};

function isLocale(value: string): value is Locale {
  return LOCALES.some((locale) => locale === value);
}
function homePath(locale: Locale): string {
  return `/${locale}`;
}

export const dynamic = "error";
export const revalidate = false;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return {
    title: "KUASAR",
    alternates: {
      canonical: homePath(locale),
      languages: {
        en: homePath("en"),
        tr: homePath("tr"),
        "x-default": homePath(DEFAULT_LOCALE),
      },
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <>
      <HomeHero locale={locale} sponsorHref={FORM_LINKS.connect} />
      <div className="empty:hidden mx-auto w-[min(calc(100%_-_2rem),76rem)] py-[var(--space-section)] lg:py-[var(--space-section-lg)]">
        <TimelineSection locale={locale} />
      </div>
      <MissionArchiveSection locale={locale} />
      <EventsSection locale={locale} />
    </>
  );
}
