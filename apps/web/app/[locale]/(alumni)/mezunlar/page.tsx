import { AlumniPage, alumniMetadata, alumniParams, type AlumniPageProps } from "@/components/alumni/page";

export const dynamic = "error";
export const dynamicParams = false;
export const revalidate = false;
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return alumniParams(params.locale, "tr");
}
export function generateMetadata({ params }: AlumniPageProps) {
  return alumniMetadata(params, "tr");
}
export default function Page({ params }: AlumniPageProps) {
  return <AlumniPage params={params} locale="tr" />;
}
