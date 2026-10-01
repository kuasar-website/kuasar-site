import { AboutPage } from "@/components/about-and-join/about-page";
import { pageMetadata } from "@/components/about-and-join/metadata";
import {
  requireLocale,
  type LocalePageProps,
} from "@/components/about-and-join/route";

export const metadata = pageMetadata("about", "en");

export default async function EnglishAboutPage({ params }: LocalePageProps) {
  const locale = await requireLocale(params, "en");
  return <AboutPage locale={locale} />;
}
