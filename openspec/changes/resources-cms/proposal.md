## Why

KUASAR wants a bilingual Resources page of downloadable training materials, guides and
documents. Editors add and publish them through Strapi, uploading the files to the Media
Library, so no file or resource text is hard-coded in the frontend. This change adds the
CMS foundation only: the content type, its backup, and the documents. The page is a later
change.

It builds on `project-platform-cms` (#52), whose snapshot support for collections and
single types and whose `cms-platform` requirements it extends.

**Audience:** prospective members, through the training material, and credibility. Not
sponsors.

## What Changes

- **New collection type `resource` (Resource):** `title` (string, localized, required),
  `description` (text, localized, required) and `file` (one Media Library file of the
  document types the upload configuration allows, localized, required). No page-level type:
  the page's heading and intro are page copy in code, like every other section's.
- **The entry's locale is the language of its file.** A resource in both languages has a
  file per locale; an English-only or Turkish-only document exists in that locale only.
- **Backup coverage in the same change:** the content snapshot exports published Resources
  in both locales with each file's public URL, original name and MIME type (never the file
  itself). A missing token permission fails the run loudly.
- **`cms-platform` is amended:** nine collections and one single type. The content-type
  requirement is renamed without a count, so the next type changes its body, not its name.
- **Documents:** `design/content-model.md` (storage table, Resource), `docs/ops/cms-runbook.md`
  (backup token scope, export list, Resource editing notes, restore) and `docs/HANDOVER.md`
  (backup token scope).

Not in this change: any `apps/web` code, Public read permission, a category, a cover image,
a year or date, a manual order, an external URL, a slug or a body, a PDF-only rule, and any
change to the 25 MB upload limit.

**Storage:** Resource lives in Strapi, entirely; its files are Media Library uploads on R2.
Nothing is split across git and Strapi.

**Dependencies:** none added. No motion, no animation library, no route.

## Capabilities

### New Capabilities
- `resources`: the Resource collection: fields, localization (entry locale is the file's
  language), the document-only file, publication, backup coverage, editor guidance on public
  uploads, and Public read staying off until the page ships.

### Modified Capabilities
- `cms-platform`: the content-type list gains Resource (nine collections plus one single
  type), under a count-free requirement name; the locale and Editor requirements cover it.

## Impact

- `apps/cms`: one new API folder, `resource`. Strapi creates its table on boot; nothing else
  in the CMS changes.
- `scripts/content-snapshot`: one allowlist entry, one picker, and their tests. No change to
  the single-type or request code.
- Merging deploys the CMS to production. The ordered steps after merge (backup token, a
  manual snapshot, then Editor access) are in `tasks.md` and the runbook.
- No change to `apps/web`, Project Platform, any other entity, the webhook, the preview
  token or the Public role.
