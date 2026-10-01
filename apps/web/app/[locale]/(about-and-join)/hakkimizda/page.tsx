import { AboutPage } from "@/components/about-and-join/about-page";
import { pageMetadata } from "@/components/about-and-join/metadata";
import {
  requireLocale,
  type LocalePageProps,
} from "@/components/about-and-join/route";

export const metadata = pageMetadata("about", "tr");

export default async function TurkishAboutPage({ params }: LocalePageProps) {
  const locale = await requireLocale(params, "tr");
  return <AboutPage locale={locale} />;
}
