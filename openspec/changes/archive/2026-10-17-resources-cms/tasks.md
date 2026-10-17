No motion and no user-facing page in this change, so there is no un-animated baseline to
order tasks around. Both locales are covered in every content task. Depends on
`project-platform-cms` (#52): merge after it, archive after it is archived.

## 1. CMS content model

- [x] 1.1 Add the `resource` collection (`apps/cms/src/api/resource/`): `title`, `description`, `file` (media, single, `allowedTypes: ["files"]`), all localized and required; i18n and draft/publish on (design D1–D4)
- [x] 1.2 Core controller, router and service, following the existing one-line pattern

## 2. Backup coverage

- [x] 2.1 Allowlist `resource` (`scripts/content-snapshot/content-types.mjs`), populating `file` (D5)
- [x] 2.2 `pickResource` in `transform.mjs`: `title`, `description`, and the file's URL, original name and MIME type
- [x] 2.3 Tests: the allowlist and populate lists include `resource`; a picker test; an end-to-end export with bilingual, English-only and Turkish-only Resources; a token without Resource permission fails the run and writes nothing. #52's schema-driven test failed before 2.1, as intended

## 3. Documents

- [x] 3.1 `design/content-model.md`: storage table, Resource
- [x] 3.2 `docs/ops/cms-runbook.md`: backup token scope and export list, Resource editing notes (public uploads, no confidential files, media archive, new upload instead of Replace media), restore
- [x] 3.3 `docs/HANDOVER.md`: backup token scope
- [x] 3.4 Spec deltas: `cms-platform` (modified) and `resources` (new)

## 4. Automated checks

- [x] 4.1 `npx @fission-ai/openspec@1.9.0 validate resources-cms --strict`, and `validate --all --strict`
- [x] 4.2 `npm run build -w cms`
- [x] 4.3 `npm run test:content-backup`, `npm run test:cms`, the CMS unit tests (`apps/cms/src/**/*.test.ts`)
- [x] 4.4 Tier A steps locally; Tier A in CI on the pull request
- [x] 4.5 Manual `cms-deploy.yml` run from `change/resources-cms`: builds and checks the image; pushes and deploys nothing (run 39032983953 at `af97084`: build-push succeeded, deploy skipped)

**CI gate:** none covers the CMS schema (`docs/adr/0004-verification.md`), and no CI workflow
runs `test:content-backup`. Sections 4 and 5 are the pre-merge substitute for a Strapi
preview.

## 5. Local verification (local Strapi 5.52.3, throwaway Postgres 16, dummy files only)

- [x] 5.1 Strapi boots with the new schema and creates its table
- [x] 5.2 Content Manager: Collection Types (9) includes Resource; Single Types is still only Project Platform; Resource is locale-enabled with draft/publish and has exactly `title`, `description`, `file`
- [x] 5.3 `en`/`tr`: title, description and file differ per locale, each locale holding its own file; an English-only `.docx` Resource publishes without Turkish; a Turkish-only PDF Resource publishes without English; each locale's published list holds only its own Resources
- [x] 5.4 Publish refused without `title`, or without `description` and `file`
- [x] 5.5 File picker: PDFs and a `.docx` are selectable and a ticked PDF lands in the field; an image and a video have no selection checkbox. Recorded: the Content API itself accepts an image or video id (design D3)
- [x] 5.6 Publish, unpublish and republish; anonymous `/api/resources` (both locales) and `?status=draft` → 403
- [x] 5.7 Backup against local Strapi, written to a scratch directory only: no Resources → run succeeds, `resources.json` is `[]`; populated → one entry per published locale with its own file URL, name and type, no draft; a token without Resource permission → `HTTP 403`, run fails, 0 files written
- [x] 5.8 Human code review and approval of the pull request (#53 approved at `41cfeb3`, 2026-10-17; the reviewer's runbook note was then added as `4d62613`, with the approval kept)

## 6. After merge, in this order (`docs/ops/cms-runbook.md`, "Rolling out a new content type")

- [x] 6.1 Merge (after #52), Tuesday–Thursday; `cms-deploy.yml` on `main` goes green (merged after #52 as `242dba5` on Saturday 2026-10-17, outside the Tuesday–Thursday window; `cms-deploy.yml` run 39058607821 on `242dba5` succeeded)
- [x] 6.2 Super Admin adds `find`/`findOne` on Resource to `CONTENT_BACKUP_API_TOKEN`, nothing else (the 6.3 run read Resource without a permission error, which a token without it fails; that the scope is nothing else is not verified here)
- [x] 6.3 Run Content snapshot by hand (run 39060286595 on `242dba5`, `workflow_dispatch`, succeeded)
- [x] 6.4 Confirm it is green and `resources.json` exists on `content-snapshots` (snapshot commit `c2e9e4b`: `content/_snapshots/resources.json` present, `[]`)
- [ ] 6.5 Only then grant the Editor role Read, Create, Update, Delete and Publish on Resource, in `en` and `tr`, and check they are on
- [ ] 6.6 After the first real editor publish, run the snapshot by hand again and confirm the entry appears

Public read permission is not granted here; the frontend change grants it.
