## Context

See proposal.md, "Why". These are the facts on `main` at `b34f34b` that shape the
approach:

- **Schema** (`apps/cms/src/api/galactic-summit/.../schema.json`). Draft and publish are
  enabled, and i18n is on. Locale-independent: `year` (required, unique), `date`
  (datetime, optional), `location`, `isCurrent`, `speakers` (repeatable `summit.speaker`:
  `speakerName` required, `portrait` as `shared.image`, `role`), `photos`
  (`shared.image[]`), `sponsorshipPdf` (single media, `files`), `registrationUrl`
  (`^https?://`), `accentToken` and `heroTreatment` (required enums), `backgroundImage`
  (`shared.image`), and `sponsors` (manyToMany). Localized: `purpose`, `programme`
  (repeatable `summit.programme-item`: `time`, `title` and `description`, all optional
  strings) and `contactAddress`. Strapi does not enforce "exactly one `isCurrent`".
- **Media** (`lib/media/image.ts`, `components/media/media-image.tsx`, `origin.ts`).
  `toMediaImage` validates the host, dimensions and page-locale alt text, with a
  development-only pass-through. `MEDIA_HOST` is `media.kuasar.org`. The pipeline has no
  file or PDF support. The CMS upload allowlist already admits `application/pdf`
  (`apps/cms/config/plugins.ts`).
- **Analytics.** `lib/analytics/events.ts` (a `"use client"` module) exports
  `trackSponsorshipPdfOpened()` and names this page as its intended caller.
- **Interaction primitives.** `ActionLink` (`components/ui/action-link.tsx`) wraps
  `next/link` and deliberately omits `onClick`. `design/motion.md` maps Register to
  Primary and the Summit entry to Secondary outline.
- **Time.** `lib/time` provides `parseISO`, `formatDate(value, locale, timeZone)`,
  `classifyTime` and `useTimeState`. A datetime without an end is an instant.
- **Patterns.**
  - `lib/events/data.ts`: published-only, paginated, tr-over-en, runbook-pointing
    failures.
  - `components/events/{content,page}.tsx`: `*Configured()` and thin route files.
  - `app/sitemap.ts`.
  - `tests/events/**`: its own lockfile, a synthetic-CMS route check and a Tier B
    workflow.
  - The verified Summit `populate` strings in `scripts/content-snapshot/content-types.mjs`
    (`programme` needs an explicit populate, a bug found in PR #34).
- **Routing.** `lib/i18n/segments.ts` maps `galactic-summit` to the same segment in both
  locales, and the navbar already links it.
- **Tokens.** `--color-summit-{aurora,ion,violet,ember}` exist in `globals.css`.
  `design/tokens.md` warns that ember sits near the fire hue.

## Goals / Non-Goals

**Goals:**
- One layout that serves every year, with variation confined to ADR 0002 decision 7's
  three fields.
- Fail loudly on any data the page cannot render truthfully. Never guess an edition.
- Reuse the media pipeline, the time primitive and the analytics contract unchanged.
- No interference with PR #35, publish-integration or media-pipeline.

**Non-Goals:**
- Sponsor display of any kind.
- Per-year sub-routes, edition or speaker detail pages, and lightboxes.
- A home-page Summit section.
- Live CMS, media or analytics verification. Those are recorded as unchecked tasks.

## Decisions

### D1. One route and one page; the archive lives on it

`/[locale]/galactic-summit` is a single statically generated page. The current edition
renders in full and other editions appear below it in an "Other editions" / "Diğer
yıllar" archive, newest `year` first. Because the segment is identical in both locales,
**one** route folder, `app/[locale]/(galactic-summit)/galactic-summit/page.tsx`, serves
both, with `generateStaticParams` returning `[{}]` per configured locale.

*Alternative rejected:* `/galactic-summit/[year]` sub-routes. They add routes, sitemap
entries and switcher cases for little gain at one edition per year, and the content model
asks only that past editions "archive to the side". They can be added later without a data
change, because `year` is already unique.

The archive is ordered by `year`, not by "now". Labelling an edition "past" would need a
clock, so the heading is "Other editions", and only the current edition carries
time-derived UI (D7).

### D2. Exactly-one-current invariant, enforced at build

Validation runs after the locale merge:
- **zero published editions:** valid, and renders the "announced soon" message;
- **at least one published, none current:** the build fails;
- **more than one current:** the build fails.

Each error lists every year and `documentId` involved and points to the runbook.

This matches the repository's established stance (ADR 0001, Consequences; the
schedule-calendar D7 decision): a silent wrong answer is worse than a loud stop, and the
last good deployment keeps serving. Choosing "the highest year" or "the latest
published" was rejected, because either would publish a page whose headline might be the
wrong year with nobody noticing.

