## 0. Preconditions (verify, do not change)

- [ ] 0.1 Confirm against `main` that the `schedule-event` schema still matches design.md, Context, field for field. Any drift: stop and update this change first.
- [ ] 0.2 Use context7 to confirm the current Next.js 16 App Router APIs used here (`generateStaticParams` with parent params, `dynamic = "error"`, fetch `next.tags`, `useSyncExternalStore` hydration behaviour). Record any deviation from the events-showcase pattern in design.md before coding.

## 1. Pure calendar logic (no React, no clock)

- [ ] 1.1 `apps/web/lib/schedule/calendar.ts`: `istanbulDayKey`, `monthOf`, a Monday-first `monthMatrix`, `daysOccupied` (half-open, instant on start day, no spill at midnight), `addMonths`, and overlap-with-month. Every function takes instants as arguments; none reads `Date.now()`.
- [ ] 1.2 `apps/web/lib/schedule/calendar.test.ts`: the 22:30Z → next Istanbul day case; a multi-day event; a month-spanning event; an end exactly at Istanbul midnight; an equal start and end (instant); December→January; leap February; 0, 1 and 50 events. Run under `TZ=UTC` and `TZ=America/New_York` with identical results.

## 2. Data loader (build/revalidation only)

- [ ] 2.1 `apps/web/lib/schedule/data.ts`, mirroring `lib/events/data.ts`:
  - published only, all pages, tag `schedule-calendar`, `force-cache`, `revalidate: false`, optional bearer token;
  - tr-over-en by `documentId`, with `contentLocale` kept;
  - validates exactly the schema fields per design D7: every violation, including `endsAt` earlier than `startsAt`, fails with the `documentId`, field(s), locale and a runbook pointer. No skip, no degraded render, no warning-only path;
  - stable `startsAt` ordering.
- [ ] 2.2 `apps/web/lib/schedule/data.test.ts` covers:
  - drafts skipped, multi-page, duplicate across pages, wrong locale;
  - fallback merge, English route excludes Turkish-only documents;
  - each D7 failure names the `documentId` and field;
  - a reversed interval throws, naming the `documentId` and both fields; an equal start and end is accepted as an instant;
  - an unreachable fetcher produces the Strapi/runbook message;
  - zero, one and fifty records.

## 3. Neutral baseline (ships first, no JS required)

- [ ] 3.1 `apps/web/components/schedule/copy.ts`: one en/tr table holding, verbatim:
  - the spec's "Bilingual interface copy" strings (heading, timezone note, both empty messages, Previous month/Önceki ay, Next month/Sonraki ay, Today/Bugün, the live-region message, the live badge);
  - the approved type labels;
  - state labels, "N events"/"N etkinlik", "+N more"/"+N daha", "Details"/"Ayrıntılar".

  `{month}` comes from `Intl.DateTimeFormat` in Europe/Istanbul.
- [ ] 3.2 `apps/web/components/schedule/schedule-calendar.tsx` (client), pre-mount output only:
  - chronological list grouped by Istanbul month;
  - `<time dateTime>` with Istanbul-formatted date and time per locale;
  - visible type label, `lang="en"` on fallback content, optional location, description and link;
  - zero-state message;
  - no state attributes.
- [ ] 3.3 `apps/web/components/schedule/content.tsx` (server-only): `scheduleConfigured()` (throws in production without `STRAPI_URL`) and a cached `loadSchedule(locale)`. Add `page.tsx` (params, metadata via `sectionAlternates('schedule', …)`, page).
- [ ] 3.4 Add the routes `apps/web/app/[locale]/(schedule)/schedule/page.tsx` and `.../takvim/page.tsx` with `dynamic = "error"`, `dynamicParams = false` and `revalidate = false`, matching the events route files.
- [ ] 3.5 `apps/web/components/schedule/schedule.module.css`: tokens only (no raw colours or durations), no horizontal scroll at 320px, Turkish strings untruncated, `forced-colors` support.
- [ ] 3.6 `apps/web/app/sitemap.ts`: emit both schedule URLs with alternates whenever the CMS is configured and `NEXT_PUBLIC_SITE_URL` is set (zero events included). Leave the events and timeline entries unchanged.
- [ ] 3.7 Confirm by local build with JS disabled: both locales show the full list. Review the baseline before starting section 4.

## 4. Client enhancement (built on the reviewed baseline)

- [ ] 4.1 After `useBrowserNow()` is non-null:
  - visible-month state `{ followToday, year, month }` with prev, next and today;
  - grid follows month rollover only while `followToday` is set;
  - memoised matrix and placement;
  - agenda narrowed to the visible month, with a per-month empty message.
