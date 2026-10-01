import { SchedulePage, scheduleMetadata, scheduleParams, type SchedulePageProps } from "@/components/schedule/page";

export const dynamic = "error";
export const dynamicParams = false;
export const revalidate = false;
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return scheduleParams(params.locale, "tr");
}
export function generateMetadata({ params }: SchedulePageProps) {
  return scheduleMetadata(params, "tr");
}
export default function Page({ params }: SchedulePageProps) {
  return <SchedulePage params={params} locale="tr" />;
}
