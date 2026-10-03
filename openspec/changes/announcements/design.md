## Context

See `proposal.md` — Why. Facts verified before writing this design, not
assumed:

- **Strapi 5's REST response is flattened**, unlike v4: a single item is
  `{ data: { documentId, locale, ...fields } }` directly — no nested
  `attributes` wrapper (verified against Strapi's own migration docs,
  "Strapi 5 has a new, flattened response format for API calls"). A list is
  `{ data: [...], meta: {...} }`.
- **`documentId` is shared across a Document's locale variants** — the same
  announcement's English and Turkish versions share one `documentId` and
  differ in `locale` (verified against Strapi's REST API locale docs).
- **Strapi 5 does not fall back to the default locale automatically.**
  Querying `?locale=tr` for an entry with no Turkish localization returns
  nothing for that entry, not the English version (verified against
  Strapi's own docs plus a tracked upstream issue, strapi/strapi#12799,
  confirming this is expected, documented behavior, not a bug that might
  be fixed). **`design/i18n.md`'s claim that "Strapi's own i18n handles
  this" is factually wrong** — the fallback this project requires must be
  application code. This design provides the selection half of that; the
  fetching half (querying both locales, or however `publish-integration`
  chooses to structure it) is out of scope here.
- `apps/cms/src/api/announcement/content-types/announcement/schema.json`
  (already shipped by `cms-platform`) is the actual, current schema — read
  directly rather than trusted from `design/content-model.md`'s summary.
  It matches: `title`/`slug`/`excerpt`/`body` localized, `pinned`/
  `coverImage` not localized, `draftAndPublish: true` (giving Strapi's own
  `publishedAt`).
- No base-URL environment variable or revalidation-tag convention exists
  anywhere in the codebase (checked: no capability calls `fetchStrapi`,
  nothing in `docs/HANDOVER.md` or `docs/ops/cms-runbook.md`). Inventing
  one now would bind every future Strapi-backed capability
  (`schedule-event`, `galactic-summit`, `stellar-talk`, ...) to a decision
  this change has no authority to make alone.

## Goals / Non-Goals

**Goals:**
- A typed, fixture-tested mapper from Strapi 5's actual flattened response
  shape to a validated domain type, failing closed on anything unexpected.
- Ordering and locale-fallback-selection logic that work purely on
  already-fetched data, so they're fully testable without a live Strapi
  instance, a base URL, or a revalidation contract.
- The silent-fallback requirement actually implemented in code, rather than
  left resting on `design/i18n.md`'s incorrect assumption that Strapi
  provides it.

**Non-Goals:**
- Fetching from a live Strapi instance, choosing a base-URL environment
  variable name, or wiring revalidation tags — all `publish-integration`'s
  territory (Dev 4, not yet proposed).
- Building `app/[locale]/(news)/` pages, or any placeholder route under
  `app/[locale]/` — `site-shell`'s territory (Dev 2, not yet proposed; no
  `app/[locale]/` directory exists in the repository at all yet).
- Rich-text rendering of `body`, or any empty/one/many-entries UI — page-
  level concerns for whichever capability builds the actual routes.
- Editing `apps/cms/src/api/announcement/**` (cms-platform's/Dev 4's
  shipped schema) — read only, not modified.
- Correcting `design/i18n.md`'s wrong claim directly — flagged in
  `proposal.md` and here, offered as a follow-up rather than done as part
  of this capability's own file scope, since it's a shared document other
  capabilities also read.

## Decisions

### The mapper takes an already-fetched, single-locale Strapi response

