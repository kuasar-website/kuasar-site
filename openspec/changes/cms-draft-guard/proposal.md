## Why

A synthetic check on 2026-10-02 (publish-integration task 0.4) found a security defect: in
Strapi 5.52.3, the Content API's `status` query parameter is honoured for **unauthenticated**
requests. With only the Public role's `find` permission, `GET /api/<plural>?status=draft`
returns draft entries, and `GET /api/<plural>/<id>?status=draft` returns a single draft.
Production grants Public `find`/`findOne` on all seven collections, **Alumni included**.

So any draft an editor saves, such as an alumnus entered before consent was recorded or an
unannounced Summit detail, is publicly readable. That undermines ADR 0002's KVKK
reasoning, and makes content-backup's "drafts never leave the CMS" guarantee meaningless at
the source. Production held no drafts when this was found, so nothing has leaked yet. The
fix must land **before editors create drafts**, and before publish-integration
deliberately introduces draft reads for preview.

**Audience:** neither directly. It protects alumni (KVKK) and unpublished content.

## What Changes

- A Strapi **document-service middleware**, registered in `apps/cms/src/index.ts`
  `register()`. It refuses (403) any read of draft content (`findMany`, `findOne`,
  `findFirst` or `count` with `status: 'draft'`) when the current request is a Content API
  request (`/api/…`) **not** authenticated with an API token. That covers:
  - the Public role;
  - end-user (users-permissions) authentication.
- **Unaffected:**
  - the admin panel (its own routes and authentication);
  - API-token requests, such as the publish-integration preview token or the
    content-backup token;
  - server-side scripts and bootstrap code (no request).
- Unit tests for the decision logic, plus a real-Strapi integration check (a throwaway
  Postgres) that proves the exposure is closed and token access still works.
- A path-filtered Tier B workflow running both, with a Postgres service container.
- Runbook note: drafts are API-token-only, and the check to repeat after every Strapi
  upgrade.

No schema change. No change to Public permissions, so published reads behave exactly as
before. No new dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cms-platform`: adds the requirement that draft content is readable through the Content
  API only with an API token.

## Impact

- **Code:**
  - new `apps/cms/src/draft-guard.ts` and its test;
  - one `register()` line in `apps/cms/src/index.ts`;
  - new `tests/cms-drafts/` (integration check) and `.github/workflows/tier-b-cms-drafts.yml`;
  - a short addition to `docs/ops/cms-runbook.md` ("Upgrading Strapi" and
    Troubleshooting).
- **Not touched:** `apps/web`, Dev 3's code, publish-integration (it resumes after this),
  and content-backup (its token reads `status=published` only).
- **Deployment:** merging to `main` rebuilds the CMS image (`cms-deploy.yml`). The
  production re-check after deploy stays a manual task.
