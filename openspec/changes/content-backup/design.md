## Context

See `proposal.md` — Why. `docs/adr/0002-cms.md` decision 2 (rule 2) and its "Known debt: KVKK" section, plus `docs/ops/cms-runbook.md` step 8 and `docs/HANDOVER.md`'s "Where the backups are" section, are the governing authority; this document records how that authority is actually implemented against the installed Strapi 5.52.3 codebase, verified by reading its source rather than assumed from training data.

No `apps/web` route, animation, or bundle is in scope. This is a backend-only, CI-only change.

**Revision, 2026-10-01:** the mechanism below was changed after a focused least-privilege design review found that the originally proposed `createStrapi().load()` + direct-database approach is **not read-only** — verified directly in the installed Strapi source (see "Mechanism," below) — and therefore cannot be safely paired with a restricted database credential. The revised mechanism (a dedicated, scoped Strapi API token against the REST Content API) satisfies every hard requirement with a strictly smaller blast radius and no database credential at all. The reasoning that led to this change is kept below rather than deleted, because the "why not the obvious approach" is as load-bearing for a future maintainer as the decision itself.

## Goals / Non-Goals

**Goals:**
- Make `docs/HANDOVER.md`'s and the runbook's already-written backup descriptions literally true.
- Published-only and no-Alumni are structural properties of the export, not filters that could be forgotten or relaxed.
- A snapshot is auditable by a non-Strapi-expert successor: plain JSON, deterministic, greppable.
- Least-privilege GitHub Actions permissions, no secret ever logged or committed, and — per the revision above — no database credential and no production write/migration path at all.

**Non-Goals:** media backup (decided against in ADR 0002 decision 6), automated restore, provisioning new Neon/DigitalOcean accounts, the first live run and the restore drill (both deferred — see `tasks.md`).

## Decisions

### Mechanism: the Strapi REST Content API via a dedicated, scoped API token — not `createStrapi().load()`, not the `strapi export` CLI

Three mechanisms were compared against the installed Strapi 5.52.3 source, not assumed:

**A. `createStrapi().load()` + direct Document Service query.** This was the original plan. It is rejected here, for a reason more serious than style: **it is not a read-only operation.** Verified directly in `node_modules/@strapi/core/dist/Strapi.js`: `load()` calls `bootstrap()`, and `bootstrap()` unconditionally runs `await this.db.schema.sync()` (a full schema diff/migration against whatever database it connects to) and, on the "unidirectional join table repair" check, an unconditional `await this.store.set(...)` write to the core-store table — **every single time, whether or not `.start()` is ever called.** This was also observed empirically: the `cms-platform` task 2.5 local-`develop` boot log (session-prior) shows `[internal migration]: migrating 5.0.0-...` lines during the "Loading Strapi" phase, before any `develop`-specific step. A strictly read-only database role would make `.load()` itself fail — it cannot verify or apply its own schema-sync check without write access. So "createStrapi().load(), never .start()" does not, by itself, make this safe against a restricted credential — the two ideas were in tension in the original plan without that tension being named. Paired with the *unrestricted* production `DATABASE_URL` (the accepted fallback the original design named), option A can run, but it means a CI job whose only job is to read six content types also gets a full read-write connection to the entire production database, and runs a schema-sync/migration check against it on every scheduled run — a large blast radius and a real, if usually harmless, write path for a job whose only purpose is reading.

**B. Strapi REST Content API using a dedicated API token.** Strapi 5 ships a first-class, built-in API token type for exactly this: confirmed in `node_modules/@strapi/admin/dist/shared/contracts/content-api-token.d.ts`, `type: 'custom' | 'full-access' | 'read-only'`. A `custom` token can be granted `find`/`findOne` permission on exactly the six included content types and **no permission at all on `api::alumnus.alumnus`** — provisioned entirely from the Strapi admin panel (Settings → API Tokens), no Neon or DigitalOcean access needed. The backup job becomes a stateless HTTP client: it never establishes a database connection, never boots Strapi, never runs a schema sync, and needs none of the Strapi boot secrets (`APP_KEYS`, `JWT_SECRET`, etc.) — only the token itself.

