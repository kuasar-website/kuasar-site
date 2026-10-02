## 0. Preconditions (verify, do not change)

- [x] 0.1 Confirm against `main` that the `galactic-summit`, `summit.programme-item`, `summit.speaker` and `shared.image` schemas still match design.md, Context. Any drift: stop and update this change first.
- [x] 0.2 Verify the Next.js 16 App Router APIs used (route segment config, fetch `next.tags`, client islands inside a static page) against the installed `next` docs, or context7 when available. Record any deviation in design.md before coding.
- [x] 0.3 If PR #35 (schedule-calendar) has merged by then, merge `origin/main` normally before section 6 and resolve the expected one-line `tests/events/check-routes.mjs` conflict by keeping both paths.
  - **Evidence (2026-10-02):** PR #35 merged as `b2343ac`. A normal merge of `origin/main` (merge commit `eb21253`) resolved the two expected conflicts by keeping both sides: `apps/web/app/sitemap.ts` (schedule and Summit URL lists) and `tests/events/check-routes.mjs` (empty `/api/schedule-events` and `/api/galactic-summits`). The Summit, schedule and events unit, browser and production-route checks, plus Tier A, pass locally.

## 1. Data loader (build/revalidation only)

- [x] 1.1 `apps/web/lib/summit/data.ts`, mirroring `lib/events/data.ts`:
  - published only, all pages, tag `galactic-summit`, `force-cache`, `revalidate: false`, optional bearer token;
  - the D6 populate list, with **no `sponsors`**;
  - tr-over-en by `documentId`, keeping `contentLocale`.
- [x] 1.2 Validation per the spec's "Strict data contract":
  - year, isCurrent, date, both enums, registrationUrl;
  - speakers' `speakerName`, and programme items that are not entirely empty;
  - duplicate years;
  - images through `toMediaImage` with the page locale;
  - `toSponsorshipPdf` (https, `MEDIA_HOST`, `.pdf`, `application/pdf`, no credentials);
  - the current edition's still/wash requires `backgroundImage`.

  Every failure names Strapi, the `documentId`, the field and the runbook.
- [x] 1.3 Exactly-one-current invariant on the merged set: zero editions is valid, zero current or more than one current fails, naming every year and `documentId`. Return `{ current, others }` with `others` sorted by `year`, newest first.
- [x] 1.4 `apps/web/lib/summit/data.test.ts` covers:
  - 0, 1 and 4 editions; none-current and two-current failures; duplicate year;
  - drafts skipped, pagination, wrong locale;
  - tr fallback (`contentLocale`) and English-only route content;
  - each validation failure's message;
  - PDF accepted, and rejected for the CMS host, `r2.dev`, the R2 S3 endpoint, http, non-PDF MIME, `.png` path and credentials;
  - the request URL has the five populates and never `sponsors`;
  - an unreachable or HTTP-error Strapi message.

## 2. Neutral page baseline (no JS required)

- [x] 2.1 `apps/web/components/summit/copy.ts`: one en/tr table holding the spec's "Bilingual interface copy" table verbatim, including the Live badge and "İş ortağımız olun (PDF)".
- [x] 2.2 `apps/web/components/summit/summit-page.tsx` (server):
  - `h1` "Galactic Summit {year}" with the brand `lang="en"`;
  - the neutral Istanbul date in `<time>`, or "Date to be announced";
  - location and purpose (with `lang` set to the content locale);
  - the Register link or the plain label;
  - programme as an `ol`, speakers as a list with portraits, a photos figure list, and contact;
  - the "Other editions" archive (`h3` per edition: date, location, purpose, photos);
  - sections without data omitted;
  - the zero-editions message;
  - no sponsor output.
