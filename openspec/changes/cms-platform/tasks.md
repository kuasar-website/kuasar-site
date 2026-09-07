## 1. Record enum values in the content model

- [x] 1.1 Update `design/content-model.md` so Galactic Summit `heroTreatment` lists `still | wash | gradient` (same layout, not new components) and `accentToken` remains `aurora | ion | violet | ember`.
- [x] 1.2 Update `design/content-model.md` so Schedule Event `type` lists `talk | screening | summit | workshop | other`.
- [x] 1.3 Point `design/tokens.md` Galactic Summit section at `heroTreatment` as well as `accentToken`, without adding new colour tokens.

## 2. Scaffold apps/cms

- [x] 2.1 Consult context7 (or current Strapi 5 docs) for `create-strapi-app` flags, i18n plugin config, and content-type schema shape before generating anything. *(context7 MCP is not installed on this machine; used the current official Strapi 5 docs — models, i18n, functions/bootstrap, RBAC — instead, as the task permits.)*
- [x] 2.2 Generate Strapi 5 CE TypeScript into `apps/cms` with no example content and Postgres as the database client. Pin the exact Strapi version. Skip Strapi Cloud login. *(Strapi `5.52.3` pinned exactly across `@strapi/*` in `apps/cms/package.json`; TypeScript; no `src/api` example content; `pg` + `DATABASE_CLIENT=postgres`; no `.strapi-cloud.json`.)*
- [x] 2.3 Confirm root `"workspaces": ["apps/*"]` already includes `apps/cms` without editing root `package.json` membership. *(Glob unchanged; `npm` resolves `cms` as a workspace member. The stray `overrides.cms` block from earlier WIP was removed — it split `@strapi/core` and `@strapi/strapi` across node_modules trees and broke module resolution; without it npm hoists them together.)*
- [x] 2.4 Run `npm install` at the repository root and commit the lockfile change with this work (no secrets in `.env`; provide `.env.example` only). *(`package-lock.json` updated; `apps/cms/.env` is git-ignored; `apps/cms/.env.example` is a documented placeholder template.)*
- [ ] 2.5 Confirm `npm run develop -w apps/cms` starts locally against a local or Neon-pooled `DATABASE_URL`. **STATIC DONE, live boot owed before archive.** This machine has no reachable Postgres and no Neon credentials. Verified statically instead: `tsc --noEmit` passes, `strapi ts:generate-types` boots the register phase and loads every config file + all 7 content types + 2 components with 0 errors, and `npm run build -w apps/cms` (TS compile + admin panel) exits 0. The live `strapi develop` boot against a real database must still be run before this change is archived.

## 3. Locales and database config

- [x] 3.1 Configure i18n with default locale `en` and additional locale `tr` only — never `en-US` / `tr-TR`. *(i18n is a core plugin, enabled by default. `en` is created on first boot and pinned via `STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE=en` in `.env.example`; `src/index.ts` `bootstrap` seeds `tr` (`{ code: 'tr' }`) only if absent. Every content type sets `pluginOptions.i18n.localized: true`; every attribute carries an explicit `localized` flag.)*
- [x] 3.2 Configure the Postgres connection from `DATABASE_URL` with SSL, documenting that production MUST be the Neon pooled (`-pooler`) URL and MUST NOT be Render Postgres. *(`config/database.ts`: `connectionString: env('DATABASE_URL')`, `DATABASE_SSL` defaults to `true` for Postgres, `DATABASE_CLIENT` defaults to `postgres`. Pooled-URL / not-Render-Postgres requirement documented in the file header and `.env.example`.)*

## 4. Seven collection types (both locales)

