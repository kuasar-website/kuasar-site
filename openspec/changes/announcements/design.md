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
