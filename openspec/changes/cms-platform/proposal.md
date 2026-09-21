## Why

Non-technical members must edit talks, events, announcements, alumni and sponsors without GitHub accounts, and both locales must be first-class in that workflow. The workspace currently has `apps/web` only; without `apps/cms` there is nowhere for that editing to happen, and later Strapi-backed sections have no schema to fetch.

## What Changes

- Add `apps/cms` as a **Strapi 5 Community Edition** workspace on Node 24 / npm, joining the existing `apps/*` glob without editing root workspace membership.
- Host it on **Render Starter** with **Neon Postgres via the pooled connection string** — never Render's free Postgres.
- Ship a **GitHub Actions workflow that builds the admin panel and deploys the artifact to Render**, so the known 512 MB OOM on Starter is avoided rather than solved by upsizing the instance.
- Create **exactly seven locale-enabled collection types**, fields as `design/content-model.md` lists them: Stellar Talk, Nebula Night, Galactic Summit, Schedule Event, Announcement, Alumni, Sponsor.
- Configure i18n locales as **exactly `en` and `tr`** (short ISO 639-1, `en` default), matching `design/i18n.md` and the App Router codes.
- Make Alumni `consentRecordedAt` and `consentSource` **required at the schema**, so an editor cannot publish a portrait without recording where consent came from.
- Define Galactic Summit `accentToken` and `heroTreatment` as **constrained enums in code** — the one sanctioned CMS-to-design coupling in `docs/adr/0002-cms.md` decision 7.
- Create the Sponsor collection **without any tier field**. The public showcase remains deferred until trademark permission exists; the type still ships because Galactic Summit relates to it.
- Configure an **Editor** role for day-to-day editors and keep **Super Admin** for the two people named in `docs/HANDOVER.md`.
- Configure the R2 upload provider (`@strapi/provider-upload-aws-s3`) so uploads never land on Render's ephemeral disk. ACL omitted; `region: 'auto'`. Bucket credentials come from the environment, not the repository.

**Explicitly out of scope** — each is its own later change, per `docs/task-assignments.html`:

- The publish/revalidate webhook (`publish-integration`).
- Editor preview / Draft Mode (`editor-preview`).
- The weekly content-snapshot export (`content-snapshot`).
- Frontend pages, routes, or components that *consume* these types.
- Flight-ops account creation (domain, Neon project, R2 bucket, Shared Drive) — this change consumes those credentials; it does not create the accounts.

## Capabilities

### New Capabilities

- `cms-platform`: Strapi 5 CE in `apps/cms`, hosted on Render Starter against Neon pooled Postgres, with the seven locale-enabled collection types, `en`/`tr` i18n, Editor and Super Admin roles, R2 uploads, and a CI-built admin artifact so Starter's 512 MB does not OOM.

### Modified Capabilities

- (none — `platform-foundation` still describes the workspace and the build-time fetch wrapper; this change does not alter those requirements.)

## Impact

- **Audience served:** neither sponsors nor prospective members directly in this change — it serves credibility only. It is the editing surface later audience-facing sections depend on. The Sponsor *type* exists so Galactic Summit can relate to it; the sponsor *showcase* does not ship here.
- **Content:** seven Strapi-resident entities. Git still holds Mission and Timeline Entry only. No entity is split across git and Strapi. No sample/production records are authored in this change.
- **New runtime dependencies:** Strapi 5 CE and `@strapi/provider-upload-aws-s3` in `apps/cms`. No animation library, no second scroll system, no new L1 route, so no accompanying ADR.
- **Affected paths:** `apps/cms/` (new workspace), `.github/workflows/` (admin-build-and-deploy), root lockfile. `apps/web/` is untouched except insofar as `npm ci` at the root now also installs `apps/cms`.
- **Systems:** Render web service (root directory `apps/cms`), Neon pooled `DATABASE_URL`, Cloudflare R2 credentials as environment variables. Secrets stay in dashboards, never in git.
- **CI:** no existing Tier A/B gate covers the CMS schema or the admin OOM path (`docs/task-assignments.html` marks cms-platform `no gate`). The new workflow is the deploy path, not a merge gate. Schema constraints (consent required, no Sponsor tier, locale codes) are verified in implementation, not by `docs/adr/0004-verification.md`.