- [x] 4.1 Add locale-enabled Stellar Talk with fields from `design/content-model.md` (facts vs localized titles/insight).
- [x] 4.2 Add locale-enabled Nebula Night with fields from `design/content-model.md`.
- [x] 4.3 Add Galactic Summit: unique `year`, localized `purpose` / `programme` / `contactAddress`, `sponsors` relation to Sponsor, `accentToken` and `heroTreatment` enums as in 1.1, `speakers` as a repeatable component (not an eighth collection). *(`summit.speaker` component is non-localized — `speakers` is a fact per `content-model.md`; see `design.md` implementation note.)*
- [x] 4.4 Add locale-enabled Schedule Event with raw `startsAt` / `endsAt` datetimes (no past/live/upcoming field) and `type` enum as in 1.2.
- [x] 4.5 Add locale-enabled Announcement with localized `slug`, `title`, `excerpt`, `body`.
- [x] 4.6 Add locale-enabled Alumni with required `consentRecordedAt` and `consentSource`, optional `photo` and `linkedinUrl`, `subTeam` enum `propulsion | avionics | structures | software`. *(`required: true` on both consent fields — with draft & publish this blocks publish, not draft save, which is the specified behaviour.)*
- [x] 4.7 Add locale-enabled Sponsor with `name`, `logo`, optional `logoLight`, `url`, optional `since`, `isCurrent`, optional localized `blurb`, and **no** `tier` (or rank/metal) field. *(Also carries the inverse `summits` relation for 4.3.)*
- [x] 4.8 Confirm the Content Manager lists exactly those seven types, each switchable between `en` and `tr`, and that Mission / Timeline Entry are absent. **Schema-level confirmed** (`src/api/` holds exactly the seven, all `i18n.localized: true`; no mission/timeline). The visual Content-Manager check belongs with the 8.1 admin walkthrough.

## 5. Roles

- [x] 5.1 Seed an Editor role on bootstrap only if it does not already exist: CRUD + publish on the seven types, media library, i18n; no Content-Type Builder, no role administration. **Resolved against Strapi 5 CE:** CE cannot create or edit admin roles (Enterprise feature). CE ships a built-in **Editor** role (`strapi-editor`) that already grants exactly this permission set. `src/index.ts` `bootstrap` therefore *asserts* that role is present and logs guidance if not; it never creates a role or an admin user. See the updated `design.md` decision.
- [x] 5.2 Leave Super Admin as Strapi's built-in role; do not create Super Admin users in code. *(No admin users created anywhere; `admin/create-user` stays a manual runbook step.)*

## 6. R2 upload provider

