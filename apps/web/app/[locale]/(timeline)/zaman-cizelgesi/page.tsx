import { TimelineSignature } from "../_signature/launcher";
import { TimelinePage, timelineMetadata, type TimelinePageProps } from "@/components/timeline/page";

export function generateMetadata({ params }: TimelinePageProps) {
  return timelineMetadata(params, "tr");
}

export default function Page({ params }: TimelinePageProps) {
  return <TimelineSignature locale="tr"><TimelinePage params={params} locale="tr" /></TimelineSignature>;
}
