import { JoinPage } from "@/components/about-and-join/join-page";
import { pageMetadata } from "@/components/about-and-join/metadata";
import {
  requireLocale,
  type LocalePageProps,
} from "@/components/about-and-join/route";

export const metadata = pageMetadata("join", "en");

export default async function EnglishJoinPage({ params }: LocalePageProps) {
  const locale = await requireLocale(params, "en");
  return <JoinPage locale={locale} />;
}
