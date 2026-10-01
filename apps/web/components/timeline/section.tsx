import type { Locale } from "../../lib/i18n/segments";
import { sectionPath } from "../../lib/i18n/segments";
import { loadTimelineViews } from "./content";
import { Timeline } from "./timeline";

/** DEV 2 can compose this Server Component directly into either home. */
export async function TimelineSection({ locale }: { locale: Locale }) {
  const entries = await loadTimelineViews(locale);
  return <Timeline id="home-timeline" locale={locale} entries={entries} viewMoreHref={sectionPath("timeline", locale)} />;
}
