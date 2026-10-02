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

- [x] 4.1 After the CMS image deploys: in production, with one clearly synthetic draft-only entry (deleted afterwards), an unauthenticated `?status=draft` request returns 403, and the published reads still return 200.
  - **Evidence (2026-10-02, production `https://kuasar-cms-alvwp.ondigitalocean.app`, unauthenticated, no credentials or tokens used):**
    - **Deploy:** #39 merged as `ceaf397`; CMS deploy run 37045947550 pushed image `sha256:bb7d1969f5a9…` (= `latest`). The workflow-triggered App Platform deployment did **not** serve it: `?status=draft` still returned 200 (0 rows). After a manual **Force Rebuild and Deploy**, the guard was live.
    - **Guard:** `GET /api/schedule-events?status=draft` and `/api/stellar-talks?status=draft` → **403** "Draft content requires an API token."; `?status=published` → 200.
    - **Canary:** one synthetic draft-only Schedule Event, `SYNTH-CANARY-4.1 DO NOT PUBLISH`, created by an editor in the admin and never published. `?status=draft`, with and without `filters[title][$contains]=SYNTH-CANARY` → 403, canary absent. Published queries (default, `status=published`, `locale=tr`, and title-filtered) → 200 with 0 rows, canary absent.
    - **Cleanup (2026-10-02T18:24Z):** the canary was deleted in the admin. Published queries (en, tr, title-filtered) → 200, 0 rows, canary absent; `?status=draft` still 403. The deletion of a draft can't be observed publicly by design; it was confirmed by the editor in the admin.
    - **Not tested:** live API-token draft reads (no token was used here); covered by CI's real-Strapi check (`tests/cms-drafts/check.mjs`).
