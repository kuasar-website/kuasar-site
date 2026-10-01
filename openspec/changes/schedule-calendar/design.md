## Context

See proposal.md, "Why". These are the facts that shape the approach, as they stand on
`main` at `5775285`:

- **Schema:** `apps/cms/src/api/schedule-event/content-types/schedule-event/schema.json`
  defines `startsAt` (datetime, required), `endsAt` (datetime), `type` (enum, required),
  `url` (string, `^https?://`). These are locale-independent. `title` (required),
  `location` and `description` are localized. Draft and publish are enabled. There is no
  slug, all-day flag or timezone field.
- **Time representation:** Strapi 5 stores `datetime` in UTC and returns ISO strings
  with `Z` (e.g. `2026-11-07T07:00:00.000Z`). The admin interprets editor input in the
  editor's browser zone. These strings satisfy `lib/time/date.ts` `parseISO`'s
  offset-required pattern. The date-only branch of that contract is never produced by a
  Strapi `datetime`.
- **Shared time primitive** (`apps/web/lib/time/**`, `client-time-state`): `parseISO`,
  `classifyTime` (start inclusive, end exclusive, no-end means an instant),
  `useBrowserNow` (null on the server and during hydration; ticks each second and on
  focus or visibility), `formatDate`, and `<DateTime>`.
- **Nearest pattern** (`events-showcase`): `lib/events/data.ts` (published-only,
  paginated, validated, tr-over-en by `documentId`, force-cache, one tag, runbook-pointing
  errors), `components/events/{content,page}.tsx` (`eventsConfigured()`, per-locale
  thin route files with `dynamic = "error"`, `dynamicParams = false`,
  `revalidate = false`), `app/sitemap.ts`, and `tests/events/**` with its own lockfile
  and a Tier B workflow.
- **Routing:** `lib/i18n/segments.ts` already maps `schedule ↔ takvim`; the shell's
  `NAVIGATION_ITEMS` already links it; `sectionAlternates('schedule', …)` already works.
- **Tokens:** `--color-event-{talk,screening,summit,workshop,other}` and
  `--color-state-{live,upcoming,past}` are present in `apps/web/app/globals.css`.

## Goals / Non-Goals

**Goals:**
- A schedule that is correct for any visitor at any time after any build, with a
  no-JS baseline that loses no information.
- Reuse `client-time-state` unchanged. Keep calendar arithmetic pure and unit-testable.
- No interference with PR #34. That means no edits to `docs/HANDOVER.md`,
  `docs/ops/cms-runbook.md` or the root `package.json`.

**Non-Goals:**
- Per-event detail pages, iCal/ICS export, week or day views, filtering by type, and
  URL-addressable months.
- Extending the shared time primitive's public contract.
- Site-wide axe and Lighthouse (`verification-browser-gates`), and the revalidation
  webhook (`publish-integration`).

## Decisions

### D1. Two renders of one dataset: a neutral list (server) and a grid (after mount)

The server cannot know which month to show without reading a clock (`docs/adr/0001-stack.md`
§3). So the server render, and the first client render, is a **chronological list
grouped by month**. That grouping is a pure function of the data. After
`useBrowserNow()` returns a value, the same client component adds the grid, the
controls and the legend, and narrows the agenda to the visible month.

*Alternative rejected:* render a server-chosen month and correct it after hydration. That
bakes a build-time month into the HTML, which is the exact error ADR 0001 names, and it
shows a no-JS visitor a stale month forever. *Also rejected:* a grid rendered entirely on
the client with nothing on the server. A no-JS visitor and crawlers would get nothing.

**Layout shift:** inserting the grid after mount moves the agenda down. Mitigation: the
grid region gets a reserved `min-height` only under `@media (scripting: enabled)`, so a
no-JS visitor never sees an empty box. Lighthouse CLS stays with
`verification-browser-gates`.

### D2. Calendar time zone is fixed to Europe/Istanbul, and labelled

