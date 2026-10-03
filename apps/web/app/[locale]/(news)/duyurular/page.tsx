import { NewsPage, newsMetadata, newsParams, type NewsPageProps } from "@/components/news/page";

export const dynamic = "error";
export const dynamicParams = false;
export const revalidate = false;
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return newsParams(params.locale, "tr");
}
export function generateMetadata({ params }: NewsPageProps) {
  return newsMetadata(params, "tr");
}
export default function Page({ params }: NewsPageProps) {
  return <NewsPage params={params} locale="tr" />;
}
