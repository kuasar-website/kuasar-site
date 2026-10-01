## A. Implementation (code and workflow)

- [x] A.1 Add the export script (`scripts/content-snapshot/export.mjs`, with `content-types.mjs`, `request.mjs`, `paginate.mjs`, `transform.mjs` — it never runs inside the Strapi process, so it does not live under `apps/cms`) that calls the production REST Content API with `Authorization: Bearer ${CONTENT_BACKUP_API_TOKEN}`, iterating the fixed content-type list (`stellar-talk`, `nebula-night`, `galactic-summit`, `schedule-event`, `announcement`, `sponsor` — `alumnus` never appears). **Confirmed at implementation time:** (a) `apps/web` names no existing Strapi-base-URL environment variable to reuse — `apps/web/lib/strapi/fetch.ts`'s `fetchStrapi()` takes `baseUrl` as a parameter with no caller yet, and no `apps/web/.env.example` exists — so `CMS_BASE_URL` is a new name, not a duplicate; (b) whether Strapi blocks an unprivileged token from overriding `status` to `draft` remains unverified against a live instance (requires production access, out of scope for static implementation) — does not affect this script's own correctness, since it never sends anything but `status=published` (enforced by `request.mjs` having no parameter for it at all — see B.6).
- [x] A.2 Enumerated and implemented the exact `populate` query per content type in `content-types.mjs`, verified field-by-field against the live `apps/cms/src/api/*/content-types/*/schema.json` and `apps/cms/src/components/**` in this worktree: `sponsors` (Galactic Summit relation), every `shared.image` usage (`speakerPortrait`, `photos` ×2, `backgroundImage`, `logo`/`logoLight`, `coverImage`), the two direct media attributes with no component wrapper (`hoverVideo`, `sponsorshipPdf`), and the nested-component case (`speakers.portrait`, two levels deep via `populate[speakers][populate][portrait][populate]=image`).
- [x] A.3 Implemented in `paginate.mjs`'s `fetchAllPages()`: loops on `pagination[page]` until `meta.pagination.pageCount` is reached, concatenating every page before returning. Covered by `paginate.test.mjs`'s multi-page fixture test.
- [x] A.4 Implemented in `export.mjs`'s `collectSnapshots()`/`writeSnapshots()` and `transform.mjs`'s `reduceEntry()`/`sortKeysDeep()`: combined entries (both locales) sorted by `(documentId, locale)`; object keys sorted recursively; relations reduced via `reduceRelation()`; media reduced via `reduceImage()`/`reduceMedia()` including `altEn`/`altTr`; one JSON array per content type at `content/_snapshots/<pluralName>.json`; `[]` for zero entries.
- [x] A.5 Added `.github/workflows/content-snapshot.yml` on this branch (lands on `main` once merged): `schedule` (weekly, Monday 03:00 UTC) + `workflow_dispatch`, job-scoped `permissions: { contents: write }` only, `concurrency: { group: content-snapshot, cancel-in-progress: false }`. Orphan-branch creation on first run (`git worktree add --detach` + `git checkout --orphan` + `git rm -rf`, a portable approach rather than relying on the newer `git worktree add --orphan` flag), wholesale replace on later runs, fixed commit message template.
- [x] A.6 Implemented: `export.mjs` collects every content type into memory before calling `writeSnapshots()` at all; `fetchAllPages()` throws immediately on any non-OK response, network error, or unexpected body shape at any page, propagating up and aborting the whole run before any file is written. Covered by `export.test.mjs`'s and `paginate.test.mjs`'s failure-path tests.
- [x] A.7 Confirmed: every filename and the commit message template in the workflow are fixed, code-defined strings — no entry content ever reaches a shell command or path. The export script never logs the token or the `Authorization` header value (only `uid`/`locale` progress lines). Covered by `workflow.test.mjs`.

## B. Safe automated/static verification (no production access required)

