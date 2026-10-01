## 1. Static presentation

- [x] 1.1 Implement independent Stellar Talk and Nebula Night Server Component blocks with bilingual controls, stable event identities, optional links and required photo slots for nights.
- [x] 1.2 Add responsive token-based portrait/editorial and photo-led layouts; reuse shared actions and DateTime without a new motion library or video source.
- [x] 1.3 Verify both locales with zero, one and fifty records, independently empty collections, optional fields, one-photo nights, neutral SSR dates and preserved speaker/film names.
- [x] 1.4 Run Tier A, strict OpenSpec validation and dedicated Tier B events browser checks for no-JavaScript reading, keyboard links, narrow layouts and reduced motion. Existing time-state checks alone do not cover event layout.

## 2. Production integration (media-pipeline merged)

- [x] 2.1 Consume merged MediaImage/toMediaImage and final shared.image fields; implement the published-only build-time Strapi adapter with pagination and silent English fallback. No CMS schema edits in DEV 5.
- [x] 2.2 Add /en/events and /tr/etkinlikler with canonical/hreflang, shell and locale-switcher integration; supply the populated blocks to DEV 2 home composition.
- [ ] 2.3 Verify real published CMS records, on-demand updates through publish-integration and missing/invalid media errors without a request-time fetch or scheduled revalidation.
- [ ] 2.4 Measure production route JS ≤175KB, review bilingual copy/layout on phone and desktop, and ship/review the static baseline.

## 3. Optional hover video after baseline acceptance

- [ ] 3.1 Add the approved preview only on hover-capable fine-pointer desktop, without preload; remove/pause it on pointer exit, media-query changes or failure.
- [ ] 3.2 Verify zero video requests on mobile, coarse/no-hover devices and reduced motion, plus no preload before deliberate hover on eligible desktop.
- [ ] 3.3 Recheck actual route budgets and attach a screen recording for human motion review; omit the video if it cannot meet the budget. Do not mark the complete capability shipped until remaining release tasks are resolved.

## Verification notes — 2026-10-01

Main 2a7ba694 was integrated without conflicts. The real Next routes passed local
empty/fifty-record synthetic CMS checks, pagination/fallback, shared media,
canonical/hreflang, language switching, sitemap and zero CMS reads during serving.
First-load JS: 143.5KB / 175KB. These complete the automated part of 2.4, not human
acceptance. Task 2.3 remains open for the shared publish-integration owner's deployed
webhook and real CMS records; the cache tag/path contract is in the component README.
No server credentials or infrastructure were modified. Optional video still follows
static baseline shipping/review; tasks 3.1–3.3 are not claimed implemented.
