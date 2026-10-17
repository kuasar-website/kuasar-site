No motion and no user-facing page in this change, so there is no un-animated baseline to
order tasks around. Both locales are covered in every content task.

## 1. CMS content model

- [x] 1.1 Add the `project-platform` single type (`apps/cms/src/api/project-platform/`): `intro`, `whatsappUrl`, `whatsappLabel`, `features`; i18n and draft/publish on (design D1, D2, D6)
- [x] 1.2 Add the `platform.feature` component (`title`, `description`, both required) (D3)
- [x] 1.3 Add the `platform-project` collection (`apps/cms/src/api/platform-project/`): `title`, `summary`, `coverImage`, `startYear`, `endYear`, `projectStatus`, `applicationUrl`; i18n and draft/publish on (D4, D5, D6)
- [x] 1.4 Core controller, router and service for both, following the existing one-line pattern

## 2. Backup coverage

- [x] 2.1 Allowlist both types with `kind`, API names and populate (`scripts/content-snapshot/content-types.mjs`)
- [x] 2.2 Single-type request URL, published only, no pagination (`request.mjs`)
- [x] 2.3 Single-type fetch: 404 `NotFoundError` is no entry; 401, 403, other statuses, non-JSON and unexpected shapes fail the run (`single.mjs`) (D7)
- [x] 2.4 Export chooses the fetch by `kind` (`export.mjs`)
- [x] 2.5 Pickers for both types, every field named, `features` in order (`transform.mjs`)
- [x] 2.6 Tests: single-type fetch and URL; both types end to end; a missing token permission fails the run and writes nothing; every CMS type except Alumni is allowlisted, with `kind` and names matching `schema.json`; every component/media/relation attribute is populated; every schema and component field is kept (D8). Each guard checked by breaking the code on purpose

## 3. Documents

- [x] 3.1 `design/content-model.md`: storage table, both entities, the Mission boundary
- [x] 3.2 `docs/ops/cms-runbook.md`: backup token scope, the export list, "Rolling out a new content type", editing notes, single-type restore
- [x] 3.3 `docs/HANDOVER.md`: backup token scope
- [x] 3.4 Spec deltas: `cms-platform` (modified) and `project-platform` (new)

## 4. Automated checks

- [x] 4.1 `npx @fission-ai/openspec@1.9.0 validate project-platform-cms --strict`
- [x] 4.2 `npm run build -w cms` (Strapi admin and TypeScript)
- [x] 4.3 `npm run test:content-backup`, `npm run test:cms`, the CMS unit tests (`apps/cms/src/**/*.test.ts`)
- [x] 4.4 Tier A steps locally; Tier A in CI on the pull request
- [ ] 4.5 Manual `cms-deploy.yml` run from `change/project-platform-cms`: builds the image and checks its baked commit; pushes and deploys nothing

**CI gate:** none covers the CMS schema (`docs/adr/0004-verification.md`). `test:content-backup`
is not run by any CI workflow today; it protects the backup only when run by hand (design
D8). Tier A covers that the rest of the repository still builds. Sections 4 and 5 are the
pre-merge substitute for a Strapi preview, which does not exist.

## 5. Local verification (local Strapi 5.52.3, throwaway Postgres 16, dummy data only)

- [x] 5.1 Strapi boots with the new schemas and creates their tables
- [x] 5.2 Content Manager: Collection Types (8) includes Platform Project; Single Types (1) is Project Platform; locales are exactly `en` and `tr`
- [x] 5.3 `en`/`tr`: localized fields differ; `startYear`, `endYear`, `projectStatus`, `applicationUrl`, `coverImage` and `whatsappUrl` are shared; `features` keep each locale's own order and count (4 in `en`, 3 in `tr`); English publishes without Turkish
- [x] 5.4 Required at publish: `summary`, `startYear`, `projectStatus`, a cover's `altTr`, `intro`, a feature's `description`; zero features publishes
- [x] 5.5 Validation (dummy URLs): `whatsappUrl` accepts the four WhatsApp shapes and refuses `http://`, lookalikes, other hosts, a bare host and text; `applicationUrl` refuses `http://` and text; years outside 1900–2100 refused. Strapi saves these in a **draft** and refuses them at **publish** (D6)
- [x] 5.6 Publish, unpublish and republish for both types; unauthenticated `?status=draft` → 403; unauthenticated published read → 403 (no Public permission)
- [x] 5.7 Backup against local Strapi, written to a scratch directory only: new types empty → run succeeds with both files `[]`; populated → every field, both locales, feature order kept, no draft and no Alumni in any file; the old six-type token → `HTTP 403`, run fails, 0 files written
- [ ] 5.8 Human code review and approval of the pull request

## 6. After merge, in this order (`docs/ops/cms-runbook.md`, "Rolling out a new content type")

- [ ] 6.1 Merge Tuesday–Thursday; `cms-deploy.yml` on `main` goes green
- [ ] 6.2 Super Admin adds `find`/`findOne` on Platform Project and `find` on Project Platform to `CONTENT_BACKUP_API_TOKEN`, nothing else
- [ ] 6.3 Run Content snapshot by hand
- [ ] 6.4 Confirm it is green and `platform-projects.json` and `project-platforms.json` exist on `content-snapshots`
- [ ] 6.5 Only then grant the Editor role Read, Create, Update, Delete and Publish on both types, in `en` and `tr`, and check they are on
- [ ] 6.6 After the first real editor publish, run the snapshot by hand again and confirm the entries appear in both locales

Public read permission is not granted here; the frontend change grants it.
