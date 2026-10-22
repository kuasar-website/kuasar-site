import { TimelineSignature } from "../_signature/launcher";
import { TimelinePage, timelineMetadata, type TimelinePageProps } from "@/components/timeline/page";

export function generateMetadata({ params }: TimelinePageProps) {
  return timelineMetadata(params, "en");
}

export default function Page({ params }: TimelinePageProps) {
  return <TimelineSignature locale="en"><TimelinePage params={params} locale="en" /></TimelineSignature>;
}
