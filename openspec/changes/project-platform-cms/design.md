## Context

- The CMS is Strapi 5.52.3 CE. Every existing type is a locale-enabled, draft/publish
  collection, and none is a single type (`docs/adr/0002-cms.md`; `design/content-model.md`).
- Field conventions this change follows rather than restates: facts are non-localized,
  prose is localized (`design/content-model.md`, "Locale conventions"); images are the
  `shared.image` component with both alt texts ("Images and alt text"); external URLs are
  strings with a `regex`; current/past is an editorial boolean or enum (Sponsor and Summit
  `isCurrent`), never derived from dates (`cms-platform` spec).
- The content snapshot (`openspec/changes/content-backup/`) reads published content over
  the REST API with a scoped token, writes nothing unless every type succeeds, and excludes
  Alumni and drafts (`docs/adr/0002-cms.md`, Known debt: KVKK; `docs/adr/0005-repository-visibility.md`).
- There is no Strapi preview environment: merging to `main` deploys production
  (`docs/ops/cms-runbook.md`, step 4). The CMS schema has no CI gate (`docs/adr/0004-verification.md`).

## Goals / Non-Goals

**Goals:**
- Editors can manage the whole Project Platform page from Strapi, in both locales.
- The content is in the backup before any editor can create it.
- The model is small; anything deferred can be added later without migrating data.

**Non-Goals:**
- The page, its loader, registry entry, revalidation tag or preview (the frontend change).
- Public (anonymous) read access, which that change grants.
- Production content, real WhatsApp links or real projects.

## Decisions

### D1. Sections A+B are one single type; sections C+D are one collection
The intro, the WhatsApp CTA and the functions exist once per locale, which is what a Strapi
single type is: no list to manage and no way to create a second "page" by accident. Projects
are many, each published on its own, so they are a collection. Putting the page content in
code (like section headings) was rejected because editors must change it; putting it on a
collection entry was rejected because nothing would stop a duplicate.

### D2. Names: `project-platform` and `platform-project`
A bare `project` collides with the word's generic uses (the cms-platform spec's own
"project-defined", OpenSpec, ADRs) and invites confusion with Missions. In the Content
Manager, editors see **Single Types → Project Platform** and **Collection Types → Platform
Project**. REST paths: `/api/project-platform` and `/api/platform-projects`.

### D3. The functions are a repeatable component, `platform.feature`
`features` is localized and repeatable, following the Summit `programme` precedent: each
locale has its own items in its own order, reordered by drag and drop. Four numbered fields
were rejected because the text, the count and the order are all content. No min or max,
no icon or key field: the page renders whatever is there. Verified locally: English kept
four items and Turkish three, each in its own order.

### D4. `projectStatus`, not `status`, and never derived from years
Strapi 5 reserves the attribute name `status` on every draft/publish type
(`@strapi/utils`, `RESERVED_ATTRIBUTE_NAMES_DRAFT_PUBLISH`), because the REST API uses
`?status=published`. The enum is `current` | `past`, required, with no default, so an editor
always chooses. It is a classification for the page, not a fact computed from
`startYear`/`endYear`: a current project may be recruiting or not, and a project can end
without anyone recording a year.

### D5. Years: `startYear` required, `endYear` optional, both 1900–2100
`startYear` is the only sort key within each section (newest first, then title), so it is
required: an optional sort key orders inconsistently, and every project has a year the team
can state. The bounds are sanity limits, not facts; they stop a typo like `20245` before it
reaches a build. `endYear >= startYear` cannot be expressed in a Strapi schema; the
frontend mapper handles it.

### D6. URL validation
- `applicationUrl`: `^https://\S+$`. HTTPS only (the user decision); Google Forms and similar
  are HTTPS. The page shows Apply / Başvur only when it is set.
- `whatsappUrl`: `^https://(([a-z0-9-]+\.)?whatsapp\.com|wa\.me)/\S+$`. It requires HTTPS, a
  host of `whatsapp.com`, one subdomain of it (`chat.`, `www.`) or `wa.me`, and a non-empty
  path without spaces. It does not assume any invite-code format, so group invites,
  Community links, Channels (`whatsapp.com/channel/…`) and `wa.me` all pass. It rejects
  `http://`, other hosts, lookalikes (`evilwhatsapp.com`, `whatsapp.com.evil.com`), a bare
  host and plain text. It is shared across locales: one community.