`isCurrent` is locale-independent, so the English and Turkish sets always agree. The
check runs once per locale render, on the merged set.

### D3. Bounded theming through data attributes and existing tokens

The root of the current edition carries `data-accent="{accentToken}"` and
`data-treatment="{heroTreatment}"`. The CSS module maps each `data-accent` to a single
local custom property:
- `[data-accent="aurora"] { --summit-accent: var(--color-summit-aurora); }`
- the same for `ion`, `violet` and `ember`.

These alias existing tokens, so no value is new. The treatments are:
- **still:** the background image in a fixed-ratio frame (`MediaImage` with `aspectRatio`
  21/9 at `md+` and 4/3 below), unmodified.
- **wash:** the same frame with an overlay pseudo-element using
  `background-color: color-mix(in oklch, var(--summit-accent) 45%, transparent)`.
- **gradient:** the frame filled with
  `linear-gradient(135deg, var(--summit-accent), var(--color-canvas))`, with the image
  under it at reduced opacity when present.

Hero text (the `h1`, date, badge and CTAs) always sits **below** the frame on
`--color-surface`, never over the image or the accent. Contrast therefore never depends on
the year's choices, and axe can verify it.

**Ember guard.** `--summit-accent` is used only on the hero frame and on a 4px heading rule.
Buttons, links, focus outlines, the Upcoming/Live badge and text never read it. A browser test
asserts that the computed colours of every interactive element and of the badge
never equal any summit token. ADR 0002's rule holds: a new accent value is a code change,
and choosing one is data.

`still` and `wash` need an image. For the current edition, a missing `backgroundImage`
with either treatment fails the build (D6). `gradient` works with or without one.

### D4. Media: reuse only

`backgroundImage`, `speakers[].portrait` and `photos[]` each pass through
`toMediaImage(value, pageLocale, { collection: "galactic-summits", entry: documentId,
field })`. The page locale, not the content locale, picks `altEn`/`altTr`, exactly as the
events-showcase code does. They render through `MediaImage`. No image code is added. Live
delivery is media-pipeline's open acceptance (D10).

### D5. Sponsorship PDF: a validated file link plus a tiny client island

**Loader validation** (`lib/summit/data.ts`, `toSponsorshipPdf`): the `sponsorshipPdf`
media object must have:
- a `url` that parses as `https:` with `host === MEDIA_HOST` (imported from
  `lib/media/origin.ts`) and no username or password;
- a pathname ending in `.pdf` (case-insensitive);
- `mime === "application/pdf"`.

Anything else fails the build, naming the edition and field. The same rule holds under
`next dev`: unlike images, there is no development pass-through, because a PDF link is
not rendered through a loader that could mask the problem, and a dev-only escape hatch
here buys nothing. This is the only new validation, and it is about files rather than
images, so it duplicates nothing in `lib/media`.

**Rendering:** `components/summit/sponsorship-pdf-link.tsx` is a `"use client"`
component. It renders a plain `<a href={url} target="_blank" rel="noopener">` with the
shared `action-link.module.css` `action secondary` classes, so no fourth button style is
created. Its `onClick` calls `trackSponsorshipPdfOpened()`. A client component is
required because `track` must run in the browser and `ActionLink` omits `onClick`.
`next/link` is wrong for a cross-origin file anyway. The island contains only this link.
With JavaScript disabled the link still opens the PDF, and only the event is lost. That
loss is accepted and stated.

