import type { Metadata } from "next";

import { sectionAlternates } from "@/lib/i18n/metadata";
import type { Locale } from "@/lib/i18n/segments";

import { MISSION_COPY } from "./content";
import { detailAlternates, type MissionView } from "./model";

export function archiveMetadata(locale: Locale): Metadata {
  const copy = MISSION_COPY[locale];
  return {
    title: `${copy.archiveTitle} | KUASAR`,
    description: copy.archiveIntroduction,
    alternates: sectionAlternates("missions", locale),
  };
}

export function missionMetadata(mission: MissionView): Metadata {
  return {
    title: `${mission.name} | KUASAR`,
    description: mission.summary,
    alternates: detailAlternates(mission),
  };
}
