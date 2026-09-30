import { TimelinePage, timelineMetadata, type TimelinePageProps } from "@/components/timeline/page";

export function generateMetadata({ params }: TimelinePageProps) {
  return timelineMetadata(params, "en");
}

export default function Page({ params }: TimelinePageProps) {
  return <TimelinePage params={params} locale="en" />;
}
