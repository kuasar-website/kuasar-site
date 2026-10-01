import { EventsPage, eventsMetadata, eventsParams, type EventsPageProps } from "@/components/events/page";

export const dynamic = "error";
export const dynamicParams = false;
export const revalidate = false;
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return eventsParams(params.locale, "tr");
}
export function generateMetadata({ params }: EventsPageProps) {
  return eventsMetadata(params, "tr");
}
export default function Page({ params }: EventsPageProps) {
  return <EventsPage params={params} locale="tr" />;
}
