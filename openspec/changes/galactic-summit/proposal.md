## Why

The navbar links to `/en/galactic-summit` and `/tr/galactic-summit`, but no route exists
behind them. The Galactic Summit is the club's flagship event and the one place on the site
where both audiences converge: prospective members register, and sponsors open the
sponsorship PDF, which is the one custom analytics event ADR 0001 authorises. Everything it
depends on is merged:
- `cms-platform` (the Galactic Summit content type is live in Strapi);
- `media-pipeline` code (#22);
- `client-time-state` (#12);
- `locale-routing` (#10);
- `seo-analytics` (#28, which already ships `trackSponsorshipPdfOpened()` waiting for a
  caller).

**Audience:** both. Sponsors reach "Become a Partner" (the sponsorship PDF), and
prospective members reach Register. Neither is ranked: Register is the page's single
Primary CTA and Become a Partner is a Secondary outline (`design/motion.md`, "The three
interaction types").

## What Changes

- A new statically generated route, `/[locale]/galactic-summit`. The segment is the brand
  name and is identical in both locales. It uses the shared shell, switcher, metadata and
  sitemap.
- A build-time loader for **published** Galactic Summit editions in both locales. It is
  paginated and strictly validated, Turkish replaces English by `documentId`, and it uses
  one cache tag with no request-time fetch. It follows the events-showcase pattern.
- **Edition model:** exactly one edition must be `isCurrent`. Zero current editions (while
  any are published) or more than one current edition **fails the build loudly**. Zero
  published editions renders an explicit "announced soon" message rather than a 404.
  Other editions are listed in an archive on the same page, newest year first.
- **Bounded per-year theming:** `accentToken` (aurora / ion / violet / ember) and
  `heroTreatment` (still / wash / gradient) select among existing tokens and the
  treatments of **one** hero layout, plus the edition's `backgroundImage`. There are no
  per-year components, layouts or colours. Ember is never used as a state, CTA or
  interactive colour.
- **Media through the existing pipeline:** `backgroundImage`, speaker portraits and photos
  all go through `toMediaImage` and `MediaImage`. This adds no image validation or
  resizing logic.
- **Sponsorship PDF:**
  - A plain file link, validated as a PDF on the approved media origin (`MEDIA_HOST`),
    and never passed through the image resizer.
  - It is not rendered when absent.
  - A tiny client component calls `trackSponsorshipPdfOpened()` when it is opened.
- **Registration:** with `registrationUrl` set, a Primary CTA link opens in a new tab.
  With it null, a non-interactive label reads "Registration opens soon" / "Kayıtlar
  yakında". It is never a disabled button.
- **Sponsors are not rendered.** The CMS relation exists, but the sponsors showcase is held
  pending trademark permission, so this capability neither fetches nor displays sponsor
  names or logos.
- **Time:** the Summit date renders neutrally on the server, in Istanbul's calendar, and the
  server output holds no state derived from the current time. After mount, a client badge
  compares Istanbul **calendar days** in the browser:
  - before the Summit's Istanbul day: "Upcoming" / "Yaklaşan";
  - on that day: "Live" / "Şimdi";
  - after it: no badge, and the presentation stays neutral.

  The schema has a single datetime and no end, so no duration is invented and no CMS field
  is added.
- **Documentation:** `design/content-model.md` is corrected so that `speakers` is the
  repeatable component the executable schema defines, not a relation.
- **Verification:** an isolated test package (`tests/summit`) and a path-filtered Tier B
  workflow. The events route check's synthetic CMS is taught to answer the new
  collection with an empty list.

There is no CMS schema change, no root `package.json` change and no new runtime
dependency. `@axe-core/playwright` is test-only, in `tests/summit`'s own lockfile.

## Capabilities

### New Capabilities

- `galactic-summit`: the bilingual Galactic Summit page. It covers the edition model and
  its exactly-one-current invariant, bounded per-year theming, media through the shared
  pipeline, the sponsorship PDF link and its analytics event, the registration CTA or
  label, client-derived upcoming/live state, the deliberate absence of sponsors, and the
  verification that holds it to those rules.

### Modified Capabilities

None. `client-time-state`, the media pipeline and the analytics event are consumed without
changing their contracts.

## Impact

- **Storage:** Galactic Summit is a Strapi entity only. Nothing moves to git and no entity
  is split.
- **Fields consumed:** `documentId`, `locale`, `publishedAt`, `year`, `date`, `location`,
  `isCurrent`, `purpose`, `programme{time,title,description}`,
  `speakers{speakerName,role,portrait}`, `photos`, `contactAddress`, `sponsorshipPdf`,
  `registrationUrl`, `accentToken`, `heroTreatment` and `backgroundImage`. **`sponsors` is
  deliberately neither populated nor read.** No field is added.
- **Code:** new `apps/web/lib/summit/**`, `apps/web/components/summit/**` and
  `apps/web/app/[locale]/(galactic-summit)/galactic-summit/page.tsx`; a modified
  `apps/web/app/sitemap.ts`; new `tests/summit/**` and
  `.github/workflows/tier-b-summit.yml`; a modified `tests/events/check-routes.mjs`; and
  a one-row correction to `design/content-model.md`.
- **Not touched:** `apps/cms/**`, root `package.json`, `lib/media/**`, `lib/time/**`,
  `lib/analytics/**` (consumed only), `docs/HANDOVER.md`, `docs/ops/cms-runbook.md`,
  publish-integration, media-pipeline, and PR #35's files.
- **Downstream:** `publish-integration` (Dev 4) must invalidate the new `galactic-summit`
  tag and revalidate both routes and the sitemap. Until then, a rebuild publishes changes.
  This is the same accepted limitation as events-showcase.
- **Live-only acceptance stays open**, because media-pipeline's live checks (Dev 4) and
  the Vercel deployment are not complete. That covers real image and resized delivery, the
  admin alt-text flow, real-photo CLS, a real PDF upload and its delivery, the Vercel event
  appearing, and publish-to-live.
- **Explicitly out of scope:**
  - any sponsors section, names or logos (sponsors-showcase is held);
  - per-year sub-routes or edition detail pages;
  - speaker detail pages;
  - the home-page "Discover Galactic Summit" composition;
  - publish-integration;
  - media-pipeline live acceptance;
  - CMS schema changes;
  - any animation.
