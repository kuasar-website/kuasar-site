## Why

Announcements are Strapi-resident content (`docs/adr/0002-cms.md` §2;
`design/content-model.md`) — the news list and detail pages sponsors,
press, and prospective members read for credibility. `cms-platform` (merged)
already defines the `Announcement` content type; nothing yet consumes it.
This change builds the typed, testable consumption layer — response
mapping, pin/date ordering, and the silent locale-fallback selection
`design/i18n.md` requires — everything that does not require a live page
shell or a revalidation contract to exist first.

## What Changes

- Add a typed mapper (`apps/web/lib/cms/announcements.ts`) from Strapi 5's
  REST response shape for `Announcement` (per
  `apps/cms/src/api/announcement/content-types/announcement/schema.json`)
  into a validated domain type, failing closed on a malformed or
  unexpected shape rather than passing through `undefined`s.
- Add pin/date ordering: pinned entries first, then by `publishedAt`
  descending within each group — an assumption recorded here because
  `docs/task-assignments.html` says only *"sorted by `publishedAt` with
  pinned entries first"* without stating the secondary direction.
- Add the silent locale-fallback selection `design/i18n.md` requires: given
  an announcement's English and (possibly absent) Turkish locale variants —
  matched by Strapi 5's shared `documentId` across locale variants — select
  which to display for a requested locale, falling back to English without
  a notice and without a 404.
- Correct a factual error in `design/i18n.md`: it states *"Strapi's own
  i18n handles this [silent fallback]"* — verified false. Strapi 5's REST
  API does not fall back to the default locale automatically (confirmed
  against Strapi's own docs and a tracked upstream issue,
  strapi/strapi#12799); querying a locale with no localization returns
  nothing. The fallback must be application code, which is what this
  change adds.

Out of scope, by design, and blocked on capabilities that do not exist yet:
- **`app/[locale]/(news)/` pages** — blocked by `site-shell` (Dev 2). No
  `app/[locale]/` directory exists anywhere in the repository yet
  (confirmed: `git ls-tree -r origin/main -- apps/web/app` shows only the
  original scaffold plus `robots.ts`/`sitemap.ts`). This change does not
  create placeholder routes to work around that.
- **Live fetching against a real Strapi instance** — blocked by
  `publish-integration` (Dev 4). No base-URL environment variable or
  revalidation-tag convention exists anywhere in the codebase yet (checked:
  no capability calls `fetchStrapi`, no env var referenced in
  `docs/HANDOVER.md` or `docs/ops/cms-runbook.md`). Inventing one now would
  bind every future Strapi-backed capability to a convention this change
  has no authority to set. This change consumes already-fetched Strapi JSON
  as a parameter; it does not fetch it.
- **Rich-text rendering** and the empty/one/many-entries UI — page-level
  concerns, `site-shell`/whichever page composes these routes.

## Capabilities

### New Capabilities
- `announcements`: typed Strapi-response mapping, pin/date ordering, and
  silent locale-fallback selection for the Announcement content type.

### Modified Capabilities
(none)

## Impact

- **Audience served:** Serves credibility and, per `design/content-model.md`,
  is a normal navbar section — not sponsor- or member-CTA-specific on its
  own.
- **New runtime dependency:** none.
- **Content storage:** touches no storage decision — `Announcement` is
  already Strapi-resident, defined by `cms-platform`. This change adds no
  Strapi field and reads the schema, does not modify
  `apps/cms/src/api/announcement/**`.
- **Affected code:** `apps/web/lib/cms/announcements.ts` and its tests.
  Nothing under `app/[locale]/`, nothing in `apps/cms/`, nothing in
  `apps/web/lib/strapi/fetch.ts` (Dev 1's file — read, not modified).
- **Blocked, not built here:** the actual page routes (`site-shell`) and the
  live-fetch/base-URL/revalidation wiring (`publish-integration`) — see
  "What Changes," Out of scope.
- **Documentation correction flagged, not made unilaterally:** `design/i18n.md`'s
  "Strapi's own i18n handles this" claim is factually wrong (see above).
  Recorded here for visibility; changing that shared document is offered as
  a follow-up, not done as part of this capability's own file scope.
