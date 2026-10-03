# News (announcements)

The public pages are `/en/news` and `/tr/duyurular`, inside the shared shell (navigation,
language switcher), with canonical and hreflang metadata. The navigation already links
here. OpenSpec: `openspec/changes/announcements/`.

## Environment and publishing handoff

- `STRAPI_URL`: server-only CMS origin. A Vercel production build without it fails
  explicitly; an unconfigured local or preview build exposes no News page.
- `STRAPI_API_TOKEN`: optional server-only read token, as for the other sections.

The loader (`lib/cms/announcements-data.ts`) reads **published** `announcements` only,
following every pagination page, and maps each row with `lib/cms/announcements.ts`. A
configured CMS that is unreachable, unauthorized or returns invalid data fails the build
with a runbook reference; it is never silently shown as an empty list. On `/tr`, each
document shows its Turkish variant or, silently, its English one, with `lang="en"` on that
article. `/en` never shows a Turkish-only announcement.

Every fetch uses force-cache, indefinite revalidation and the tag **announcements**
(`CACHE_TAGS.announcements` in `lib/strapi/registry.ts`). Both routes are statically
generated, reject request-time APIs and have no time-based revalidation. A Strapi publish,
unpublish or delete reaches the page through `/api/revalidate`, like every other section,
including the known first-reload gap (publish-integration task 6.4).

**No Draft Mode branch.** Announcement preview isn't enabled (registry `preview: false`),
and the preview token is scoped to the four previewable types only. So an editor with a
Draft Mode cookie from another section still sees published News here, never a draft or an
error. Enabling Announcement preview is its own change: registry, `apps/cms/src/preview-url.ts`,
the preview token's scope, and a loader preview branch.

## Rendering

- Zero announcements: the page exists with an explicit empty message, never a 404, and is
  left out of the sitemap until at least one is published.
- Each announcement is a full `<article>` on the list page (cover image, pinned marker,
  date and time, title, excerpt, body), with its slug as the fragment id. There are **no
  per-slug detail routes**: with `dynamicParams = false`, a detail page for an announcement
  published after the last deploy would 404 until the next one.
- **Date and order: `announcementDate`, never `publishedAt`.** Editors set
  `announcementDate` (required, shared by both locales). The page shows it as date plus
  24-hour time in Europe/Istanbul, e.g. "Monday, October 5, 2026 · 14:30" / "5 Ekim 2026
  Pazartesi · 14:30". The order is pinned, then `announcementDate` newest first, then
  `documentId`. Strapi resets `publishedAt` on every republish, so sorting on it would move
  a corrected old announcement to the top. `tests/news/strapi-order.mjs` proves this can't
  happen.
- `body` is editor Markdown, rendered by `body.ts` into `MissionProse` blocks. It never
  throws: anything unsupported (images, raw HTML, quotes, code, unsafe links) degrades to
  plain text, so an editor's formatting can't break a build or a revalidation.
- The cover image goes through `toMediaImage`/`MediaImage`: approved media host,
  dimensions, and alt text in the visitor's locale are all required.

## Tests

- `lib/cms/announcements.test.ts`, `lib/cms/announcements-data.test.ts` (Tier A `test:cms`)
  and `components/news/body.test.ts`.
- `tests/news/check-routes.mjs` (Tier B news): real builds at zero and many announcements
  against a synthetic Strapi.
