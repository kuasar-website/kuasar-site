## 1. Guard

- [x] 1.1 `apps/cms/src/draft-guard.ts`: a pure `draftReadAllowed()` plus a document-service middleware factory per design D1 (REST prefix from config; `ForbiddenError` → 403).
- [x] 1.2 Register it in `apps/cms/src/index.ts` `register()` with `strapi.documents.use(...)`.
- [x] 1.3 `apps/cms/src/draft-guard.test.ts`: the decision table. Public, end-user and missing strategy on `/api` with draft are refused for every read action; `content-api-token` is allowed; published or absent status is allowed; non-read actions, admin paths and no-request contexts are allowed.

## 2. Verification

- [x] 2.1 `tests/cms-drafts/check.mjs` per design D2 against a throwaway Postgres: every scenario in the spec delta. Secrets are random, and no token value is printed.
- [x] 2.2 `.github/workflows/tier-b-cms-drafts.yml` (postgres service, path-filtered, `timeout-minutes: 10`, not required).
- [x] 2.3 Run locally: the unit tests, the integration check, `typecheck`, `lint` and Tier A's `test:media` (it covers `apps/cms` upload tests); all green.
  - **Evidence (2026-10-02, local throwaway Postgres):**
    - unit tests 6/6;
    - `apps/cms` typechecks; Tier A typecheck, lint, stylelint, reduced-motion, locale parity, budgets, content and media tests all pass;
    - `tests/cms-drafts/check.mjs` passes: public list 200 (published only), `?status=published` 200, public `?status=draft` **403**, public single-entry draft **403**, public Alumni list and single draft **403**, bogus token **401**, API token `?status=draft` **200 with drafts**, API token published 200, and server-side draft read OK;
    - **with the guard removed, the same check fails** (public `?status=draft` → 200), reproducing the vulnerability.

## 3. Documentation

- [x] 3.1 `docs/ops/cms-runbook.md`: under "Upgrading Strapi", rerun `tests/cms-drafts/check.mjs`. A Troubleshooting row: "403 'Draft content requires an API token'" means a public caller asked for drafts, which is expected.

## 4. Live acceptance (manual)

- [ ] 4.1 After the CMS image deploys: in production, with one clearly synthetic draft-only entry (deleted afterwards), an unauthenticated `?status=draft` request returns 403, and the published reads still return 200.
