import {
  ProjectPlatformPage,
  projectPlatformMetadata,
  projectPlatformParams,
  type ProjectPlatformPageProps,
} from "@/components/project-platform/page";

export const dynamic = "error";
export const dynamicParams = false;
export const revalidate = false;
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return projectPlatformParams(params.locale, "tr");
}
export function generateMetadata({ params }: ProjectPlatformPageProps) {
  return projectPlatformMetadata(params, "tr");
}
export default function Page({ params }: ProjectPlatformPageProps) {
  return <ProjectPlatformPage params={params} locale="tr" />;
}