- [x] 2.3 `apps/web/components/summit/content.tsx` (server-only: `summitConfigured()`, which throws in production without `STRAPI_URL`, and a cached `loadSummit(locale)`) and `page.tsx` (params, metadata via `sectionAlternates('galactic-summit', …)` titled "Galactic Summit | KUASAR", page).
- [x] 2.4 One route file, `apps/web/app/[locale]/(galactic-summit)/galactic-summit/page.tsx`, with `dynamic = "error"`, `dynamicParams = false` and `revalidate = false`, serving both locales.
- [x] 2.5 `apps/web/components/summit/summit.module.css`:
  - tokens only, with the D3 `data-accent` → `--summit-accent` aliases and the three static treatments;
  - hero text on a surface token, never over the image;
  - the accent only on the hero frame and heading rule;
  - no horizontal scroll at 320px, and `forced-colors` support.
- [x] 2.6 `apps/web/app/sitemap.ts`: emit both Summit URLs with alternates whenever the CMS is configured (zero editions included). Leave the other entries unchanged.
- [x] 2.7 Confirm with a local production build against a synthetic CMS that both locales show the full neutral page, and every link works, with JavaScript disabled. Review the baseline before section 3.

## 3. Client islands (built on the reviewed baseline)

- [x] 3.1 `apps/web/components/summit/sponsorship-pdf-link.tsx` (`"use client"`): a plain `<a>` with the shared `action secondary` classes, `target="_blank" rel="noopener"`, visible "(PDF)", the spec's accessible name, and `onClick` → `trackSponsorshipPdfOpened()`. Rendered only when a validated PDF exists.
- [x] 3.2 `apps/web/lib/summit/time.ts`: pure `istanbulDayKey(instant)` (`Intl` `formatToParts`, `Europe/Istanbul`) and `summitDayState(date, now)` → `"upcoming" | "live" | null` by Istanbul calendar-day comparison (design.md D7). It never reads a clock, adds no duration, and returns null for a null `now` or a missing/invalid date. `apps/web/lib/summit/time.test.ts`, run under `TZ=UTC` and `TZ=America/New_York`, covers:
  - the day before → upcoming; 00:00 Istanbul (`21:00Z` the previous UTC day) → live;
  - 23:59:59 Istanbul → live; the next Istanbul midnight → null;
  - a Summit time late in the Istanbul day whose UTC date differs;
  - null `now`, missing date and invalid date → null.
- [x] 3.3 `apps/web/components/summit/summit-day-badge.tsx` (`"use client"`): `useBrowserNow()` passed to `summitDayState`. Renders "Upcoming" / "Yaklaşan" (`--color-state-upcoming`) or "Live" / "Şimdi" (`--color-state-live`) as text, and nothing for null. Never uses a summit token. Not used for archive editions.
- [x] 3.4 Confirm that no motion or transitions are added beyond the shared L3 primitives, and that `check:reduced-motion-css` passes.

## 4. Documentation

- [x] 4.1 `design/content-model.md`: change the Galactic Summit `speakers` row from `relation[]` to `component[]`, `{speakerName, role?, portrait?}` (design.md, "Documentation correction"). Bump that document's "Last updated" date.
- [x] 4.2 `apps/web/components/summit/README.md` covering:
  - environment variables;
  - the publish-integration handoff: invalidate tag `galactic-summit` and revalidate `/en/galactic-summit`, `/tr/galactic-summit` and `/sitemap.xml` on publish, unpublish, update or delete in either locale;
  - the exactly-one-current rule and the editor fix for each failure;
  - the theming bounds and the ember guard, PDF rules, and why sponsors are absent;
  - the Upcoming/Live calendar-day rule;
  - the `istanbulDayKey`/`"Europe/Istanbul"` consolidation follow-up with schedule-calendar, and how to run the tests.

  Do **not** edit `docs/HANDOVER.md` or `docs/ops/cms-runbook.md`.
- [x] 4.3 Have a bilingual reviewer approve the spec's copy table, and record the reviewer in the PR.
  - **Evidence (2026-10-01):** approved in human bilingual review by the change owner (rertus25): the complete EN/TR table in the spec's "Bilingual interface copy" requirement, exactly as proposed. Two corrections were made during review: the Turkish partner CTA "Partnerimiz olun (PDF)" became "İş ortağımız olun (PDF)", and the Turkish no-date string "Tarih açıklanacak" became "Tarih yakında açıklanacak".

## 5. Verification

