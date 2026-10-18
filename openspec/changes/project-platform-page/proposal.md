## Why

The Project Platform CMS foundation is live (`openspec/specs/project-platform`): editors can
manage the page content and its Platform Projects, and every published entry is in the
content backup. Nothing shows it yet. This change builds the public page.

It also resolves the `projects | projeler` URL segment that `design/i18n.md` has carried
since the start, which `apps/web/lib/i18n/segments.ts` marks unresolved only because no
Project entity existed. One does now.

**Audience:** prospective members (who join a project, apply to one, or join the WhatsApp
group) and, through the past projects, credibility. Not sponsors.

## What Changes

- **New page** at `/en/projects` and `/tr/projeler`. The visible name is the full product
  name in both places it appears, the navigation and the `<h1>`: **Project Platform** /
  **Proje Platformu**, like Galactic Summit.
- **Intro and WhatsApp call to action** from the Project Platform single type. The button
  appears only for a valid WhatsApp link; its text is the editor's `whatsappLabel` or a
  fixed per-locale default.
- **Platform functions** (`features`) in the editor's order. No functions, no section.
- **Current projects** (`projectStatus = current`) with an Apply / Başvur button only for a
  valid HTTPS `applicationUrl`, and **past projects** (`projectStatus = past`), which never
  have one. Each section has its own localized empty state. Both are ordered by `startYear`
  newest first, then title.
- **Missing single type:** the page still renders (200) with its code-defined heading and
  the projects; the intro, the WhatsApp button and the functions are left out.
- **Turkish fallback:** CMS content falls back silently to English on `/tr`, marked
  `lang="en"`. `/en` never shows Turkish-only content.
- **Published-only, static, tag-revalidated:** one cache tag, `project-platform`, for both
  content types, mapped in the publish-integration registry. No Draft Mode preview.
- **Sitemap and navigation:** in the navigation from launch; in the sitemap only once there
  is content.
- **Public read:** the Public role gets `find` on Project Platform and Platform Project,
  nothing else. This is the requirement the CMS change deferred to this one. It is granted
  in production by a Super Admin before the Vercel Preview is reviewed (tasks.md, section 7);
  this change contains no permission code.

**Storage:** both entities stay entirely in Strapi; nothing is split across git and Strapi.
Rocket Missions stay in git and are not touched.

**Dependencies:** none added. No motion, no animation library, no client component.

## Capabilities

### New Capabilities
- `project-platform-page`: the public Project Platform page: routes and visible name, intro
  and WhatsApp call to action, functions, current and past projects, the Apply link,
  ordering, Turkish fallback, published-only reads, revalidation, sitemap and indexing.

### Modified Capabilities
- `project-platform`: "No public read until the page ships" becomes published read for the
  Public role, with drafts still refused.

## Impact

- `apps/web`: two route files, `components/project-platform/`, a mapper and a loader under
  `lib/cms/`, the registry, the segment map, the navigation and the sitemap.
- `tests/project-platform/` and `.github/workflows/tier-b-project-platform.yml`. The other
  sections' synthetic Strapi servers learn to answer the new endpoints, since every
  production build now reads them.
- Documents: `design/content-model.md`, `design/brand.md` (navigation label list),
  `docs/ops/cms-runbook.md` (Public role).
- Production Strapi: the Public `find` grant on the two types, before Preview review. No
  schema change.
