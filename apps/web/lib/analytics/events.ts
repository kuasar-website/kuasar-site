"use client";

import { track } from "@vercel/analytics";

/**
 * The one custom event ADR 0001 §6 authorizes: opening the Galactic Summit
 * sponsorship PDF, the "Become a Partner" target on the Galactic Summit
 * entity (design/content-model.md, "Galactic Summit" — `sponsorshipPdf`).
 * It is "the one commercially interesting question this site can answer,"
 * per the ADR, and is available on the Vercel Hobby plan against the same
 * Web Analytics event allowance as page views.
 *
 * This is a reusable contract only — it is not wired to a real interaction
 * yet. No Galactic Summit route or "Become a Partner" component exists on
 * `main` (or in any open PR) as of this change. Whichever capability builds
 * that page should call this function from the sponsorship PDF link's click
 * handler, rather than calling `track()` directly, so the event name is
 * defined in exactly one place and can't drift between call sites. `track`
 * must run client-side (it throws/warns if called during SSR), which is why
 * this module is a client boundary and why the eventual call site will need
 * to be a Client Component too.
 */
export function trackSponsorshipPdfOpened(): void {
  track("Sponsorship PDF opened");
}
