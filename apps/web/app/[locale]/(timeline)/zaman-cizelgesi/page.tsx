import { TimelinePage, timelineMetadata, type TimelinePageProps } from "@/components/timeline/page";

export function generateMetadata({ params }: TimelinePageProps) {
  return timelineMetadata(params, "tr");
}

export default function Page({ params }: TimelinePageProps) {
  return <TimelinePage params={params} locale="tr" />;
}
