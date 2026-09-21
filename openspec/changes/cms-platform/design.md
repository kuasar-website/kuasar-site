## Context

`apps/web` exists; `apps/cms` does not. Hosting, the entity-level git/Strapi split, R2 gotchas, Alumni consent, and Summit theming are already decided in `docs/adr/0002-cms.md`, `docs/ops/cms-runbook.md`, `design/content-model.md`, `design/i18n.md`, and `design/tokens.md`. See `proposal.md` for why this change exists. This document only records how `apps/cms` is stood up and how the 512 MB OOM is avoided.

No user-facing route, animation, or `apps/web` bundle change is in scope. **Motion: none. Per-route first-load JS impact: zero. No animation-library import is added on any route.**

All seven collections are new Strapi types. Locale-specific vs fact fields follow `design/content-model.md` and are not restated field-by-field here except where the documents leave a gap.

## Goals / Non-Goals

**Goals:**
- A Strapi 5 CE workspace at `apps/cms` that joins the existing `apps/*` npm workspace glob.
- Production on Render Starter against Neon pooled Postgres, with admin compiled in CI.
- Schema, locales, roles, and R2 provider matching the specs.
- Record the enum values `design/content-model.md` left as "defined in code."

**Non-Goals:** proposal.md's out-of-scope list (webhook, preview, snapshots, frontend consumers, account creation). Also: no sample content, no Super Admin users created in code, no committed secrets, no `openspec/project.md`.

## Decisions

**Scaffold with `create-strapi-app` into `apps/cms`, TypeScript, no example content, skip cloud login.** Pin Strapi 5 (current CE line per ADR 0002; check context7 / npm at apply time and pin the exact version in `apps/cms/package.json`). Database client: Postgres. Alternative considered: hand-roll `package.json`. Rejected — the official generator is what 2029 maintainers will search for.

**Do not edit root `package.json` workspaces.** The glob `"apps/*"` already picks up `apps/cms`. The lockfile updates when `npm install` runs at the repo root.

**Strapi package hoisting: no `overrides`, keep the whole `@strapi/*` closure on one exact version.** A WIP `overrides.cms["@strapi/core"]` block was removed during apply. Even though it named the same version, an override adds a synthetic constraint on `@strapi/core` scoped to the `cms` subtree, and npm then treats that resolution as a distinct node: it hoisted a plain `@strapi/core` to the repo root (shared with the other root-level `@strapi/*` packages) but left `@strapi/strapi` nested in `apps/cms/node_modules`. Dependency above dependent — Node resolving upward from the root `@strapi/core` never descends into `apps/cms/node_modules`, so `require.resolve('@strapi/strapi/package.json')` throws and the `strapi` CLI dies on boot.

With the override gone, npm hoists the entire `@strapi/*` closure flat to the repo root, one copy each. This is stable because: `apps/cms` is the only `@strapi/*` consumer (`apps/web` never imports Strapi), so no cross-workspace version conflict can force a nested duplicate; Strapi pins its inter-package deps as exact `5.52.x` (no ranges to resolve differently); and the committed `package-lock.json` freezes the tree shape for `npm ci`.

Three things reintroduce the split, all avoidable:

1. **Partial upgrade** — bumping `@strapi/strapi` alone and letting a `@strapi/plugin-*` lag puts two versions in the closure. Always upgrade via `npm run upgrade` (`@strapi/upgrade`, which moves them in lockstep); never hand-edit one line.
2. **A loose range on a sub-package** — adding `@strapi/database`, `@strapi/utils` etc. as a direct dependency of `apps/cms` at `^5.52.3` can resolve to a different patch than `@strapi/core` pins. Do not add Strapi sub-packages as direct deps.
3. **A second workspace depending on `@strapi/*`** at a different version, or any re-introduced `overrides` / `resolutions` / peer pin touching `@strapi/*`.

The `strapi build` step in `.github/workflows/cms-deploy.yml` is the canary — the split fails it loudly.

**i18n plugin config: `en` default, `tr` additional, no other locales.** Must match `design/i18n.md` exactly; `en-US`/`tr-TR` fail silently at fetch time.

**Collection type JSON in source control** (`apps/cms/src/api/<name>/content-types/.../schema.json`), not created only through the admin UI. Schema drift across environments is how bilingual sites lose a locale. Display names stay English (brand names and "Announcement", "Alumni", "Sponsor", "Schedule Event").

**Galactic Summit `speakers` is a repeatable component, not an eighth collection.** `design/content-model.md` writes `relation[]` without a target type. An eighth collection would violate "exactly seven." Component fields: `speakerName` (string), `portrait` (media), `role` (string). Alternative: relate to Alumni. Rejected — Summit speakers are not necessarily alumni.

The `speakers` attribute is **non-localized** (`content-model.md` marks it a fact, `F`). Strapi localizes a component attribute all-or-nothing, so a per-locale `role` would force `speakerName` and `portrait` to be duplicated per locale too — which breaks "facts live once." `role` therefore follows the fact side. If a translated speaker role is genuinely needed later, the move is to make the whole `speakers` component localized, accepting the duplication, in its own change.

**`heroTreatment` values: `still` | `wash` | `gradient`.** `design/content-model.md` does not list them. These are treatments of the *same* Summit layout (static image; accent wash over `backgroundImage`; accent gradient with optional image), not new layouts — bounded by ADR 0002 decision 7. Adding a value later is a code change. Implementation MUST write this set into `design/content-model.md` (and a one-line pointer in `design/tokens.md` if needed) so the documents stop saying "defined in code" without listing the code.

