# Galactic Summit

`/en/galactic-summit` and `/tr/galactic-summit` (the brand segment is the same in both
locales, so one route file serves both). The contract is `openspec/changes/galactic-summit/`
until it is archived, and then `openspec/specs/galactic-summit/spec.md`.

## Editions: exactly one current

One Strapi entry per year. Adding a year is a **data operation**: publish the new edition,
mark it `isCurrent`, and unmark the old one. No code changes.

| Published editions | Result |
| --- | --- |
| none | Both routes show "Details of the next Galactic Summit will be announced soon." |
| one or more, exactly one `isCurrent` | The current edition in full, then "Other editions", newest year first |
| one or more, **none** `isCurrent` | **Build fails**, listing every year and documentId |
| more than one `isCurrent` | **Build fails**, listing the current years and documentIds |

**Editor fix:** open the editions named in the message in the Strapi admin, leave exactly
one marked current, and publish. The page never guesses, and the last good deployment
keeps serving while the build is failing.

## Per-year theming, bounded (ADR 0002 decision 7)

Only `accentToken` (aurora / ion / violet / ember), `heroTreatment` (still / wash /
gradient) and `backgroundImage` vary. There is one layout for every year.
- **The accent:** `data-accent` maps to an existing `--color-summit-*` token. It is used
  only on the hero frame and the short heading rule.
- **Ember guard:** buttons, links, focus rings, the Upcoming/Live badge and text never use
  the accent. A browser test checks every accent × treatment combination for this.
- **Treatments:**
  - `still`: the image, unmodified;
  - `wash`: the image under an accent wash;
  - `gradient`: an accent gradient, over the image if there is one.
- **Images are required for still and wash.** For the current edition, `still` or `wash`
  without a `backgroundImage` fails the build. Choose `gradient` or add the image.
- **Adding a new accent or treatment value** is a code change (a token plus this CSS),
  never a CMS-only change.

## Media, the PDF and registration

- **Images:** `backgroundImage`, speaker portraits and photos go only through `toMediaImage`
  and `MediaImage`. Alt text follows the page's locale.
- **"Become a Partner (PDF)" / "İş ortağımız olun (PDF)":**
  - The file is accepted only if it is `https` on `media.kuasar.org` with no credentials,
    has a `.pdf` path, and has MIME type `application/pdf`. Anything else fails the build.
  - It is a plain link, never the image resizer, and opens in a new tab.
  - Opening it calls `trackSponsorshipPdfOpened()` (`lib/analytics/events.ts`). Without
    JavaScript the link still works, and only the event is lost.
  - With no PDF attached, nothing renders.
- **Registration:**
  - With `registrationUrl` set, "Register" / "Kayıt ol" is the page's single Primary CTA
    and opens in a new tab.
  - With it null, the plain text "Registration opens soon" / "Kayıtlar yakında" is shown.
    It is never a disabled button.

## Sponsors: deliberately absent

The CMS relates editions to sponsors, but the sponsors showcase is **held until trademark
permission is recorded per sponsor**. This page never requests `sponsors` (the populate
list omits it) and never renders sponsor names or logos. The relation's existence is not
permission. Sponsor display belongs to sponsors-showcase.

## Time

The date renders neutrally on the server, in the Istanbul calendar. After mount,
`SummitDayBadge` compares Istanbul **calendar days** using the browser clock only:
- before the Summit's day: **Upcoming / Yaklaşan**;
- on that day: **Live / Şimdi**;
- after it: no badge.

The schema has a single datetime, so no duration is invented. Server HTML never contains
time-derived state.

**Follow-up:** `lib/summit/time.ts` has its own `istanbulDayKey`. Schedule-calendar
(PR #35) has an identical helper. Consolidate both into one shared helper once both have
merged.

## Locale behaviour

On `/tr/galactic-summit`, a Turkish publication replaces the English one per document.
English-only editions fall back with `lang="en"` on their purpose, programme and contact
text. The English route shows English publications only. "Galactic Summit" stays English
in both locales.

## Environment and publishing handoff

- `STRAPI_URL`: server-only CMS origin. Without it, no Summit route is generated, and a
  Vercel production build fails explicitly.
- `STRAPI_API_TOKEN`: an optional server-only read token.
- `NEXT_PUBLIC_SITE_URL`: the site origin, used by the metadata and the sitemap.

Every fetch uses `force-cache`, no time-based revalidation, and tag **`galactic-summit`**.
publish-integration's registry (`lib/strapi/registry.ts`) maps Galactic Summit to that
tag, and `/api/revalidate` calls `revalidateTag('galactic-summit', 'max')` on publish,
unpublish, update or delete in either locale (both locales and the sitemap are covered;
no `revalidatePath`, which 404s these routes). Draft Mode preview reads drafts with the
server-only `STRAPI_PREVIEW_TOKEN`. Never add a cron.

## Verification

From the repository root, after `npm ci` and `npm ci --prefix tests/summit`:

- `TZ=UTC node --test apps/web/lib/summit/*.test.ts`, repeated with
  `TZ=America/New_York`. Covers:
  - the loader, the current-edition invariant and every validation failure;
  - PDF host and MIME rules, and that sponsors are never populated;
  - locale fallback and the Istanbul calendar-day state.
- `npm --prefix tests/summit test` (after
  `npm exec --prefix tests/summit -- playwright install chromium firefox`). Runs in
  Chromium and Firefox, in both locales, and covers:
  - the no-JS baseline, hydration, and Upcoming → Live → none across Istanbul midnight
    under three device zones;
  - registration as a link or label, the partner link present or absent, and the
    analytics event (stubbed `window.va`);
  - every accent × treatment with the ember guard, and sponsor absence;
  - zero and sparse editions, keyboard focus, reduced motion, 320px, and axe before and
    after mount.
- `node tests/summit/check-routes.mjs` runs real production builds against a synthetic
  Strapi. It covers:
  - the build failing for none-current, two-current, a bad PDF host, and still without an
    image;
  - 0, 1 and 4 editions;
  - prerendering without revalidation, and zero CMS requests while serving;
  - the sitemap, switcher, sponsors absent, and budgets.

CI runs all three in `.github/workflows/tier-b-summit.yml`. Live image, resizing, alt-text
admin, CLS, real PDF, Vercel analytics and publish-to-live checks are manual acceptance
(tasks.md section 6).