- [x] B.1 `npm run typecheck` and `npm run lint` both pass (these new files sit outside the `apps/*` workspaces `npm run` targets, matching the existing `scripts/checks/*.mjs` convention of no typecheck/lint coverage there — confirmed neither command's scope changed).
- [x] B.2 `content-types.test.mjs`: asserts the allowlist excludes `alumnus`/`alumni` and is exactly the six approved UIDs. Passing.
- [x] B.3 `transform.test.mjs`: fixture-based tests for `reduceImage`/`reduceMedia`/`reduceRelation`/`sortKeysDeep` covering sorted-key output and correct URL/alt-text/documentId reduction. Passing.
- [x] B.4 `export.test.mjs`: a zero-entry fixture response produces `[]` for every content type. Passing.
- [x] B.5 `paginate.test.mjs`: a three-page fixture sequence (returned out of order relative to a naive expectation) is fully collected; `export.test.mjs` separately confirms the combined result sorts by `documentId` regardless of API order. Passing.
- [x] B.6 `request.test.mjs`: asserts every constructed URL includes `status=published`, asserts `buildRequestUrl`'s arity (4) has no parameter that could carry a status override, and asserts `status=draft` never appears across a range of inputs. Passing.
- [x] B.7 `transform.test.mjs`: a fixture Galactic Summit entry carrying an unexpected `alumniRelation` key is dropped from the picked output entirely and triggers a `console.warn`, verified by both a direct `warnUnexpectedKeys` test and an integration-level `reduceEntry` test. Passing.
- [x] B.8 `workflow.test.mjs`: a narrow text scanner (matching this repo's existing `locale-parity.mjs` approach, not a new YAML-parsing dependency) confirms the `permissions` block names only `contents: write`, the `concurrency` block matches `design.md`, only the two approved secret names are referenced, nothing echoes the token, and no push targets `main`. Passing. All 36 tests across the suite (`npm run test:content-backup`) pass; `npm run check:reduced-motion-css`, `check:locale-parity`, `check:budgets`, `test:budgets`, `test:content`, `test:media`, and `apps/web`'s production build all still pass unaffected.

## C. Token / manual setup — a human, admin-panel action, not code

- [ ] C.1 In the production Strapi admin panel (Settings → API Tokens), create a `custom`-type token granted `find`/`findOne` on exactly `stellar-talk`, `nebula-night`, `galactic-summit`, `schedule-event`, `announcement`, `sponsor` — no other action, no other content type, explicitly never `alumnus`.
- [ ] C.2 Add `CONTENT_BACKUP_API_TOKEN` (the token value) and `CMS_BASE_URL` (or the reused equivalent from A.1) as GitHub repository secrets. No database credential of any kind is required or requested.
- [ ] C.3 Confirm no other permission was accidentally granted to the token beyond C.1's list (a quick re-read of the token's permission screen before saving).

## D. First live manual snapshot run — **owed, requires production access, NOT performed during planning**

- [ ] D.1 Manually trigger the workflow once against production (`workflow_dispatch`), after C.1–C.2 are complete.
- [ ] D.2 Confirm the run completes successfully and `content-snapshots` now exists on origin, containing only `content/_snapshots/**` plus its README — no stray files, no `main` history.
- [ ] D.3 Confirm every one of the six included content types has a file, including any with zero published entries (`[]`, not missing), and that a content type known to have more than one page's worth of entries (if any exists at run time) has all of them, not just the first page.

## E. Dump inspection for known Alumni and known draft — **owed, NOT performed during planning**

- [ ] E.1 Fetch the `content-snapshots` branch produced by D.1 and open the dump. Search it for a known alumnus's name — **must not appear anywhere in any file**.
- [ ] E.2 Search the dump for a known draft-only entry's title or content — **must not appear anywhere in any file**.
- [ ] E.3 Spot-check one entry with a relation (a Galactic Summit with sponsors) and one entry with media (any `shared.image` usage) to confirm the populate list from A.2 actually produced complete, non-empty data.

## F. Second-person restore drill — **owed, assigned to Dev 4, explicitly not the implementer**

- [ ] F.1 Dev 4 follows `design.md`'s documented restore procedure against a disposable, non-production Strapi instance (the same local-Postgres pattern `cms-platform` task 2.5 established) — never against production.
- [ ] F.2 Dev 4 confirms the restored entries match the snapshot's content, for at least one entry per included content type, including confirming a restored Announcement's `slug` matches the snapshot exactly rather than being regenerated.
- [ ] F.3 Dev 4 records the drill's outcome (what worked, what was unclear in the documented procedure) in `docs/ops/cms-runbook.md` and/or `docs/HANDOVER.md`.

## G. HANDOVER / runbook documentation

- [x] G.1 Updated `docs/ops/cms-runbook.md` step 8: describes the implemented REST-API-plus-token mechanism, names both required secrets, states the exact six content types, and explicitly states that none of it has actually run yet (no token created, no manual run, no `content-snapshots` branch, no restore drill) rather than implying completion.
- [x] G.2 Updated `docs/HANDOVER.md`'s "Where the backups are" section to describe the implemented mechanism (dedicated token, no database credential) and to explicitly state the same "not yet true as of this writing" caveat — it was already largely forward-looking-but-accurate about the *intended* shape; it now also accurately reflects the *as-implemented* mechanism.
- [x] G.3 Named, in both documents, "whichever Super Admin performs the monthly CMS check" as who performs the monthly liveness check, cross-linked to `docs/HANDOVER.md`'s accounts table (which still has no real names recorded — that gap is pre-existing and outside this change's scope).

## H. Monthly liveness verification

- [x] H.1 Confirmed: the runbook's existing "Monthly: confirm the backup is still running" commands (`git fetch origin content-snapshots`, `git log origin/content-snapshots -1 --format='%ci %s'`) needed no changes — `content-snapshot.yml` (A.5) pushes ordinary commits to a branch named exactly `content-snapshots`, matching what those commands already assume.
- [ ] H.2 **Recorded as an Open Question, not a task:** whether the two-week staleness check should ever become automated (a second scheduled workflow that pages someone). Deliberately not decided or implemented here — see `design.md`, "Monthly liveness."