The events are physical events in Istanbul, so a viewer in New York should see
"Tuesday 19:00 (Istanbul)", not a different day. All day and month placement and every
displayed time use `timeZone: "Europe/Istanbul"` through `Intl.DateTimeFormat`. A visible
note says so in each locale. "Now" is still the browser instant: `classifyTime` compares
absolute instants, so state is right in any zone, and only the calendar position is
Istanbul's. Turkey has used UTC+3 with no DST since 2016. Using the IANA name rather than
a hard-coded offset keeps us correct if that ever changes.

*Alternative rejected:* the visitor's device zone. It makes the grid differ per viewer,
puts a 22:30Z event on a different day for half the audience, and is untestable without
per-zone fixtures. *Also rejected:* UTC, the `formatDate` default. It shows Istanbul events
three hours early.

Implemented as pure helpers in `apps/web/lib/schedule/calendar.ts`:
- `istanbulDayKey(instant)` → `YYYY-MM-DD`, via `formatToParts`;
- `monthMatrix(year, month)` → Monday-first weeks;
- `daysOccupied(start, end)`;
- `monthOf(instant)`.

They take the instant as an argument and never read a clock. `lib/time` is untouched; it
already provides parsing and classification. Calendar placement is schedule-specific,
and `client-time-state` keeps its smaller contract.

### D3. Week starts Monday in both locales

It is the Turkish and ISO convention, it matches where the events happen, and it gives
both locales one grid. Weekday names come from `Intl` per locale.

### D4. Multi-day and month-spanning events come from `[startsAt, endsAt)`

The schema is sufficient. An event occupies each Istanbul day its half-open interval
overlaps. With no end, or an end equal to the start, it occupies the start day only. An
end at exactly 00:00 Istanbul does not spill into the next day. That matches
`classifyTime`'s end-exclusive rule, so placement and state agree.

**Gap, accepted:** there is no all-day flag, so every event displays a time. A Summit day
is entered as, say, 09:00–18:00. This is a presentation limit, not a correctness one,
so it is not a blocker and no field is invented. If the team later wants all-day
rendering, that is a schema change through `cms-platform`.

### D5. Month navigation is client-local state, not URL-addressable

The only correct default entry point is "the current month", which only the browser
knows. A `?month=` query would need `useSearchParams` and a Suspense client bailout on a
statically generated page. A `#2026-11` hash would collide with the in-page agenda anchors
that Enter-on-a-day relies on. Sharing a specific month is low value for this site. If it
is wanted later, it can be added inside this capability without a data-contract change.
State: `{ followToday: boolean, year, month }`. Prev and next set `followToday = false`;
Today sets it to true. While `followToday` is true, crossing a month boundary moves the
grid.

### D6. Data loader mirrors events-showcase and has no shared-code refactor

`apps/web/lib/schedule/data.ts` copies the events loader's structure rather than
abstracting it:
- `/api/schedule-events`, with `status=published`, `sort[0]=documentId:asc`,
  `pageSize=100`, and every page followed;
- `force-cache`, tag `schedule-calendar`, `revalidate: false`;
- an optional `STRAPI_API_TOKEN` bearer;
- a defensive skip of rows without `publishedAt`;
- the same Turkish-over-English merge by `documentId`, keeping `contentLocale` for
  `lang` marking.

A shared loader would touch merged events code during #34's review window. Two clear
copies of roughly 60 lines are cheaper for a future maintainer than an abstraction with
one design point. Record this as a refactor candidate once a third CMS collection is
wired.

Locale behaviour follows events-showcase exactly: the Turkish route falls back to
English per document, and the English route shows English publications only. A
Turkish-only document does not appear on `/en/schedule`. This is consistent with
i18n.md, where English is the fallback target and not the fallback source.

### D7. Validation is strict, including the interval

Every malformed or missing contract field fails the build loudly with the runbook pointer
(ADR 0001, Consequences: a silent wrong answer is worse than a loud stop). The failures
are:
- a missing or non-ISO `startsAt`;
- a non-ISO `endsAt`;
- **an `endsAt` earlier than `startsAt`**;
- a `type` outside the enum;
- a missing title;
- a bad `url`.