**C. The fully public, unauthenticated REST API (no token).** Rejected: `apps/web` already reads some of these content types anonymously via the Public role (per `cms-platform`'s own live-verification notes), but relying on that same, shared, globally-mutable role for a backup's safety property is a coupling this design should not introduce. If the Public role's permissions are ever tightened for an unrelated reason, the backup silently breaks with no dedicated fix point; if the Public role's permissions are ever *loosened* to include Alumni by mistake, a backup built on it has no independent guard against exporting it. A dedicated, purpose-built token (option B) is not meaningfully harder to provision than confirming the Public role's current grants, and it gives the backup its own, independently auditable permission boundary.

**Decision: option B.** The export script authenticates to the production Strapi instance's REST API (`https://<cms-host>/api/<plural>?status=published&locale=en|tr&populate=...`) with `Authorization: Bearer <token>`, using a `custom`-type token scoped to `find`/`findOne` on exactly the six included content types.

### Published-only is Strapi's own verified default, not something the script must additionally enforce

Verified in `node_modules/@strapi/core/dist/core-api/service/core-service.js`: `getFetchParams(params = {}) { return { status: 'published', ...params }; }` — every core-api controller action (the same code path the public `/api/<plural>` routes use) defaults to `status: 'published'` unless the caller's own query explicitly overrides it. The backup script never sends a `status` value other than `published`, so this default and the script's own explicit request agree — a double confirmation, not a single point of failure. (Note, precisely: this document could not fully verify from source, within this review's scope, whether Strapi additionally *blocks* an unprivileged caller from overriding `status` to `draft` in the query string — the script's own behavior never attempts this regardless, so it does not affect this design's own guarantee, but it is named here rather than silently assumed away; see Open Questions.)

**Alumni is excluded on two independent layers**, not one: the script's own hardcoded content-type list never includes `api::alumnus.alumnus` (code-level, the same guarantee option A would have had), *and* the token's own granted permissions never include it either (credential-level — an attempt to query it would 403, even from a modified or compromised script). This is strictly stronger than option A's single code-level guarantee.

**Content types exported, in the fixed order the script hardcodes them** (verified against the installed schemas, `apps/cms/src/api/*/content-types/*/schema.json`): `stellar-talk`, `nebula-night`, `galactic-summit`, `schedule-event`, `announcement`, `sponsor`. `alumnus` is the seventh schema in `apps/cms/src/api/` and is deliberately absent from this list and from the token's own permission grant.

### Completeness: verified field-by-field against every one of the six schemas and their components, not assumed

A REST-derived snapshot only matches a full-fidelity export if no needed field is hidden from serialized API output and every relation/media attribute is actually requested. Checked directly against `apps/cms/src/api/*/content-types/*/schema.json` and every component they reference (`apps/cms/src/components/**/*.json`):

- **No field is hidden.** None of the seven content-type schemas mark any attribute `"private": true`, so nothing the six included types define is invisible to the REST API that a direct query would otherwise see.
- **`documentId` is present in REST output by default** — confirmed in `node_modules/@strapi/core/dist/core-api/controller/transform.js`, whose `transformResponse` destructures and re-attaches `documentId` on every entry.
- **Plain scalar types** (`string`, `text`, `richtext`, `integer`, `boolean`, `datetime`, `enumeration`) need no special handling — the REST API returns them as-is, and `announcement.body`'s `richtext` value is exported as its full raw string (markdown/HTML), unmodified.
- **The `uid` field is a restore hazard, not just a scalar.** `announcement.slug` is `type: "uid", targetField: "title"`. The snapshot stores the slug's actual value, but a restore that lets Strapi regenerate it from `title` (rather than setting `slug` explicitly from the snapshot) can produce a *different* slug than the original — defeating the entire point of "distinct per-locale slug" fidelity. The documented restore procedure (below) sets `slug` explicitly.
- **Media is not only the `shared.image` component.** Most image fields go through `shared.image` (`image` + required `altEn` + required `altTr`), used by `speakerPortrait`, `photos`, `backgroundImage`, `logo`/`logoLight`, `coverImage`, and `summit.speaker`'s nested `portrait`. But **two attributes are direct `media` fields with no component wrapper**: Stellar Talk's `hoverVideo` (`allowedTypes: ["videos"]`) and Galactic Summit's `sponsorshipPdf` (`allowedTypes: ["files"]`) — the actual sponsorship PDF document. Both need the same "public URL only, no binary" treatment as `shared.image`'s `image` field; a script written only for the component shape would silently drop both. The snapshot records, for every media reference: the public `media.<DOMAIN>` URL, and — for `shared.image` specifically — `altEn`/`altTr` alongside it (required content, not incidental metadata).
- **Populate must go two levels deep in one case.** Galactic Summit's `speakers` is a repeatable `summit.speaker` component whose own `portrait` field is itself a nested `shared.image` component — a component inside a component. The populate query for `speakers` must reach `portrait.image` (Strapi's dot-path deep-populate syntax), or the nested portrait silently comes back empty. `summit.programme-item` (Summit's `programme` field) has no media/relation of its own and needs no special populate depth.
- **The relation is `sponsors`/`summits`**, a `manyToMany` between Galactic Summit and Sponsor — the only relation among the six schemas, already covered by the `documentId`-reference decision above.

This is a real, enumerated design obligation, not automatic — task A.2 records the full populate list per content type explicitly, and it must be reviewed whenever any of the six schemas or their components change. Getting it wrong silently omits a relation, a photo's alt text, a hover video, or the sponsorship PDF reference, rather than erroring.

### Pagination: the REST API paginates by default — the script must exhaust every page, then sort

Strapi's Content API returns paginated results (a default page size, with `meta.pagination.page`/`pageCount`/`total` in every response) — a content type with more entries than one page's worth would have its later entries **silently missing** from a single-request export. The script SHALL loop, requesting successive pages (`pagination[page]`, incrementing) until the response's own `meta.pagination.pageCount` is reached, concatenating every page's results before any further processing. This is treated as a correctness requirement regardless of how few entries these content types are expected to hold today — a design that only happens to work below one page size is not a design, it is a coincidence.

**Ordering must be independent of how many requests it took to collect it.** After all pages are collected, the script sorts the combined result by `documentId` (a stable, content-independent key) before serializing — never trusting the API's own page-to-page ordering to be stable across runs. This is the array-level counterpart to the object-key sorting already decided for a single entry: both exist so that identical underlying content produces a byte-identical file regardless of how the data happened to be paginated or returned.

### A related, pre-existing issue this backup does not attempt to paper over

This project has a separately diagnosed, open Strapi behavior (from earlier live CMS verification, prior to this change) where a non-localized component field is not always reliably copied when a new locale is first created for an entry. This backup exports whatever the live API actually returns for each locale, faithfully — including if that means a non-localized field's value genuinely differs or is empty between `en` and `tr` due to that pre-existing issue. Working around it is out of scope here; a backup that silently "fixed" what it saw would misrepresent the live data it is supposed to be a faithful copy of.

### The workflow never boots Strapi, never connects to the database, and therefore has no migration or write path

This directly satisfies "ensure no migration/write path can occur during export" — not as a minimized risk, but structurally: the job is an HTTP client making authenticated GET requests, and nothing in that path has the ability to write to, let alone migrate, the production schema. This is the most significant improvement the revised mechanism makes over the original plan.

### Snapshot format: one deterministic JSON file per content type

Unchanged from the original plan — this decision was about the *output* shape, not the export mechanism, and both mechanisms can produce identical output.

Layout:

```
content/_snapshots/
  stellar-talks.json
  nebula-nights.json
  galactic-summits.json
  schedule-events.json
  announcements.json
  sponsors.json
  README.md
```

Filenames are the schema's own fixed `pluralName` (never derived from entry content — see "No secret or content in requests, paths, or logs," below). Each file is a JSON array; each element is one published entry in one locale, containing `documentId`, `locale`, and every schema-defined scalar/component attribute except relations and media (handled separately below). **Object keys are serialized in a fixed, sorted order** so identical content produces a byte-identical file on every run — no incidental diff noise from column order, pagination, or query-plan variance. A content type with zero published entries in a locale still produces its file, containing `[]` — never omitted, so a missing file always means "never exported" (a bug), never "nothing published" (a valid state). This mirrors how `sitemap.ts` and the locale-routing spec already treat an empty, valid result as a first-class state rather than an error.

### Relations and media

**Relations to one of the other five included types** (for example Galactic Summit's `sponsors` relation to Sponsor) are stored as the related entry's `documentId`, never the database's internal numeric `id` — the numeric id is not guaranteed stable across a restore into a fresh database; `documentId` is Strapi 5's own stable, portable identifier, and is present in REST responses by default (verified above). **A relation pointing at an excluded type** — there is no such relation from any of the six included types to Alumni today, verified by reading all seven schemas — is asserted absent at export time; if a future schema change ever introduces one, the script drops that reference and writes a warning to the job's own log output (never into the committed snapshot), rather than silently exporting it. This remains a defense-in-depth check; the primary exclusion is now two-layered (code list and token permission), above.

**Media fields** — both `shared.image` component fields and the two direct `media`-type attributes (`hoverVideo`, `sponsorshipPdf`; see "Completeness," above) — keep only the already-public `media.<DOMAIN>` URL the site itself serves in normal operation, plus `shared.image`'s own `altEn`/`altTr` strings where applicable — never a raw R2 endpoint, never a bucket name, never binary data. This is not a new exposure: the URL is the same one every visitor's browser already receives. The photographs and the sponsorship PDF itself remain covered exclusively by the Google Shared Drive policy (`docs/adr/0002-cms.md` decision 6); this change does not add a second, competing media backup path, which would itself be a design the ADR already rejected in its "Alternatives considered."

### Workflow: `.github/workflows/content-snapshot.yml`

- **Lives on `main`** — non-negotiable, because GitHub only fires `schedule` triggers from the default branch (`docs/adr/0002-cms.md` decision 2's own stated reasoning).
- **Triggers:** `schedule` (weekly) and `workflow_dispatch`. Weekly bounds the worst case at six days of lost editing without burying the one revision that matters under 365 near-identical yearly commits — the same reasoning ADR 0002 already gives for this cadence.
- **Permissions:** `contents: write` on the one job that commits and pushes, nothing else — no `packages`, no `pull-requests`, no `id-token`. Matches this repo's own established convention of job-level, minimal `permissions:` blocks (`cms-deploy.yml`). No database-adjacent permission is needed at all, since the job never connects to one.
- **Concurrency:** `concurrency: { group: content-snapshot, cancel-in-progress: false }` — a second run queues behind the first rather than racing it and pushing over the same branch head, the identical pattern `cms-deploy.yml` already uses for its own deploy job.
- **`content-snapshots` initialization:** the job checks whether `origin/content-snapshots` exists. If not, it creates it as a fresh **orphan** branch (`git checkout --orphan content-snapshots`) containing only `content/_snapshots/**` and a short `README.md` explaining what the branch is and pointing back at the runbook — it is never branched from `main`, so no application code or unrelated git history ever appears there.
- **Subsequent runs:** fetch the existing `content-snapshots` branch, replace `content/_snapshots/**` wholesale with the freshly generated files (not an incremental patch), commit, push. A full replace each run means a stale file from months ago can never silently survive alongside current data.
- **One content type's export failure fails the whole run.** The script requests content types independently but does not catch-and-continue; if one HTTP request fails (non-2xx, timeout, or unexpected shape — for example a schema drift the script was not updated for), the job exits non-zero and **nothing is committed** — a partial, silently-incomplete backup is worse than a visibly failed one, matching this repo's general "fail loud, not clever" posture (the media pipeline's build-time refusal of `r2.dev` URLs is the same instinct applied elsewhere).
- **No secret or content in requests, paths, or logs.** The script never logs the API token, and never includes it anywhere but the `Authorization` header. Every filename is a fixed, code-defined `pluralName` — never derived from entry content — so an editor-entered title or slug can never influence a shell command or file path. Commit messages are a fixed template (e.g. `content snapshot: <UTC timestamp>`), never entry content.

### Required secrets, named only — none assumed to exist

- **`CONTENT_BACKUP_API_TOKEN`.** A Strapi `custom`-type API token, created in the production admin panel, granted `find`/`findOne` on exactly `stellar-talk`, `nebula-night`, `galactic-summit`, `schedule-event`, `announcement`, `sponsor` — no other action, no other content type, explicitly never `alumnus`. This is the **only** secret this workflow needs.
- **`CMS_BASE_URL`** (or reuse whatever `apps/web` already names its own Strapi base URL environment variable, to be confirmed at implementation time) — the production Strapi host. Not sensitive in the way a credential is (it is the same host `apps/web` already calls at build time), but still supplied as a repository variable/secret rather than hardcoded, so the workflow does not need a code change if the host ever moves.
- **No `DATABASE_URL` of any kind is required.** This resolves the open question the original plan carried: a dedicated read-only Neon role is **not needed** — the revised mechanism needs no database credential at all, which is a strictly smaller and easier-to-provision surface than any Neon role would have been.
- **No R2, Cloudflare, or Strapi boot secret** (`APP_KEYS`, `JWT_SECRET`, etc.) **is needed.** The job never boots Strapi.

### Restore procedure — human-run, never scripted against production

Unchanged in spirit from the original plan, restated against the new mechanism: fetch `content-snapshots`, read the target content type's JSON file, and recreate entries via the Document Service's own `documents(uid).create()` (or the admin UI directly, for a handful of entries) — **first against a disposable, non-production Strapi instance** (a local `develop` boot against a throwaway local database, the identical pattern `cms-platform` task 2.5 established), never directly against production. Restoring into production afterward is a separate, human-approved action outside this capability's scope. A REST-derived snapshot is exactly as usable for this as a Document-Service-derived one would have been, provided the export script's `populate` list (see "Completeness," above) was actually complete — an incomplete populate list is the one way this mechanism could under-deliver for restore, and it is a code-review-time check, not a runtime one.

**One field needs explicit, non-default handling during restore:** Announcement's `slug` (a `uid` field). The restore procedure sets `slug` explicitly from the snapshot's own recorded value on `create()`, rather than omitting it and letting Strapi regenerate one from `title` — the latter can silently produce a different slug than the original, which is exactly the fidelity a slug-preserving restore exists to guarantee.

### The published-only contract is enforced by a static test, not just documentation

Every request the script makes SHALL include `status=published` explicitly, and the script SHALL have no code path, input, or environment variable capable of sending any other value. Task B.6 requires a static test that fails the build if this ever silently changes — for example, asserting (by parsing the script's own request-construction logic or its compiled query-building function) that the literal string `published` is present everywhere a request is built, and that no branch of the code can produce `draft`. This exists specifically so a future, well-intentioned refactor cannot accidentally loosen the one property this whole capability depends on without the test suite noticing.

### Second-person restore drill

Per `tasks.md` section F, the restore drill is performed by **Dev 4**, not the person who implements this change — matching `docs/ops/cms-runbook.md`'s own already-written requirement ("A restore from `content-snapshots` has been performed at least once, by someone other than the person who set up the export") and the general principle that the person who wrote the export is the worst-positioned person to notice it is broken.

### Monthly liveness: a documented operational check, not new automation

The runbook and `docs/HANDOVER.md` already state the mechanic — compare `content-snapshots`' latest commit age against two weeks — but neither currently names who performs it. This change names it: **whichever Super Admin performs the monthly CMS check** (tied to the runbook's existing "Monthly: confirm the backup is still running" section), and both documents are updated to say so explicitly, cross-linked from `docs/HANDOVER.md`'s accounts section once real names exist there. This is deliberately **not** automated into a second scheduled workflow that pages someone: GitHub has no "alert if a branch goes stale" primitive without building one, which would be new infrastructure solving a problem the existing manual check already covers. Automating it is left as a future, separate decision if the manual check proves unreliable in practice — recorded as an Open Question, not decided here.

## Risks / Trade-offs

- **The REST API's enforcement of `status` for an unprivileged/scoped caller was not fully traced to a specific permission check in this review** (see "Published-only," above). Named explicitly rather than hand-waved: the backup script's own behavior never asks for anything but `published`, so this workflow's own correctness does not depend on the answer — but it remains worth confirming at implementation time (task A.1) for completeness, and matters more to general token hygiene than to this specific design.
- **An incomplete `populate` list silently under-exports relations or media**, since the REST API does not populate by default (unlike a direct Document Service call). Mitigated by task A.2 requiring the populate list to be enumerated explicitly per content type and reviewed whenever a schema changes — the same "nothing implicit" discipline this repo already applies elsewhere (`sitemap.ts`'s explicit per-capability registration, for one).
- **Assuming a single page contains every entry silently drops data** once any content type grows past one page's worth of published entries. Mitigated structurally by the pagination-exhaustion decision above, verified by a static/fixture test (task B.5) using a multi-page fixture response rather than trusting it to be correct by inspection alone.
- **A committed snapshot is effectively permanent once pushed**, per `docs/adr/0005-repository-visibility.md`'s own reasoning about public git history — an accidental draft or Alumni leak here would need to be treated like a leaked secret (rotate the live content, notify, accept the commit is already cloned) rather than "just force-push it away." This is exactly why published-only and no-Alumni are designed as structural, two-layered properties (Decisions, above) rather than a filter that could be toggled off under restore pressure — hard requirement 6 in the proposal is not a preference, it is the whole point.
- **A future Strapi upgrade could change the Content API's default-status behavior**, silently reintroducing drafts. Mitigated by folding "search a fresh manual snapshot for a known draft" into the runbook's existing "re-check the upload extension every time, patch releases included" upgrade ritual, rather than trusting the default to remain correct forever unchecked.
- **A leaked `CONTENT_BACKUP_API_TOKEN` still exposes six content types' published data** (matching what these types already expose or are close to exposing via the site's own Public-role reads) — meaningfully smaller than a leaked database credential of any kind, but not zero. Rotating an API token is a one-click admin-panel action, unlike rotating a database credential.
- **No CI gate gives this change automated confidence beyond static tests** (see `tasks.md`, section B) — the real acceptance is a manual run and a manual restore drill, both by design, both deferred to their own tasks rather than claimed complete here.

## Migration Plan

Greenfield: no existing snapshot exists. First run creates the orphan `content-snapshots` branch. There is no data migration — this change only adds new automation around already-live Strapi content, and no database schema is touched by this change in any way.

Rollback: disable the workflow (or revert this change), and rotate/delete the API token from the Strapi admin panel — a one-click action, unlike rotating a database credential. Because `content-snapshots` is a branch on a public repository, a bad commit already pushed to it is subject to the same "rotate, do not just delete" reasoning as a leaked secret (see Risks) — rollback of the *workflow* is trivial; rollback of a *specific bad snapshot* is not, and is not attempted by disabling the workflow.

## Open Questions

- Whether Strapi's Content API blocks an unprivileged/scoped token from overriding `status` to `draft` via an explicit query parameter — not fully traced in this review (see "Published-only" and Risks). Does not affect this design's own correctness, since the script never attempts it; worth confirming at implementation time as a matter of general rigor.
- Whether `apps/web` already names a `CMS_BASE_URL`-equivalent environment variable this workflow should reuse rather than duplicate — check at implementation time (task A.1).
- Whether GitHub's default `GITHUB_TOKEN` with job-scoped `contents: write` is sufficient to push to `content-snapshots` for the lifetime of this workflow, or whether a future ruleset change (the current ruleset targets only `main`, confirmed live this session) could ever be extended to `content-snapshots` and break a direct push — noted for whoever manages the ruleset, not decided here.
- Whether the monthly liveness check should ever become automated (a second scheduled workflow that pages someone) — deliberately deferred, see Decisions.

**Resolved by this revision:** whether dedicated read-only Neon credentials are needed — **no.** The original open question assumed the export would need a database connection at all; the revised mechanism needs none, so the question of how to scope one down no longer applies.
