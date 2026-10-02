## Why

The primary navigation already links to `/en/schedule` and `/tr/takvim`, but no route
exists behind them. Schedule is the forward-looking view of what KUASAR is doing next, and
it is the entity where computing "now" on the server is most tempting and most visibly
wrong (`design/content-model.md`, Schedule Event; `docs/adr/0001-stack.md` §3). Both
blockers are gone: `client-time-state` and `cms-platform` are merged, the Schedule Event
content type is live in Strapi, and `design/tokens.md` now defines the event-type colour
aliases this view needs.

**Audience:** prospective members, who need to know when the next talk, screening,
workshop or Summit day happens. Sponsors are served only through credibility — an
up-to-date calendar reads as an active team.

## What Changes

- New statically generated routes `/en/schedule` and `/tr/takvim`, using the existing
  segment map, shell, language switcher and section metadata.
- A build-time loader for **published** Schedule Event documents in both locales, following
  the events-showcase pattern: pagination, validation, Turkish-over-English fallback by
  `documentId`, an explicit runbook-pointing failure, one cache tag, and no request-time
  fetch.
- A **neutral server baseline**: every event in one chronological list grouped by month,
  with type labels, localized dates and times in Europe/Istanbul, and no claim about "now".
  It is complete without JavaScript and is the permanent fallback.
- A **client enhancement**, after mount: a Monday-first month grid that opens on the
  browser's current Istanbul month, previous/next/today controls, an event-type legend,
  past/live/upcoming state derived from the browser clock, and the agenda narrowed to the
  visible month. There is no animation.
- Sitemap entries for both schedule routes whenever the CMS is configured, including when
  there are zero events, because the route always exists in that case.
- An isolated test package (`tests/schedule`) and a path-filtered Tier B workflow covering
  unit derivation, controlled-clock browser tests in both locales, axe on the schedule
  fixture, and real production builds against a synthetic Strapi. The events route check's
  synthetic CMS is taught to answer the new collection.

No CMS schema change. No root `package.json` change. No new runtime dependency. The
only new dependency is `@axe-core/playwright`, and it is test-only, inside
`tests/schedule`'s own lockfile.

## Capabilities

### New Capabilities

- `schedule-calendar`: the bilingual Schedule route, from published Schedule Event data
  through to a neutral baseline list, plus the client-derived month grid, time state,
  legend and keyboard model, and the verification that holds it to those rules.

### Modified Capabilities

None. `client-time-state` is consumed unchanged. Its helpers (`parseISO`,
`classifyTime`, `useBrowserNow`) cover the state derivation. Calendar-specific zoned-day
arithmetic is added inside this capability and does not extend the shared contract.

## Impact

- **Storage:** Schedule Event is a Strapi entity only (`design/content-model.md`). Nothing
  moves to git, and no entity is split.
- **Fields consumed:** the existing schema exactly: `documentId`, `locale`, `publishedAt`,
  `startsAt`, `endsAt`, `type`, `title`, `location`, `description`, `url`. No field is
  added.
- **Code:** new `apps/web/lib/schedule/**`, `apps/web/components/schedule/**`,
  `apps/web/app/[locale]/(schedule)/**`; a modified `apps/web/app/sitemap.ts`; new
  `tests/schedule/**` and `.github/workflows/tier-b-schedule.yml`; a modified
  `tests/events/check-routes.mjs` (its synthetic CMS must return an empty
  `schedule-events` collection, or the events build check would break).
- **Not touched:** `docs/HANDOVER.md` and `docs/ops/cms-runbook.md` (both are open in
  PR #34; the revalidation handoff is documented in the component README instead, as
  events-showcase did), `apps/cms/**`, the root `package.json`, and `lib/time/**`.
- **Downstream:** `publish-integration` must invalidate the new `schedule-calendar` tag
  and revalidate both routes plus the sitemap. Until then, a rebuild publishes changes.
  This is the same accepted limitation as events-showcase.
- **Explicitly out of scope:** Timeline (backward-looking, git-backed, its own routes);
  the Galactic Summit page; publish-integration, webhooks and preview; CMS schema changes;
  any L1/L2 animation or signature work; content-backup; a home-page Schedule section;
  per-event detail pages (the schema has no slug); site-wide Lighthouse/axe
  (`verification-browser-gates`).
