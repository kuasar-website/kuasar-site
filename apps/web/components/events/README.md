# Events showcase

`EventsSection({ locale })` is the Server Component handoff for DEV 2 home composition.
It loads published Strapi events and returns no block when both collections are empty.
`EventsShowcase` remains the independently testable presentation; adding CMS records
never requires changing its layout. The public pages are `/en/events` and
`/tr/etkinlikler`, with the shared shell, language switcher, metadata and sitemap.

## Environment and publishing handoff

- `STRAPI_URL`: server-only CMS origin. Never prefix this with NEXT_PUBLIC.
- `STRAPI_API_TOKEN`: optional server-only read token if the CMS does not allow public
  read access to these two collections. Never log or expose it to the browser.
- `NEXT_PUBLIC_SITE_URL`: the actual site origin, already used by shared SEO metadata.

An unconfigured local/preview build exposes no events page and invents no content.
A Vercel production build without STRAPI_URL fails explicitly. A configured CMS that
is unreachable, unauthorized or returns invalid data fails the build with a runbook
reference; it is not silently treated as an empty collection.

The loader queries only published `stellar-talks` and `nebula-nights`, following every
pagination page. Turkish documents override English by documentId; missing Turkish
publications fall back to English with `lang="en"` on their content. Image alt text
still uses the visitor's locale. Both fields are required by the shared media contract.
`MediaImage` and `toMediaImage` enforce approved hosts, dimensions and localized alt.
No hover video is fetched/populated. Watch/read URLs are ordinary HTTP(S) links.

All fetches use force-cache, indefinite revalidation and tag **events-showcase**.
Both routes are statically generated, reject request-time APIs, disable dynamic
fallback and have no time-based revalidation. The publish-integration owner must
invalidate this tag AND revalidate `/en/events`, `/tr/etkinlikler`, `/sitemap.xml`,
and any home routes using EventsSection on publish/unpublish/update/delete in either
collection or a referenced image. Invalidating only the changed locale is insufficient
because Turkish may display English fallback. See docs/ops/cms-runbook.md step 6.
This feature does not add or configure the shared webhook, secrets or CMS permissions.
Live publishing must be checked against the deployed CMS before closing that task.

## Presentation contract

Give EventsShowcase `locale`, `talks` and `nights`; collections hide independently.
Supply stable document IDs and a unique `id` prefix if using multiple instances on a
page. Fixed dates sort newest first, undated entries last, without reading the server
clock. Shared DateTime enhances neutral server dates after hydration. Speaker names,
film titles and event brands remain unchanged. Nights require at least one validated
photo; talk portraits/links are optional. Synthetic records exist only in tests.

## Verification

From the repository root after npm ci and npm ci --prefix tests/events:

- `node --test apps/web/lib/events/data.test.ts tests/events/baseline.test.mjs`
- `npm --prefix tests/events test`: Chromium/Firefox, JavaScript disabled, keyboard,
  phone/tablet/desktop and reduced motion.
- `node tests/events/check-routes.mjs`: actual production builds against synthetic
  Strapi responses, zero/fifty entries, pagination, fallback, media loader, metadata,
  switcher, sitemap, wrong-locale 404s and zero CMS requests when serving built pages.
  Also measures real route JS against the 175KB budget; it writes local .next outputs.

Static baseline review/shipping precedes optional video. Live CMS publishing and
human bilingual/device acceptance are follow-ups; passing fixtures does not prove them.
