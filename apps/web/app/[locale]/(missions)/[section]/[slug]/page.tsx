import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MissionDetail } from "@/components/missions/mission-detail";
import { missionMetadata } from "@/components/missions/metadata";
import { findMissionView, missionViews } from "@/components/missions/model";
import { isMissionSection } from "@/components/missions/routes";

type MissionDetailRouteProps = {
  readonly params: Promise<{
    readonly locale: string;
    readonly section: string;
    readonly slug: string;
  }>;
};

type StaticParamsContext = {
  readonly params: {
    readonly locale: string;
    readonly section: string;
  };
};

export const dynamicParams = false;

export function generateStaticParams({ params }: StaticParamsContext) {
  if (!isMissionSection(params.locale, params.section)) return [];
  return missionViews(params.locale).map(({ slug }) => ({ slug }));
}

async function resolveMission(params: MissionDetailRouteProps["params"]) {
  const { locale, section, slug } = await params;
  if (!isMissionSection(locale, section)) notFound();
  const mission = findMissionView(locale, slug);
  if (!mission) notFound();
  return mission;
}

export async function generateMetadata({
  params,
}: MissionDetailRouteProps): Promise<Metadata> {
  return missionMetadata(await resolveMission(params));
}

export default async function MissionDetailRoute({ params }: MissionDetailRouteProps) {
  return <MissionDetail mission={await resolveMission(params)} />;
}
