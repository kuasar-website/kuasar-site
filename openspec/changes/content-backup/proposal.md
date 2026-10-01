## Why

`docs/adr/0002-cms.md` decision 2 (rule 2) requires a scheduled export of Strapi's content back into this repository's git history, restoring the handover safety a database-backed CMS otherwise costs. That workflow does not exist yet — `cms-platform` shipped the CMS itself, not this. `docs/HANDOVER.md` and `docs/ops/cms-runbook.md` already carry forward-looking sections describing where the backups will live and how to trigger one; those sections are currently describing something that does not exist. This change makes them true.

Dev 4 has not started this capability. It is taken over here, in Dev 4's own lane per `docs/task-assignments.html` (`.github/workflows/content-snapshot.yml` and `docs/HANDOVER.md` are listed under Dev 4's "owns these paths outright"), with the restore drill explicitly planned for Dev 4 to perform independently — see `tasks.md`, section F.

## What Changes

- Add a first-party export script that calls the production Strapi instance's own REST Content API (`GET /api/<plural>?status=published&locale=...`) using a dedicated, scoped API token, to fetch exactly the six Strapi-resident, non-Alumni content types — Stellar Talk, Nebula Night, Galactic Summit, Schedule Event, Announcement, Sponsor — in both `en` and `tr`. The script never boots Strapi and never connects to the database directly (revised 2026-10-01 from an earlier `createStrapi().load()` design — see `design.md`, "Mechanism," for why: `.load()` is not read-only). Alumni is excluded on two independent layers: it is never in the script's queried list, and the token's own granted permissions never include it either — a caller cannot retrieve what its credential was never granted, even if the script were modified or compromised.
- Serialize each content type's published entries to a deterministic, human-readable JSON file (sorted keys, one file per content type, empty array when nothing is published) under `content/_snapshots/`. Relations to the other five included types are stored by `documentId`, never the database's internal numeric `id`. Media fields keep only the already-public `media.<DOMAIN>` URL the site itself serves — no binaries, no R2 credentials or endpoint details. The photographs themselves remain covered exclusively by the Google Shared Drive policy in `docs/adr/0002-cms.md` decision 6; this change does not add a second media backup path.
- Add `.github/workflows/content-snapshot.yml`, living on `main` (required — GitHub only fires `schedule` triggers from the default branch), running on a weekly `schedule` plus `workflow_dispatch`. The job has exactly the permissions it needs (`contents: write`, nothing else) and a `concurrency` group so two runs can never race and push over each other, matching this repo's existing `cms-deploy.yml` conventions for both. It commits the freshly generated `content/_snapshots/**` to the dedicated `content-snapshots` branch — creating that branch as a fresh orphan (no `main` history) on first run — and never touches `main`.
- Update `docs/ops/cms-runbook.md` step 8 and `docs/HANDOVER.md`'s existing "Where the backups are" section so their already-written descriptions match what is actually implemented, and name who is responsible for the existing monthly liveness check.
- Add the `content-backup` OpenSpec capability with requirements covering every hard requirement in this proposal as testable scenarios.

**Explicitly out of scope, and why:**

- **Media/binary backup.** Already decided against in `docs/adr/0002-cms.md` decision 6 — R2 is a CDN, not a system of record; the Google Shared Drive is. This change does not touch R2.
- **A dedicated Neon database role.** Not needed at all under the revised mechanism (see `design.md`, "Mechanism") — the export never connects to a database, so there is nothing for flight-ops to provision here. This removes a dependency the original plan carried.
- **Automated restore.** The restore procedure is documented as a deliberate, human-run action against a disposable non-production instance — never scripted against production. See `design.md`, "Restore procedure."
- **The actual first live snapshot run, dump inspection, and the second-person restore drill.** This turn is planning only; `tasks.md` sections D, E, and F record exactly what is owed and by whom, left unchecked.

## Capabilities

### New Capabilities

- `content-backup`: the weekly (plus on-demand) export of published, non-Alumni Strapi content into the `content-snapshots` branch, and the documentation making that promise checkable by anyone who inherits this project.

### Modified Capabilities

None. `apps/cms`'s existing schemas, `apps/web`, and every other capability are unmodified — this change only adds a new script, a new workflow file, and doc corrections.

## Impact

- Serves neither audience directly — this is handover/credibility infrastructure, matching `openspec/config.yaml`'s "serves credibility only" category.
- New GitHub Actions workflow with `contents: write` permission, scoped to one job, matching the repo's existing minimal-permission convention.
- New runtime dependency: none required beyond an HTTP client (e.g. the platform `fetch`). The script never boots Strapi and needs no `@strapi/*` package at runtime.
- Affected paths: a new export script (its exact location is an implementation-time decision, since it need not live under `apps/cms` at all — it never runs inside the Strapi process), `.github/workflows/content-snapshot.yml`, `docs/ops/cms-runbook.md`, `docs/HANDOVER.md`. No `apps/web` file is touched.
- No content entity, CMS field, or schema is added or changed. No entity is split across git and Strapi differently than already decided.
