import { JoinPage } from "@/components/about-and-join/join-page";
import { pageMetadata } from "@/components/about-and-join/metadata";
import {
  requireLocale,
  type LocalePageProps,
} from "@/components/about-and-join/route";

export const metadata = pageMetadata("join", "tr");

export default async function TurkishJoinPage({ params }: LocalePageProps) {
  const locale = await requireLocale(params, "tr");
  return <JoinPage locale={locale} />;
}