`apps/web/lib/cms/announcements.ts` exports a function shaped like
`mapAnnouncement(raw: unknown): AnnouncementLocaleContent` operating on one
already-parsed Strapi list-item JSON object (the flattened v5 shape). It
does not fetch anything itself — that keeps it testable with plain fixture
objects and independent of `publish-integration`'s eventual base-URL and
caching decisions. A future fetch function (built alongside
`publish-integration`) calls `fetchStrapi` (Dev 1's file, unmodified here)
and passes each returned item through this mapper.

### Locale-fallback selection operates on a pair, not a fetch strategy

`selectAnnouncementLocale(documentId, variants: { en?: Mapped; tr?: Mapped })`
takes whatever locale variants the caller already obtained (by whatever
method `publish-integration` ends up choosing — two separate queries, a
single `populate` strategy, etc.) and returns the one to display: the
requested locale if present, else `en`, throwing only if neither exists.
This deliberately does not prescribe *how* both variants get fetched —
that decision belongs with whoever builds the live fetch, since it
interacts with caching and revalidation tags this change has no visibility
into.

### Ordering is a pure function over already-mapped data

`orderAnnouncements(entries: Mapped[]): Mapped[]` sorts a list already
produced by the mapper. Kept separate from mapping and fetching so it can
be unit tested against small fixture lists without touching Strapi's
response shape at all.

## Risks / Trade-offs

- **The secondary sort order (newest-first within pinned/unpinned groups)
  is an assumption**, not stated in `docs/task-assignments.html` →
  documented explicitly in `proposal.md` and the spec; cheap to revisit if
  whoever reviews the announcements page disagrees.
- **This change cannot be exercised end-to-end** until both `site-shell`
  and `publish-integration` ship — verification here is necessarily
  fixture-based unit testing, not a working `/en/news` page. Accepted: the
  alternative (a placeholder route, an invented env var) creates exactly
  the kind of throwaway scaffolding this project's documentation
  repeatedly warns against.
- **`design/i18n.md` contains a factual error** that could mislead a future
  contributor building a different Strapi-backed capability into assuming
  the same free fallback. Not fixed directly here (see Non-Goals); flagged
  prominently in `proposal.md` so it surfaces in review rather than
  drifting further.

## launch/news (2026-10-03): pages and live fetch

`site-shell` and `publish-integration` have merged, so the Non-Goals above about pages and
fetching no longer apply. This section decides what was built and why. It points at
existing decisions rather than restating them.

- **Route shape.** `/en/news` and `/tr/duyurular` follow the events and schedule pattern
  exactly: one static route folder per localized segment, `generateStaticParams` returning
  `[{}]` only for its own locale and only when `STRAPI_URL` is set, `dynamic = "error"`,
  `dynamicParams = false`, `revalidate = false`, and `sectionAlternates("news", …)`. A
  Vercel production build without `STRAPI_URL` fails explicitly. Zero announcements is
  an empty message, never a 404 (the schedule rule).
- **Live fetch.** `lib/cms/announcements-data.ts` uses publish-integration's `strapiRead()`
  convention (D4) with the registry tag `announcements`. Published only, every page,
  drafts skipped, tr → en fallback via `selectAnnouncementLocale`. A Strapi publish,
  unpublish or delete therefore reaches the page through `/api/revalidate` with no new
  code, with the same known first-reload gap (publish-integration 6.4).
- **No Draft Mode branch, and preview stays off.** The server-only preview token is
  scoped to the four previewable types (publish-integration 8.1, runbook step 7). A loader
  that followed Draft Mode would fail with 403 for any editor holding a preview cookie from
  another section. Enabling Announcement preview is a separate change: registry,
  `apps/cms/src/preview-url.ts` (which also triggers a CMS deploy), the token's scope, and
  a loader branch.
- **No detail routes yet.** Every `[locale]` route is fallback-false (`dynamicParams =
  false`), so `/news/[slug]` would exist only for slugs present at build time, and a newly
  published announcement's link would 404 until the next deploy (publish-integration D2).
  The list page therefore renders each announcement in full, with its slug as the
  fragment id. Detail routes wait for the same locale-routing decision as 6.4.
- **The body renderer never throws** (`components/news/body.ts`). `parseMissionBody`
  rejects unsupported Markdown because git content is checked in CI. Editor rich text
  isn't, and a throw would fail the build or a revalidation. Supported blocks reuse
  `MissionProse`; everything else becomes escaped text, images are dropped, and links must
  be HTTPS or root-relative (`parseInline`).
- **Mapper correction.** The schema makes `excerpt` and `body` optional and `coverImage` a
  `shared.image` component, so the mapper now accepts `null` for the former and passes the
  component to `toMediaImage` (approved host, dimensions, localized alt).
- **The editorial date is `announcementDate`, never `publishedAt`.** Raised in review and
  verified on Strapi 5.52.3 with a real instance:
  - republishing an edited entry deletes and recreates its published row;
  - so `publishedAt` and `updatedAt` jump to now, and only `createdAt` survives;
  - ordering by `publishedAt` would move any corrected old announcement to the top and
    show the correction date.

  The schema therefore gains `announcementDate` (datetime, required, non-localized, so
  both locales share it). The mapper requires a full date-time and doesn't carry
  `publishedAt`; the loader reads it only to skip draft rows. The order is pinned, then
  `announcementDate` newest first, then `documentId`, which is total and identical in
  both locales. The page shows the date and a 24-hour time in Europe/Istanbul, using the
  schedule's formatters (`lib/schedule/calendar.ts`), so same-day order is visible and
  can be checked live.

  Rejected alternatives:
  - `createdAt`: the draft's creation, not the editorial date, and per-locale;
  - Strapi's `firstPublishedAt`: only behind the global `features.future.experimental_firstPublishedAt`
    flag, which migrates every draft-and-publish table.

  Proven by `tests/news/strapi-order.mjs`. Adding the field makes this change touch
  `apps/cms`, so merging it triggers the digest-verified CMS deploy.
- **Motion:** none. **First-load JS:** the News routes are Server Components with no
  client code of their own; the measured figures are in the PR. **Strapi:** one new
  field, `announcementDate` (datetime, required, non-localized). No migration is needed:
  there are 0 announcements.
