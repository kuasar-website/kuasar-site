# Schedule

`/en/schedule` and `/tr/takvim`: KUASAR's forward-looking calendar of published Strapi
**Schedule Events**. Distinct from Timeline (backward-looking, git-backed), and never
merged with it. The contract is `openspec/changes/schedule-calendar/` until that change is
archived, and then `openspec/specs/schedule-calendar/spec.md`.

## How it renders

- **Server and no-JS baseline:** every published event in one chronological list,
  grouped by month, with localized dates, times, type labels and raw ISO `datetime`
  attributes. It makes no claim about "now". This is the permanent fallback.
- **After mount:** the browser clock picks the month (Europe/Istanbul) and the
  past/live/upcoming state. A Monday-first month grid, previous/next/today controls and a
  type legend appear, and the agenda narrows to the visible month. Month navigation is
  client-local and does not change the URL.
- **No motion:** month and state changes are instant. The controls reuse the shared
  secondary button style from `components/ui/action-link.module.css`.

## Time zone

All placement and displayed times use **Europe/Istanbul**, whatever the visitor's device
zone. The events happen in Istanbul. "Now" is still the browser's instant, so the state is
correct anywhere. The visible note "(GMT+3)" lives in `copy.ts`. Turkey has had no DST
since 2016, and if that changes, only that string needs editing.

There is **no all-day flag** in the schema, so every event shows a time. Enter a Summit
day as, for example, 09:00–18:00.

## Data and failure policy

`lib/schedule/data.ts` loads published `schedule-events` only, following every page, at
build or revalidation time. On `/tr/takvim`, a Turkish publication replaces the English
one by `documentId`. English-only documents fall back silently, marked with `lang="en"`.
The English route shows English publications only.

The build **fails loudly** and names the document, field and runbook when:
- Strapi is unreachable, unauthorised or returns a malformed response;
- an event's `startsAt` is missing or not ISO, or its `endsAt` is not ISO;
- an event's **`endsAt` is earlier than its `startsAt`**;
- an event's `type` is unknown, its title is missing, or its `url` is not an HTTP(S) URL.

Nothing is skipped or rendered degraded. The last good deployment keeps serving.

**An editor sees a build fail with `endsAt ... is earlier than startsAt`:** open that
Schedule Event (the `documentId` is in the message) in the Strapi admin, correct the end
date or time (or clear it for a single point in time), and publish again.

## Environment and publishing handoff

- `STRAPI_URL`: server-only CMS origin. Without it, a local or preview build exposes no
  schedule route, and a Vercel production build fails explicitly.
- `STRAPI_API_TOKEN`: an optional server-only read token. Never expose it.
- `NEXT_PUBLIC_SITE_URL`: the site origin, used by the metadata and the sitemap.

Every fetch uses `force-cache`, no time-based revalidation, and tag
**`schedule-calendar`**. publish-integration's registry (`lib/strapi/registry.ts`) maps
Schedule Event to that tag, and `/api/revalidate` calls `revalidateTag('schedule-calendar', 'max')`
on publish, unpublish, update or delete in either locale (both locales and the sitemap
are covered; no `revalidatePath`, which 404s these routes). Never add a cron.

## Verification

From the repository root, after `npm ci` and `npm ci --prefix tests/schedule`:

- `TZ=UTC node --test apps/web/lib/schedule/*.test.ts`, repeated with
  `TZ=America/New_York`: Istanbul placement, month matrices, validation (including
  reversed intervals) and locale fallback.
- `npm --prefix tests/schedule test` (after
  `npm exec --prefix tests/schedule -- playwright install chromium firefox`). This runs
  Chromium and Firefox in both locales and covers:
  - the no-JS baseline, and hydration of an "August" build opened in December;
  - upcoming→live→past as the clock advances, and month rollover;
  - the controls and live-region copy, and keyboard navigation across months;
  - device zones UTC, Istanbul and New York;
  - 0, 1 and 50 events at 320 and 1280px;
  - reduced motion, and axe before and after mount.
- `node tests/schedule/check-routes.mjs` runs real production builds against a synthetic
  Strapi. It covers the reversed-interval build failure, 0 and 50 events,
  prerendering without revalidation, wrong-locale 404s, the sitemap, the switcher, zero
  CMS requests while serving, and route budgets.

CI runs all three in `.github/workflows/tier-b-schedule.yml`. Site-wide axe and Lighthouse
belong to `verification-browser-gates`, which has not landed yet. Live CMS publishing and
a human screen-reader pass are manual acceptance, and passing fixtures does not prove them.
