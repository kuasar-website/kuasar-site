# Project Platform

The public pages are `/en/projects` and `/tr/projeler`, inside the shared shell, with
canonical and hreflang metadata. The visible name is the full product name in the navigation
and the `<h1>`: **Project Platform** / **Proje Platformu**. OpenSpec:
`openspec/changes/project-platform-page/` (the page) and `openspec/specs/project-platform`
(the CMS types).

Platform Projects are KUASAR's **non-rocket** space and aerospace projects. Rocket Missions
stay in git (`components/missions/`) and never appear here.

## Environment and publishing handoff

- `STRAPI_URL`: server-only CMS origin. A Vercel production build without it fails
  explicitly; an unconfigured local or preview build exposes no Project Platform page.
- `STRAPI_API_TOKEN`: optional server-only read token, as for the other sections.
- **The Public role needs `find` on Project Platform and `find` on Platform Project**, and
  nothing else (no `findOne`: the loader only lists). Without it, the build fails with
  `Strapi HTTP 403` and a runbook reference. See `docs/ops/cms-runbook.md`, "Rolling out a
  new content type".

The loader (`lib/cms/project-platform-data.ts`) reads **published** content only:

- the single type per locale, `GET /api/project-platform`. Strapi answers 404
  `NotFoundError` when nothing is published in that locale; that is "no entry", not an
  error. Every other failure (unreachable, 401, 403, 5xx, a non-object `data`) fails the
  build.
- every page of `GET /api/platform-projects`, with the cover image populated.

It maps every row with `lib/cms/project-platform.ts`. Every fetch uses force-cache,
indefinite revalidation and the tag **project-platform** (`CACHE_TAGS.projectPlatform` in
`lib/strapi/registry.ts`), shared by both content types. A Strapi publish, unpublish, edit
or delete of either reaches both pages and the sitemap through `/api/revalidate`, including
the known first-reload gap (publish-integration task 6.4).

**No Draft Mode branch.** Preview is off for both types (registry `preview: false`) and the
preview token is not scoped to them. An editor with a Draft Mode cookie from another section
still sees published content here. Enabling preview is its own change.

## What fails the build, and what is only hidden

Strict, like News and Summit, because the CMS already refuses these at publish, so seeing one
means the schema drifted: a missing or blank `title`, `summary`, `intro` or feature
`title`/`description`; a year that is not an integer in 1900–2100; a `projectStatus` other
than `current`/`past`; an image that `toMediaImage` refuses; and **an `endYear` before the
`startYear`**, which Strapi cannot check. A failed build leaves the previous deployment live,
and a failed revalidation keeps serving the last generated page.

Hidden, never thrown (like Alumni's LinkedIn link): a `whatsappUrl` that is not an HTTPS
WhatsApp link (`chat.whatsapp.com`, `whatsapp.com` or one subdomain, `wa.me`, with a path)
drops the WhatsApp button; an `applicationUrl` that is not an absolute HTTPS URL drops Apply.

## Rendering

- **No Project Platform entry** (unpublished in both locales, or Turkish-only on `/en`): 200,
  the heading and both project sections; no intro, no WhatsApp button, no functions.
- **Intro:** editor Markdown, rendered by `components/news/body.ts` into `MissionProse`. It
  never throws; raw HTML and unsupported syntax show as escaped text. Its headings are h3.
- **WhatsApp button:** only for a valid link. Text: the editor's `whatsappLabel`, or "Join
  the Project Platform WhatsApp group" / "Proje Platformu WhatsApp grubuna katıl".
- **Functions:** in the editor's order for that locale. None, no section.
- **Current / past:** by `projectStatus` only, never by the years or the date. Within each,
  `startYear` newest first, then title (page locale's collation), then `documentId`. Each
  section has its own empty message. Years: "2025", or "2024–2026"; plain text.
- **Apply / Başvur:** only on a current project with a valid `applicationUrl`. A past project
  never has one.
- **Covers:** through `toMediaImage`/`MediaImage`, alt text in the visitor's locale, shown
  whole. Without a cover the card is text only: no slot, no placeholder.
- **Turkish fallback:** on `/tr`, the entry and each project use their Turkish version or,
  silently, the English one, marked `lang="en"`. `/en` never shows Turkish-only content.
- **Sitemap:** a locale's page is listed only once it has an entry or a project. The page is
  indexable and always in the navigation.
- No client component and no motion: the route ships only the shared shell's JS.

## Tests

- `lib/cms/project-platform.test.ts`, `lib/cms/project-platform-data.test.ts` and
  `lib/strapi/registry.test.ts`.
- `tests/project-platform/check-routes.mjs`: real production builds against a synthetic
  Strapi (empty, entry-only, populated, and a malformed year range that must fail).
- Both run in `.github/workflows/tier-b-project-platform.yml` (Tier B, not required). Tier A
  does not run `test:cms`.