- [x] 6.1 Add `@strapi/provider-upload-aws-s3` with `region: 'auto'`, custom endpoint, **ACL omitted**. *(`@strapi/provider-upload-aws-s3@5.52.3` in `apps/cms/package.json`; `config/plugins.ts` sets `s3Options.region: 'auto'`, `s3Options.endpoint`, `params.Bucket` — no `ACL` key. `config/middlewares.ts` opens the CSP for the R2 hosts so the Media Library previews.)*
- [x] 6.2 Fail production startup when `R2_*` env vars are missing. Keep local disk only as a documented `.env.example` develop path, never as committed production config. *(`config/plugins.ts` throws when `NODE_ENV==='production'` and any of `R2_ENDPOINT` / `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_ACCESS_SECRET` is unset. When all are unset outside production, Strapi's local provider is used — documented as develop-only in `.env.example`.)*
- [x] 6.3 Confirm no R2 keys, database URLs, or Strapi secrets are committed. *(`apps/cms/.env` is git-ignored and untracked; the only matches for secret-shaped strings in to-be-committed files are placeholder names in `.env.example` and variable identifiers in `plugins.ts`.)*

## 7. CI admin build and Render deploy

- [x] 7.1 Add a multi-stage Dockerfile that builds the admin on Node 24 with enough heap, then runs `strapi start` from the prebuilt admin (no compile on the runtime image). *(`apps/cms/Dockerfile`: `node:24-bookworm-slim` build stage, `NODE_OPTIONS=--max-old-space-size=2048`, `npm run build`; runtime stage copies `node_modules` + built `apps/cms` (with `dist/` + `build/`) and `CMD ["npm","run","start"]` — no build on the runtime image. Root `.dockerignore` keeps the context small; build context is the repo root for workspace installs. `strapi build` verified locally, exit 0.)*
- [x] 7.2 Add `.github/workflows/cms-deploy.yml` to build and push the image to GHCR on `main` (path-filtered to CMS/Docker/workflow) and `workflow_dispatch`, then deploy to a **Render Starter Docker** service — not a Nixpacks Node build on Starter. *(Path filter: `apps/cms/**`, `.dockerignore`, the workflow itself. `packages: write`, GHCR login with `GITHUB_TOKEN`, tags `latest` + `sha`. `deploy` job POSTs `RENDER_DEPLOY_HOOK_URL`.)*
- [x] 7.3 Document in `docs/HANDOVER.md` / runbook only what this change newly requires (GHCR package, Render Docker service, env table already in the runbook): Neon pooled `DATABASE_URL`, no Render Postgres, first Super Admin created by hand. *(Runbook step 4 rewritten for the Docker/GHCR path + `RENDER_DEPLOY_HOOK_URL` secret; step 5 notes the provider is already wired and fails closed in production; troubleshooting rows updated; `R2_PUBLIC_URL` added to the env table. HANDOVER "Deploying" section and accounts table updated.)*

## 8. Verification

- [ ] 8.1 Walk the admin in `en` and `tr`: empty list, first entry, and a second entry on at least one collection; create an Announcement with distinct slugs per locale. **Owed — needs a running instance with a database (see 8.6).**
- [ ] 8.2 Confirm Alumni publish is rejected if either consent field is empty, and succeeds when both are filled (photo optional). **Owed — needs a running instance.** Schema is in place: both fields `required: true`.
- [ ] 8.3 Confirm Sponsor has no tier in the form or API payload; Summit enums offer only the documented values. **Schema-level confirmed** (Sponsor attributes: `name, logo, logoLight, url, since, isCurrent, blurb, summits` — no tier; `accentToken` = `[aurora, ion, violet, ember]`, `heroTreatment` = `[still, wash, gradient]`, Schedule `type` = `[talk, screening, summit, workshop, other]`). The form/API-payload check is **owed** with the running instance.
- [ ] 8.4 Confirm Editor cannot edit the schema; Super Admin can. **Owed — needs a running instance.** This is the built-in CE behaviour of `strapi-editor` vs `strapi-super-admin` (see 5.1).
- [ ] 8.5 **No existing CI gate covers this change** (`docs/adr/0004-verification.md` Tier A/B do not assert CMS schema or Render OOM; `docs/task-assignments.html` marks cms-platform `no gate`). Record that explicitly on the PR. If Render credentials exist, confirm Starter starts without running `strapi build` on the instance; otherwise record the Docker/workflow as the verification until flight-ops accounts exist. **Recorded:** no Tier A/B gate asserts CMS schema, locale codes, consent, or the Render OOM path — the `cms-deploy.yml` header says so too. No Render credentials on this machine, so the verification of record is: `strapi build` green locally + the Dockerfile's runtime stage never invoking a build + the workflow. A live Render "starts without `strapi build` on the instance" check is owed once flight-ops accounts exist.
- [ ] 8.6 **Tasks 2.5 and 8.1–8.4 require a reachable database (local Postgres or Neon).** If the environment performing implementation has neither, record that explicitly on the PR — the same fallback 8.5 already uses for the Render/flight-ops path — and complete the live walkthrough before this change is archived, not as a substitute for it. **Recorded:** this machine has no local Postgres, no Docker, and no Neon credentials. Static verification done (2.5). The live boot + admin walkthrough (2.5 live, 8.1–8.4) must be completed against a real database before archive.

## Verification owed before archive

These need a running Strapi against a real database (local Postgres or Neon pooled):

1. `npm run develop -w apps/cms` boots clean; the `tr` locale is seeded; the built-in Editor role is present.
2. Admin walkthrough in `en` and `tr`: zero / one / many entries on a collection; Announcement with distinct per-locale slugs.
3. Alumni publish blocked with either consent field empty, allowed with both filled.
4. Sponsor form and API payload carry no tier; Summit/Schedule enum controls offer only the documented values.
5. Editor role cannot open the Content-Type Builder; Super Admin can.
6. If Render credentials exist: the Starter Docker service boots from the GHCR image without running `strapi build`.