The error names the `documentId`, the field(s) and the locale. Strapi enforces most of
these, so a violation there means schema drift or a broken proxy.

Strapi does **not** enforce `endsAt >= startsAt`, so an editor can publish a reversed
interval. It is still treated as invalid CMS data, not degraded around. Placing such an
event on its start day with no state marker would publish a calendar entry whose time is
known to be wrong, and nobody would notice. A failed build is visible, names the record,
and leaves the last good deployment serving. The fix is a one-field edit in the admin.
`endsAt == startsAt` is valid and denotes an instant, consistent with `classifyTime`.

*Alternative rejected:* render the event degraded and emit a build warning. Warnings in a
Vercel log are read by nobody, and the wrong entry would stay live indefinitely.

Text fields are trimmed, and empty optional strings become absent.

### D8. Localized event URLs

`url` is a single locale-independent field, so both locales link to the same URL. That
needs no schema change. A localized link destination cannot be represented, and no
workaround is built. The link text is localized ("Details" / "Ayrıntılar"), and the
event title is used as context in its accessible name.

### D9. Accessibility model

The grid is a `<table>` with a `<caption>` (the month and year, which also drives the
polite live region), `<th scope="col">` weekdays, and day cells holding a
`<button>`. It uses roving `tabindex`, so the grid is one Tab stop, with the WAI-ARIA APG
date-grid keys (arrows, Home/End, PageUp/PageDown). Each day button's accessible name is
the full date plus its event count. Enter or Space moves focus to that day's first agenda
`<article>`, which has `tabindex="-1"` and a stable `id`. Event chips inside cells are
`aria-hidden`, so the count is announced once and the detail lives in the agenda. That is
the sane reading order. Type is shown visibly as text in chips (`md+`), in the agenda and
in the legend. Live state is a visible badge; upcoming and past have visually-hidden
labels. `forced-colors` keeps borders and focus outlines.

### D10. Motion tier: none

There is no L1, L2 or new L3 animation, and no library. Controls and links reuse the
existing three interaction types and their L3 CSS states. The route's first-load JS
grows by one client component (calendar plus `Intl`, no dependencies). The target is
under 15 KB gzip, inside the 175 KB default route budget, and is checked by Tier A
`check:budgets`. No import reaches an animation library.

### D11. Verification: a new Tier B workflow instead of extending events or time-state

- **New** `tests/schedule/` with its own `package.json`/lockfile: `@playwright/test`,
  `esbuild` and `@axe-core/playwright`. These are test-only and do not touch the root
  `package.json`.
- **New** `.github/workflows/tier-b-schedule.yml`. It runs on `pull_request` to `main`
  and on pushes to `change/schedule-calendar`, has `timeout-minutes: 10` (the ADR 0004
  Tier B target), and is not a required check, so path filtering at the trigger is
  acceptable. (The time-state workflow moved its filter into steps only because it is
  required.) The path filter is the narrowest set that can change schedule behaviour:

  | Path | Why it is included |
  | --- | --- |
  | `apps/web/app/*/(schedule)/**` | The two route files. `*` matches the `[locale]` folder without escaping brackets in a GitHub glob |
  | `apps/web/app/sitemap.ts` | Schedule sitemap entries |
  | `apps/web/app/globals.css` | `--color-event-*` and `--color-state-*` tokens |
  | `apps/web/lib/schedule/**`, `apps/web/components/schedule/**` | The capability itself |
  | `apps/web/lib/time/**` | `parseISO`, `classifyTime`, `useBrowserNow` |
  | `apps/web/lib/i18n/**` | Segment map, switcher targets, `sectionAlternates` |
  | `apps/web/lib/strapi/**` | The CMS fetch contract |
  | `tests/schedule/**` | The suite and its own lockfile |
  | `.github/workflows/tier-b-schedule.yml` | The workflow itself |
  | `package-lock.json`, `apps/web/package.json` | Genuinely needed: a Next or React upgrade changes static generation and hydration, which this suite exists to catch |
  | `.nvmrc` | Genuinely needed: the Node version determines the ICU time-zone data behind `Europe/Istanbul` formatting |

  Deliberately **excluded:** other route directories under `apps/web/app/**`,
  `apps/web/components/**` outside `schedule/`, and `tests/events/**`. A change to an
  unrelated route does not run this suite. The accepted gap is that a shell or layout
  change that breaks the schedule is not caught here. It is caught by Tier A, by
  tier-b-events (which already triggers on all of `apps/web/**`), and later by the
  site-wide axe in `verification-browser-gates`.