- Verified locally (dummy URLs only), including a Strapi 5 behaviour worth knowing: a
  **draft** save does not apply `regex` or an integer `min`, while **publish** applies all of
  them. Every invalid value above was saved as a draft and then refused at publish, and the
  published entry kept its last valid value. Only published content reaches the API, the
  site and the backup, so nothing invalid can reach either.

### D7. Single-type export
The snapshot reads a single type per locale from `/api/<singularName>?status=published&locale=…`
with its populate, and no pagination. Differences from a collection, all verified against
local Strapi 5.52.3 with a scoped API token:

| Situation | Strapi's answer | Snapshot |
| --- | --- | --- |
| Published in that locale | 200, `data` is one object | one entry |
| Nothing published in that locale | 404, JSON `NotFoundError` | no entry (`[]` if neither locale) |
| Token lacks permission | 403 `ForbiddenError` | whole run fails, nothing written |
| Anything else (401, 5xx, non-JSON, unexpected shape) | — | whole run fails, nothing written |

The file is named by `pluralName` (`project-platforms.json`), like every other file, and has
the same shape: an array of per-locale entries sorted by `documentId`, then locale.

**Known limit:** a route that does not exist also answers 404 `NotFoundError`, so the
exporter cannot tell "nothing published" from "type not deployed". It is acceptable because
the opposite failure (the run passing with content missing) needs the type to vanish while
still being on the allowlist, and the backup tests fail when an allowlisted type has no
schema in `apps/cms/src/api/`. The post-merge manual snapshot (tasks 6.3–6.4) proves the
deployed type is read.

### D8. Backup tests guard the whole class, not just these fields
Three schema-driven tests now fail when something would silently drop out of a snapshot:
every content type under `apps/cms/src/api/` except Alumni must be on the allowlist (with its
`kind` and API names matching `schema.json`); every component, media and relation attribute
must have a populate entry; and every schema attribute and every component field must be
copied by its picker. Each was checked by breaking the code on purpose and seeing it fail.

These tests run under `npm run test:content-backup`, which **no CI workflow runs** today
(Tier A does not include it). They protect the code only when someone runs them; wiring them
into Tier A is a verification-gate change for `docs/adr/0004-verification.md`, outside this
change.

### D9. Fields this change does not add
No slug and no long body (no detail pages yet), no manual display order (no type here has
one, and renumbering is error-prone), no application state (open, deadline, form type), no
separate project website link. Adding any later is additive. Removing or renaming a field
later drops its column and its data on Strapi's schema sync, so the model starts small.

### Rule checks
- **Motion:** none. No animation, no route.
- **First-load JS:** no change; `apps/web` is untouched and no import reaches it.
- **New Strapi fields and locale:** every field is listed with its localization in
  `design/content-model.md` and in the spec.

## Risks / Trade-offs

- [Merging deploys production with no preview] → The local verification in tasks 5 is the
  pre-merge substitute, plus a manual `cms-deploy.yml` run from the branch, which builds the
  image and deploys nothing.
- [The weekly snapshot runs before the backup token is updated] → It fails loudly with
  `HTTP 403` and writes nothing; the previous snapshot stays. Merge Tuesday–Thursday and do
  tasks 6.2–6.4 the same day.
- [Editors start before the backup covers the types] → Strapi gives new types to Super Admin
  only. Editor access is the last step (task 6.5), after a green manual snapshot.
- [A later rename drops data] → Names were settled before any content exists (D2, D4).
- [Backup tests are not in CI] → Stated in D8 and in the PR; a separate decision.

## Migration Plan

No data migration. On the first boot after deploy, Strapi creates `project_platforms`,
`platform_projects`, `components_platform_features` and their component link tables.
Existing tables are untouched. The ordered steps after merge are tasks 6.1–6.6 and
`docs/ops/cms-runbook.md`, "Rolling out a new content type". Rollback before Editor access
(task 6.5): revert the merge. The new tables hold no content until then, so nothing can be
lost either way.

## Open Questions

- The final WhatsApp URL does not exist yet. The field is optional, so the page can publish
  without it.