No `download` attribute: opening in the browser's viewer is the expected behaviour. If no
PDF is attached, nothing renders (no placeholder).

### D6. Strict validation, mirroring the established loaders

`lib/summit/data.ts` follows `lib/events/data.ts`:
- `/api/galactic-summits` with `status=published`, `sort[0]=documentId:asc` and
  `pageSize=100`, following every page;
- `force-cache`, tag `galactic-summit`, `revalidate: false`, and an optional bearer
  token;
- a defensive skip of rows without `publishedAt`;
- tr-over-en by `documentId`, keeping `contentLocale`.

`populate` reuses the strings verified in PR #34, **minus `sponsors`**:
- `populate[programme]=true`
- `populate[speakers][populate][portrait][populate]=image`
- `populate[photos][populate]=image`
- `populate[backgroundImage][populate]=image`
- `populate[sponsorshipPdf]=true`

The failure list is in the spec ("Strict data contract"). Programme items with all three
fields empty fail (an editor artefact that would render an empty list item). Speakers
without a `speakerName` fail (the schema requires it, so seeing one means drift).

### D7. Time: neutral date; client-derived Upcoming or Live by Istanbul calendar day

**Server and first client render.** The date renders through `formatDate(date, locale,
"Europe/Istanbul")` inside `<time dateTime={date}>`, the same Istanbul calendar the
schedule uses. The server HTML contains no badge, no `data-time-state` and nothing else
derived from the current time.

**After mount.** `components/summit/summit-day-badge.tsx` (client) reads the shared browser
clock through `useBrowserNow()` (`lib/time/use-time.ts`, unchanged). It passes that value
to a pure function in `lib/summit/time.ts`:

```
summitDayState(date, now) → "upcoming" | "live" | null
  null if now is null or date is missing/invalid
  compare istanbulDayKey(now) with istanbulDayKey(date)   // YYYY-MM-DD in Europe/Istanbul
  now's day <  Summit's day → "upcoming"
  now's day == Summit's day → "live"
  now's day >  Summit's day → null
```

The badge renders text: "Upcoming" / "Yaklaşan" styled with `--color-state-upcoming`, and
"Live" / "Şimdi" styled with `--color-state-live`. It renders nothing for `null`.

**Why calendar days, not `classifyTime`:** the schema has one datetime and no end.
`classifyTime` would treat it as an instant, so "live" could never occur and the page
would read "no longer upcoming" from 10:01 on Summit day. The task assignment requires
live/upcoming. The Istanbul calendar day of `date` is a fact already in the data, so
"live on that day" adds no duration, no end time and no CMS field. **No "past" badge:**
after the day, the page stays neutral, and the archive never carries state.