- [ ] 4.2 Grid semantics and keyboard per design D9:
  - table with caption, Monday-first `th scope="col"`, roving `tabindex` day buttons;
  - arrows, Home/End and PageUp/PageDown, crossing months with focus kept;
  - Enter/Space focuses the day's first agenda article;
  - polite live region for the month name.
- [ ] 4.3 State: `classifyTime` per event; state tokens only; a visible live badge; visually-hidden upcoming and past labels; nothing for null.
- [ ] 4.4 Legend of all five types (swatch plus localized label). Chips show the type text at `md+`. Below `md`, cells show the day number and per-type counts, and overflow becomes "+N more".
- [ ] 4.5 Reserve the grid's `min-height` under `@media (scripting: enabled)` only. No transitions beyond the existing L3 primitives.

## 5. Verification

- [ ] 5.1 Create `tests/schedule/` with its own `package.json` and lockfile (`@playwright/test` at the same pin as tests/events, `esbuild`, `@axe-core/playwright`), plus `playwright.config.ts`, `build.mjs`, `serve.mjs`, `fixture.tsx`. The root `package.json` is not modified.
- [ ] 5.2 `tests/schedule/schedule.spec.ts` (Chromium and Firefox; en and tr; 320/768/1280px), covering:
  - no-JS neutral HTML;
  - hydration with no mismatch warnings;
  - built "August", opened under a December `page.clock` → December grid;
  - upcoming→live→past as the clock advances;
  - month rollover while following today;
  - prev/next/today accessible names, plus live-region text that exactly matches the copy table ("Showing November 2026" / "Kasım 2026 gösteriliyor") and the empty-month text;
  - keyboard walk across a month boundary, then Enter to the agenda;
  - the 22:30Z case under `timezoneId` UTC, Europe/Istanbul and America/New_York;
  - 0, 1 and 50 events, with no horizontal scroll;
  - reduced motion: no transition on month change;
  - axe with no violations, before and after mount.
- [ ] 5.3 `tests/schedule/check-routes.mjs`: real `next build` and `next start` against a synthetic Strapi with 0 and 50 events. Assert:
  - both routes are prerendered with `initialRevalidateSeconds: false`;
  - serving makes zero CMS requests;
  - `/en/takvim` and `/tr/schedule` return 404;
  - the sitemap has both URLs;
  - the switcher targets are correct;
  - route JS is within budget.
- [ ] 5.4 `tests/events/check-routes.mjs`: make its synthetic Strapi return an empty, valid page for `/api/schedule-events`. Change routing only, with no assertion changes, and confirm that `events-baseline` still passes.
- [ ] 5.5 Add `.github/workflows/tier-b-schedule.yml` per design D11 (`timeout-minutes: 10`; exactly the narrow path list in D11, with no `apps/web/app/**` or `apps/web/**` wildcard; not required). Verify by inspection that a change touching only another route directory (for example `apps/web/app/*/(events)/**`) does not match the filter. **CI gate:** this workflow covers the schedule. Tier A covers lint, typecheck, budgets and token rules. Site-wide axe and Lighthouse are not covered until `verification-browser-gates` lands; say so in the PR.
- [ ] 5.6 Run Tier A locally (`npm run lint`, `npm run typecheck`, `npm run stylelint`, `npm run check:budgets` after a build) and the full schedule suite.

## 6. Documentation and handoff

- [ ] 6.1 `apps/web/components/schedule/README.md` covering:
  - environment variables, plus the publish-integration handoff: invalidate tag `schedule-calendar` and revalidate `/en/schedule`, `/tr/takvim` and `/sitemap.xml` on publish, unpublish, update or delete in either locale;
  - the Istanbul timezone rule and the no all-day flag limitation;
  - the D7 failure policy, including how an editor fixes a reversed `endsAt` in the admin when a build fails on it;
  - how to run the tests.

  Do **not** edit `docs/HANDOVER.md` or `docs/ops/cms-runbook.md` (open in #34).
- [ ] 6.2 Have a bilingual reviewer approve the non-type copy (timezone note, empty states, control names, live-region message). The type labels are already approved. Record the reviewer in the PR.

## 7. Live acceptance (manual; check only with evidence)

- [ ] 7.1 Publish a Schedule Event in Strapi (en, and tr for one), rebuild the frontend, and confirm it appears on both routes in its Istanbul day. Record the evidence in the PR.
- [ ] 7.2 Confirm a draft-only event does not appear on either route after rebuild.
- [ ] 7.3 Human keyboard and screen-reader pass (VoiceOver or NVDA) on both locales, on phone and desktop.