- **Time budget:** two production builds (0 and 50 events), plus Chromium and Firefox,
  plus axe. tier-b-events runs a comparable shape in about 3 minutes. If the suite nears
  10 minutes, trim the browser matrix (Firefox desktop only) before raising the timeout.
- **Why not extend tier-b-time:** that is a required check and a primitive-level fixture,
  and coupling a consumer's route build to it would make every `apps/web` PR pay for the
  schedule's production builds. **Why not extend tier-b-events:** it would blur ownership
  and make one capability's failure block the other's signal.
- **Steps:**
  1. `node --test apps/web/lib/schedule/*.test.ts` for unit derivation.
  2. Playwright on an esbuild fixture under `page.clock` (Chromium and Firefox; 320, 768
     and 1280px; en and tr; device zones UTC, Europe/Istanbul and America/New_York via
     `timezoneId`).
  3. axe on the fixture before and after mount.
  4. `check-routes.mjs`: real `next build` and `next start` against a synthetic Strapi
     with 0 and 50 events. It asserts prerendering, `initialRevalidateSeconds: false`,
     no CMS requests while serving, wrong-locale 404s, the sitemap and the route JS
     budget.
- **Required cross-change edit:** `tests/events/check-routes.mjs`'s synthetic Strapi
  currently answers every path with event rows. Once the schedule loader exists, the
  events route build would request `/api/schedule-events` and fail validation. That
  server must return an empty, valid page for `/api/schedule-events`. Symmetrically, the
  schedule's synthetic CMS returns empty pages for the events collections.

## Risks / Trade-offs

- [The schedule is stale until publish-integration exists] → The same accepted limitation
  as events-showcase. The README names the tag and paths that publish-integration must
  revalidate. No cron or time-based revalidation is added (constitution).
- [The no-JS list grows with years of history] → Acceptable at the expected volume (tens
  per year). If it hurts, the remedy is a later data-side decision, not a server
  "now" filter.
- [Clock ticks every second and re-renders the grid] → Memoise the month matrix and the
  placement map by `(year, month, data)`. Only state classification recomputes per tick.
  That is O(events), with events numbering in the tens.
- [`@media (scripting)` is unsupported in an old browser] → The only effect is a small
  layout shift on mount. Content is unaffected.
- [A single editor typo (`endsAt` before `startsAt`) blocks every deploy until fixed] →
  Accepted deliberately (D7). The error names the record and both fields, the last good
  deployment keeps serving, and the README documents the one-field fix.
- [The timezone note hard-codes "GMT+3"] → True since 2016 (no DST). Placement and
  formatting use the IANA zone, so only this copy string would need editing if Turkey
  reintroduced DST.
- [Events check-routes edit lands in another capability's test] → It is a minimal,
  additive change to the synthetic server's routing only, with no assertion changes,
  called out in the PR.

## Migration Plan

This is additive. Merging enables the routes once `STRAPI_URL` is set in the build
environment, which the frontend already requires for events. Public read access to
`schedule-event` find/findOne is already enabled (cms-platform). To roll back, revert the
PR; no data or schema migration is involved.

## Copy

Type labels are approved (en: Talk / Screening / Summit / Workshop / Other; tr: Söyleşi
/ Gösterim / Zirve / Atölye / Diğer). The remaining fixed strings are specified exactly
in the spec's "Bilingual interface copy" requirement, and all of them live in one table
in `components/schedule/copy.ts`.

## Open Questions

- Sign-off on the non-type strings in the copy table (timezone note, empty states,
  controls, live-region message) by a bilingual reviewer. Wording changes stay inside
  `copy.ts` and do not change the structure.
