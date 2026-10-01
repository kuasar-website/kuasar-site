import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MissionArchivePage } from "@/components/missions/mission-archive";
import { archiveMetadata } from "@/components/missions/metadata";
import { isMissionSection } from "@/components/missions/routes";

type MissionArchiveRouteProps = {
  readonly params: Promise<{
    readonly locale: string;
    readonly section: string;
  }>;
};

export async function generateMetadata({
  params,
}: MissionArchiveRouteProps): Promise<Metadata> {
  const { locale, section } = await params;
  if (!isMissionSection(locale, section)) notFound();
  return archiveMetadata(locale);
}

export default async function MissionArchiveRoute({ params }: MissionArchiveRouteProps) {
  const { locale, section } = await params;
  if (!isMissionSection(locale, section)) notFound();
  return <MissionArchivePage locale={locale} />;
}
