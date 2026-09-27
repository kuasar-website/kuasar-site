import type { ReactNode } from "react";

import { isLocale } from "@/components/missions/routes";
import { resolveSegment } from "@/lib/i18n/segments";

type MissionSectionLayoutProps = {
  readonly children: ReactNode;
};

type StaticParamsContext = {
  readonly params: { readonly locale: string };
};

export const dynamicParams = false;

export function generateStaticParams({ params }: StaticParamsContext) {
  if (!isLocale(params.locale)) return [];
  return [{ section: resolveSegment("missions", params.locale) }];
}

export default function MissionSectionLayout({ children }: MissionSectionLayoutProps) {
  return children;
}