- [x] 5.1 Create `tests/summit/` with its own `package.json` and lockfile (`@playwright/test` 1.63.0, `esbuild` 0.28.2, `@axe-core/playwright`), plus `playwright.config.ts`, `serve.mjs`, `fixture.tsx`, `server.tsx` and `client.tsx`. The root `package.json` is not modified.
- [x] 5.2 `tests/summit/summit.spec.ts` (Chromium and Firefox; en and tr; 320 and 1280px), covering:
  - no-JS neutral HTML: no badge or time-state attribute, the date `datetime`, and the brand `lang="en"` on tr;
  - hydration without errors;
  - controlled clock: Upcoming before the Summit's Istanbul day, Live on that day, no badge after it;
  - the Istanbul-midnight transitions while the page is open, under `timezoneId` UTC, Europe/Istanbul and America/New_York;
  - an old build opened on and after the day, with no badge or `data-time-state` in server HTML;
  - Register link vs. plain label, with no `disabled`/`aria-disabled`;
  - partner link present vs. absent;
  - a PDF click sends exactly one "Sponsorship PDF opened" event (stubbed `window.va`);
  - each `accentToken` × `heroTreatment` renders, and no interactive element or Upcoming/Live badge computes to a summit token;
  - sponsor names absent;
  - a sparse edition omits headings;
  - no horizontal scroll, reduced motion with no animations, and axe with zero violations before and after mount.
- [x] 5.3 `tests/summit/check-routes.mjs`: real `next build` and `next start` against a synthetic Strapi. It must:
  - prove these builds fail: none current, two current, a bad PDF host, still without an image;
  - for 0, 1 and 4 editions, plus sponsors-present: confirm both routes are prerendered with `initialRevalidateSeconds: false`;
  - confirm serving makes zero CMS requests, the sitemap has both URLs, and the switcher targets are correct;
  - confirm sponsors are absent from the HTML and route JS is within budget.
- [x] 5.4 `tests/events/check-routes.mjs`: its synthetic Strapi returns an empty, valid page for `/api/galactic-summits` (routing only, no assertion changes). Confirm that `events-baseline` still passes.
- [x] 5.5 Add `.github/workflows/tier-b-summit.yml` per design D10 (`timeout-minutes: 10`, exactly the D10 path list, not required). Verify by inspection that a change touching only another route directory does not match. **CI gate:** this workflow plus Tier A. Site-wide axe and Lighthouse are not covered until `verification-browser-gates`; say so in the PR.
- [x] 5.6 Run Tier A locally (typecheck, lint, stylelint, reduced-motion, locale parity, budgets, content and media tests, build, check:budgets) and the full Summit suite. Run the events and time-state suites too.

## 6. Live acceptance (manual; check only with real evidence)

These depend on media-pipeline's live checks and the Vercel deployment (Dev 4 and flight-ops). Keep them unchecked until they are actually performed.

- [ ] 6.1 Real image delivery: the current edition's `backgroundImage`, a speaker portrait and a photo load from `https://media.kuasar.org/…` on the built page.
- [ ] 6.2 Real resized delivery: those images are served through `/cdn-cgi/image/…` at the expected widths (depends on media-pipeline 7.3).
- [ ] 6.3 Live alt-text admin flow: publishing a Summit image is blocked without `altEn`/`altTr` (depends on media-pipeline 7.4).
- [ ] 6.4 Real-photo CLS: Lighthouse on the Summit page with real mixed-orientation photos records CLS < 0.1 (depends on media-pipeline 7.5).
- [ ] 6.5 Real sponsorship PDF: an approved PDF is uploaded through the admin by its owner, the build accepts it, and it opens from `media.kuasar.org` with `Content-Type: application/pdf`. Planning and implementation never upload or modify a production PDF.
- [ ] 6.6 Vercel analytics: after deployment, opening the PDF shows a "Sponsorship PDF opened" event in Vercel Web Analytics.
- [ ] 6.7 Publish-to-live: publishing a Summit change in Strapi updates the live page (depends on Dev 4's publish-integration). Until then, confirm a rebuild picks it up.
- [ ] 6.8 Human keyboard and screen-reader pass (VoiceOver or NVDA) on both locales, on phone and desktop.
