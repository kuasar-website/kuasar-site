## Context

- Builds on `openspec/changes/project-platform-cms/` (#52): its snapshot code reads
  collections and single types, its backup tests fail when a CMS type is not on the
  allowlist, and its `cms-platform` deltas are the base this change amends. Conventions it
  follows rather than restates: `design/content-model.md` ("Locale conventions"), the
  runbook's "Rolling out a new content type", and `docs/adr/0002-cms.md` (decisions 5 and 6
  on media; Known debt: KVKK).
- Uploaded files today: Galactic Summit's `sponsorshipPdf` is a bare `media` field with
  `allowedTypes: ["files"]`; uploads go to R2 at `media.<DOMAIN>`, capped at 25 MB, limited by
  the upload configuration (`apps/cms/config/plugins.ts`) to images, video, audio, PDF, Word,
  Office Open XML, plain text and CSV. The snapshot stores media as URLs, never binaries.

## Goals / Non-Goals

**Goals:**
- Editors add, translate and publish Resources with uploaded files from Strapi.
- Resource content is in the backup before any editor can create it.
- The smallest model that works; everything deferred is additive later.

**Non-Goals:**
- The page, loader, registry entry, revalidation tag or preview (the frontend change).
- Public read permission (the frontend change).
- A category taxonomy, PDF-only enforcement, or any change to the upload limit.

## Decisions

### D1. One collection; no page-level single type
The page's heading, intro sentence and empty state are fixed copy, which every section keeps
in code (`components/*/copy.ts`). A `resources-page` single type would add a type, a backup
entry, permissions and a rollout step to make one sentence editable. If editors later need
to change the intro, a single type is additive. The name is `resource`: `document` is a
reserved Strapi model name (`@strapi/utils`, `RESERVED_MODEL_NAMES`).

### D2. Three fields
`title` and `description` (localized, required) and `file` (localized, required). Left out,
each additive later: a category (no agreed taxonomy; the path is an enum, with labels in
code for both locales), a cover image (it would add an image and two required alt texts to
every entry for a document list), a year or date (the page sorts by the localized title), a
manual order, an external URL, a slug and a body (no detail pages).

### D3. `file` is a bare media field, `allowedTypes: ["files"]`, like `sponsorshipPdf`
Strapi's `allowedTypes` takes categories (`images`, `videos`, `audios`, `files`), not MIME
types, so `files` is every allowed type that is not an image, video or audio: today PDF,
Word, Office Open XML, plain text and CSV. There is no PDF-only rule (a user decision); the
page will show the file's format. The 25 MB limit is unchanged.

**Verified locally (Strapi 5.52.3):** the Content Manager's file picker offers images and
videos without a selection checkbox, so they cannot be chosen, while PDFs and a `.docx` can;
a PDF ticked and confirmed lands in the field. **The Content API does not enforce
`allowedTypes`:** a direct API write attaching an image or a video was saved and published.
Editors only use the Content Manager, so this is a gap only for scripted writes. The
frontend change must therefore treat a non-document file as invalid data, and degrade rather
than fail the build (a failing build would block every deploy).

### D4. The entry's locale is the language of its file
`file` is localized, unlike every image in the model, because a document's language is its
content rather than a fact about it. A resource in both languages has a file per locale; a
one-language document exists in that locale only. An English-only Resource reaches `/tr`
through the existing silent fallback, marked `lang="en"`, so the page can say it is English
without a field. A Turkish-only Resource is absent from `/en`, as with News. Not covered: a
Turkish title on an English-only file. That needs one optional field (the file's language),
deferred until it is wanted.

### D5. Backup: one allowlist entry and one picker on #52's code
`content-types.mjs` gets `{ uid: "resource", kind: "collection", pluralName: "resources",
populate: ["populate[file]=true"] }`; `transform.mjs` gets `pickResource`. The file is
reduced to its URL, original name and MIME type: the archive (Shared Drive) keeps originals
under their uploaded names, while R2 URLs are hashed, so the name is how a restore finds
the original. `reduceMedia`, the single-type code and the request code are unchanged.
#52's schema-driven test failed as soon as the schema existed without a backup entry, which
is the guard working.

### D6. Public uploads and the archive
A file is public at its media URL from the moment it is uploaded; draft/publish controls the
entry, not the file. Hence the runbook's notes: never upload confidential documents, keep
the original in the media archive (the snapshot has no binaries), and upload a new file for
a revision rather than "Replace media" (R2 has no versioning).

### D7. The count-free requirement name in `cms-platform`
Adding a type has to rename the content-type requirement anyway. It is renamed to "The CMS
exposes exactly the listed project-defined content types", so the next type changes the list,
not the name. Its base is `project-platform-cms`'s requirement, still in flight: OpenSpec
validates this, and archive applies it, only after `project-platform-cms` is archived.

### Rule checks
- **Motion:** none. **First-load JS:** no change; `apps/web` is untouched.
- **New Strapi fields and locale:** three fields, all localized, listed in
  `design/content-model.md` and the spec.

## Risks / Trade-offs

- [Merging deploys production with no preview] → The local verification in tasks 5 and a
  build-only `cms-deploy.yml` run from the branch are the pre-merge substitute.
- [A scripted API write can attach an image] → Editors use the Content Manager, which
  refuses it; the frontend treats it as invalid data (D3).
- [Uploads are public before publishing] → Runbook notes (D6); nothing confidential may be
  uploaded.
- [The file itself is not backed up] → The original is kept in the media archive (D6);
  ADR 0002 decision 6 already rests on it.
- [This change depends on #52] → It merges after #52, and archives after
  `project-platform-cms` is archived.
- [Backup tests are not in CI] → As in #52 (its design, D8); a separate decision.

## Migration Plan

No data migration. On first boot Strapi creates the `resources` table; media links use
Strapi's existing polymorphic file relation. The steps after merge are tasks 6.1–6.6 and the
runbook's "Rolling out a new content type". Rollback before Editor access: revert the merge.
The new table holds no content until then.

## Open Questions

None. Category, file types, ordering and the size limit were decided for this change.