**Day-key helper.** `istanbulDayKey` uses `Intl.DateTimeFormat("en-CA", { timeZone:
"Europe/Istanbul", … }).formatToParts`, so the result does not depend on the device zone.
Schedule-calendar (PR #35, unmerged) has an identical helper and a `CALENDAR_TIME_ZONE`
constant. This change keeps a local copy to stay independent of #35. Consolidate both
into one shared helper once both have merged; the README records this as a follow-up.

The date text itself never changes colour, so `DateTime`'s colour-only state styling is
deliberately not used. The meaning is carried by the badge's text.

### D8. Registration

The loader validates `registrationUrl` against the schema contract: absolute HTTP(S) with
no credentials, matching the schedule loader's `link()` rule. It is **not** narrowed to
Google Form hosts, because the schema does not narrow it and that would fail legitimate
data. When it is present, an `ActionLink variant="primary"` with `target="_blank"
rel="noopener"` shows "Register ↗", following the `about-and-join/external-action.tsx`
pattern. When it is null, a `<p>` shows "Registration opens soon" / "Kayıtlar yakında".
This is the page's single Primary CTA, and the partner link is Secondary (motion.md).

### D9. Sponsors: deliberately absent

`sponsors` is not populated. The request omits it, so the data never reaches the page,
and the view types have no sponsor field. A test asserts that the request URL contains no
`sponsors` populate. A route test asserts that a synthetic CMS which returns sponsors anyway
produces HTML with no sponsor name. Adding sponsors later belongs to sponsors-showcase,
after trademark permission.

### D10. Verification: its own Tier B workflow

- **`tests/summit/`** has its own lockfile (`@playwright/test` 1.63.0, `esbuild` 0.28.2
  and `@axe-core/playwright`). It holds an esbuild fixture with hydration, and a
  controlled `page.clock` for the Upcoming/Live badge, under several device time zones. `window.va` is stubbed by an init script to
  capture the analytics call. `check-routes.mjs` runs real `next build`/`next start`
  against a synthetic Strapi in these scenarios:
  - 0, 1 and 4 editions, plus sponsors-present;
  - the invariant failures: none current and two current;
  - a bad PDF host, and a still treatment without an image.
- **`.github/workflows/tier-b-summit.yml`** runs on pull requests to `main` and on pushes
  to `change/galactic-summit`. It has `timeout-minutes: 10` and is not required. It is
  path-filtered to:
  - the route folder, `apps/web/app/*/(galactic-summit)/**`;
  - `apps/web/app/sitemap.ts` and `apps/web/app/globals.css`;
  - `apps/web/lib/summit/**` and `apps/web/components/summit/**`;
  - `apps/web/lib/{time,i18n,strapi,media,analytics}/**`, `apps/web/components/media/**`
    and `apps/web/components/ui/**`;
  - `tests/summit/**` and the workflow itself;
  - `package-lock.json`, `apps/web/package.json` and `.nvmrc`.

  Unrelated routes do not trigger it.
- **Why not extend tier-b-events:** that workflow triggers on all of `apps/web/**` and
  owns another capability's signal. Folding the Summit's builds into it would slow every
  web PR and blur failures.
- **Cross-change edit:** `tests/events/check-routes.mjs`'s synthetic CMS answers every
  path with Stellar Talk rows, so the Summit loader would fail validation there. It must
  answer `/api/galactic-summits` with an empty, valid page. PR #35 edits the same line for
  `/api/schedule-events`. Whichever PR merges second resolves a one-line textual conflict
  by keeping both paths, using a normal merge.

## Risks / Trade-offs

- [An editor unsets `isCurrent` between seasons and every deploy fails] → Deliberate (D2).
  The message names the years, and the README documents the one-click fix.
- [JS-disabled visitors' PDF opens are not counted] → Accepted. The link works without
  JavaScript, and the analytics are approximate anyway (seo-analytics' stated partial
  coverage).
- [Media live acceptance is incomplete (media-pipeline 7.2–7.5)] → The Summit renders
  images only through the pipeline, and its own live tasks stay unchecked until real
  uploads are verified.
- [Ember near the fire hue] → The D3 guard confines the accent to decorative surfaces, and
  a browser test asserts that no interactive element or badge computes to a summit token.
- [Conflict with PR #35 in `tests/events/check-routes.mjs`] → A one-line, mechanical
  resolution, flagged in both PRs.
- [Duplicate `"Europe/Istanbul"` literal with schedule-calendar] → A small follow-up after
  both merge, noted in the README.

## Migration Plan

This is additive. The route appears once `STRAPI_URL` is set (as for events). Public
`find`/`findOne` on `galactic-summit` is already enabled (cms-platform). There is no
schema or data migration. To roll back, revert the PR.

## Documentation correction

`design/content-model.md`, Galactic Summit table: the `speakers` row says `relation[]`,
but the executable schema (and the same document's own line 140, "inside the `speakers`
component") makes it a repeatable `summit.speaker` component. The smallest correction is
to change that row's type to `component[]` with the note `{speakerName, role?,
portrait?}`. The CMS schema is not changed.

## Open Questions

- Bilingual sign-off on the copy table in the spec, which follows the schedule-calendar
  review process. Wording lives in one copy file and does not change the structure.
