import { SummitPage, summitMetadata, summitParams, type SummitPageProps } from "@/components/summit/page";

export const dynamic = "error";
export const dynamicParams = false;
export const revalidate = false;
export function generateStaticParams() {
  return summitParams();
}
export function generateMetadata({ params }: SummitPageProps) {
  return summitMetadata(params);
}
export default function Page({ params }: SummitPageProps) {
  return <SummitPage params={params} />;
}
