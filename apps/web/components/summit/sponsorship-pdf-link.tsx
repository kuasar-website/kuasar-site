"use client";

import { trackSponsorshipPdfOpened } from "../../lib/analytics/events";
import actionStyles from "../ui/action-link.module.css";

/**
 * "Become a Partner": a plain link to the validated sponsorship PDF on the media
 * host (never next/link, never the image resizer), styled as the shared Secondary
 * outline action. The only client code is the analytics call, which must run in
 * the browser; without JavaScript the link still opens the PDF.
 * openspec/changes/galactic-summit design.md D5.
 */
export function SponsorshipPdfLink({ href, label, accessibleName }: { href: string; label: string; accessibleName: string }) {
  return <a href={href} target="_blank" rel="noopener" aria-label={accessibleName}
    className={`${actionStyles.action} ${actionStyles.secondary}`}
    onClick={() => trackSponsorshipPdfOpened()}>
    <span>{label}</span> <span aria-hidden="true">↗</span>
  </a>;
}
