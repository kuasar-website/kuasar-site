## Why

KUASAR wants a bilingual Project Platform page: an explanation of the platform, a WhatsApp
group/community link, the platform's functions, and its current and past projects. All of
it changes during the year (a new WhatsApp link, a project opening applications, a project
ending), so editors must manage it in Strapi rather than through pull requests.

`cms-platform` says the CMS exposes **exactly seven** project-defined collections, so the
content model cannot grow without changing that specification. This change adds the CMS
foundation only: the content types, their backup, and the documents. The page itself is a
later change.

**Audience:** prospective members (who join a project or the WhatsApp community) and,
through the past-projects archive, credibility. Not sponsors.

## What Changes

- **New single type `project-platform` (Project Platform):** `intro` (rich text, localized,
  required), `whatsappUrl` (HTTPS WhatsApp link, shared, optional), `whatsappLabel`
  (localized, optional) and `features`, a localized repeatable `platform.feature`
  component (`title`, `description`, both required). The page's sections A (intro and
  hero) and B (the platform's functions).
- **New collection type `platform-project` (Platform Project):** `title`, `summary`
  (localized, required), `coverImage` (`shared.image`, shared, optional), `startYear`
  (shared, required, 1900–2100), `endYear` (shared, optional, 1900–2100), `projectStatus`
  (`current` | `past`, shared, required, no default) and `applicationUrl` (HTTPS, shared,
  optional). The page's sections C (current projects and applications) and D (past
  projects).
- **New component `platform.feature`.**
- **The Mission boundary is explicit:** Platform Projects are non-rocket space and
  aerospace projects. KUASAR's rocket Missions stay in git, are never also entered as
  Platform Projects, and the Project Platform does not replace the Missions archive.
- **Backup coverage in the same change:** the content snapshot exports both new types
  (published only, both locales), including the single-type response shape. A missing
  token permission fails the run loudly; a single type with nothing published in a locale
  is a legitimate empty state. Backup tests now fail if any CMS content type other than
  Alumni, or any schema or component field, is left out of the snapshot.
- **`cms-platform` is amended:** eight collections and one single type instead of exactly
  seven collections, with the Editor and locale requirements covering the new types.
- **Documents:** `design/content-model.md` (storage table, both entities, the Mission
  boundary), `docs/ops/cms-runbook.md` (backup token scope, the ordered rollout after merge,
  editing notes, single-type restore) and `docs/HANDOVER.md` (backup token scope).

Not in this change: any `apps/web` code (route, loader, registry entry, revalidation tag,
preview), Public read permission on the new types, and production content.

**Storage:** both entities live in Strapi, entirely. Nothing is split across git and Strapi.
Missions and the timeline stay in git.

**Dependencies:** none added. No motion, no animation library, no route.

## Capabilities

### New Capabilities
- `project-platform`: the Project Platform single type and Platform Project collection:
  fields, localization, draft/publish, the Mission boundary, `projectStatus` semantics,
  WhatsApp and application URL validation, backup coverage, and Public read staying off
  until the page ships.

### Modified Capabilities
- `cms-platform`: "exactly seven collections" becomes eight collections plus one single
  type; the Editor role and locale requirements cover the new types.

## Impact

- `apps/cms`: two new API folders (`project-platform`, `platform-project`) and the
  `platform.feature` component. Strapi creates their tables on boot; existing tables and
  data are untouched.
- `scripts/content-snapshot`: allowlist, single-type fetch, pickers and their tests.
- Merging deploys the CMS to production (`cms-deploy.yml`). The ordered steps after merge
  (backup token, a manual snapshot, then Editor access) are in `tasks.md` and the runbook.
- No change to `apps/web`, the Strapi webhook, the preview token or the Public role.