**`accentToken` values: `aurora` | `ion` | `violet` | `ember`**, mapping to `--color-summit-*` in `design/tokens.md`.

**Schedule Event `type` enum: `talk` | `screening` | `summit` | `workshop` | `other`.** The content model leaves the legend values unspecified. This set covers the three branded series plus a generic workshop and a catch-all. Implementation MUST write the set into `design/content-model.md`. Frontend colour mapping is a later change.

**Alumni `subTeam` enum: `propulsion` | `avionics` | `structures` | `software`** (kebab-case in schema; admin labels can be the English names from the content model).

**Sponsor: no `tier` attribute, no private enumeration that looks like one.** `isCurrent` stays; grouping/sort is a frontend concern.

**Editor role: assert the built-in, do not seed a custom one.** Strapi 5 **Community Edition cannot create or edit admin roles** — custom RBAC is an Enterprise feature. CE ships exactly three fixed roles (Super Admin, Editor, Author). The built-in **Editor** role (`strapi-editor`) already grants Content Manager + REST create/read/update/delete/publish on every collection type, the Media Library and i18n, while denying the Content-Type Builder and role/user administration — which is precisely the permission set specified here. So `bootstrap` asserts that role is present and logs guidance if it is not; it never creates a role or an admin user. Super Admin stays Strapi's built-in. Operators are created by hand through the first-run register URL, as the runbook says. (This resolves the "seed in bootstrap if missing" wording against what CE actually permits; the spec requirement — an Editor role distinct from Super Admin that cannot change the schema — is met by the built-in role.)

**R2 via `@strapi/provider-upload-aws-s3` in `config/plugins.ts`.** `region: 'auto'`, custom `endpoint`, **omit `ACL`**. Credentials from env (`R2_*`). Local `develop` may use the same provider when env is set, or Strapi's local provider when it is not — never commit a fallback that writes uploads into git.

**OOM path: GitHub Actions builds a production Docker image; Render runs the image and never compiles admin.** Starter's 512 MB is the runtime budget; the admin compile is the spike. Alternatives considered:
- Upsize Render — rejected by ADR 0002 decision 4 (paying year-round for a two-minute spike).
- Commit `build/` — rejected on a public repository (generated churn, review noise).
- Nixpacks `buildCommand: npm run build` on Starter — this is the failure mode.
- Fetch a GitHub artifact during Render build — extra moving parts, still a build step on Starter.

Dockerfile: Node 24, `npm ci` at repo context or workspace-aware copy of `apps/cms`, `NODE_OPTIONS` heap large enough for `strapi build`, then a runtime stage that copies `node_modules` (production) and the admin `build/` / `dist/` output and `CMD`s `strapi start`. Render service: Docker, root as appropriate, env from the runbook table (`DATABASE_URL` = Neon **pooled** string, Strapi secrets, R2, `CLIENT_URL`). Auto-deploy from `main` via the registry GHCR (`ghcr.io`), club GitHub org, never a personal Docker Hub.

**Workflow file** `.github/workflows/cms-deploy.yml`: on push to `main` when `apps/cms/**` or the Dockerfile/workflow change; `workflow_dispatch`. Build and push the image tagged with the git sha and `latest`. Render watches the image or is notified via deploy hook. No secrets in logs.

**`DATABASE_URL` is the Neon pooler hostname** (`-pooler.`). Strapi 5 database config uses the connection string with SSL required. Direct (unpooled) Neon URL is local-only if someone needs it; production MUST be pooled.

**No webhook, no `admin.preview`, no snapshot workflow in this change.** Leave commented stubs out; later changes own those files.

## Risks / Trade-offs

- **[Risk] First Render deploy still OOMs if the service is created with a Node build command before the Docker service exists.** → Create the Render service as Docker from the start; do not "try Starter Node and fall back."
- **[Risk] GHCR + Render credentials add handover surface.** → Club GitHub org owns the packages; Render deploy key lives in GitHub Actions secrets and `docs/HANDOVER.md`. No personal accounts.
- **[Risk] `heroTreatment` / Schedule `type` values were unspecified; wrong set ships.** → Values are written into `design/content-model.md` in this change so they are not tribal knowledge. Changing them later is a schema + document change, which is the point of an enum.
- **[Risk] Bootstrap that mutates roles on every boot fights live permission edits.** → Seed Editor only when the role is absent; never reset Super Admin.
- **[Risk] Local develop without R2 credentials silently uses disk, and someone copies that config to production.** → Production config must fail startup if `R2_*` are missing. Local may document a disk provider in `.env.example` only.
- **[Trade-off] Alumni have no backup.** Accepted in ADR 0002; this change does not add an Alumni export.
- **[Trade-off] No CI merge gate asserts the schema.** ADR 0004 and the assignment mark this `no gate`. Verification is bootstrap inspection + admin walkthrough, recorded in tasks.md.

## Migration Plan

Greenfield: no existing CMS data. Order: Neon pooled DB (flight-ops) → GHCR workflow merging to `main` → Render Docker service with env → first Super Admin via the live URL → confirm Editor role exists → upload a test file only after R2 env is set.

Rollback: point Render at the previous image tag. Schema-down is not needed on the first deploy; later schema edits are their own change.

## Open Questions

None that affect specs or tasks. Domain and R2 bucket remain flight-ops; the CMS starts without a custom media domain if `R2_ENDPOINT` is set, and `media.<DOMAIN>` binding stays a runbook step.
