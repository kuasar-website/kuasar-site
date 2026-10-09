## 0. Inputs (maintainer, no secrets recorded)

- [x] 0.1 DigitalOcean identifiers, confirmed by the maintainer on 2026-10-02 (names only):
  - **app name:** `kuasar-cms`, the value of the Actions variable `DIGITALOCEAN_APP_NAME`;
  - **CMS service (component) name:** `kuasar-website-kuasar-site-cms`, which gives the env key `IMAGE_DIGEST_KUASAR_WEBSITE_KUASAR_SITE_CMS` (the action upper-cases the name and turns `-` into `_`, per `deploy/images.go` `componentNameToEnvVar`).
- [x] 0.1a Record the **list of environment-variable keys** and their types (`SECRET` or plain) from App → Settings, kept locally for tasks 3.4 and 4.1. Never values.
  - **Baseline (2026-10-02):** read by the maintainer in the DigitalOcean UI, with no value revealed. **18 keys:**
    - **Secret (encrypted), 11:** `DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_ACCESS_SECRET`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`, `PREVIEW_SECRET`, `REVALIDATE_SECRET`.
    - **Plain, 7:** `R2_BUCKET`, `R2_ENDPOINT`, `DATABASE_CLIENT`, `DATABASE_SSL`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE`, `CLIENT_URL`.
  - The UI truncates `STRAPI_PLUGIN_I18N_INIT_LOCALE_C…`. The full name is the only key with that prefix that Strapi's i18n plugin reads or the repo references (`apps/cms/src/index.ts`).
- [x] 0.2 Create the Actions **variable** (not a secret) `DIGITALOCEAN_APP_NAME` = `kuasar-cms`. Confirm `DIGITALOCEAN_ACCESS_TOKEN` has the custom `app` read and update scopes and hasn't expired. No URL variable is needed: the workflow reads the live URL from DigitalOcean's API together with the active digest (2.3).
  - **Done (2026-10-02):** the maintainer created `DIGITALOCEAN_APP_NAME` = `kuasar-cms`.
  - **Token not verified before merge.** Its expiry is **not recorded anywhere**: `docs/HANDOVER.md` has no expiry for it (it now says so), and none is invented here. Nothing pre-merge exercises the token, because the feature-branch run (3.3) skips `deploy`. Its validity, scope and expiry are therefore verified by the first real run (4.1), which fails closed on 401/403 before the spec is updated. Whoever next generates or checks the token records its expiry in `docs/HANDOVER.md`.

## 1. Build identity and `/_version`

- [x] 1.1 `apps/cms/src/build-identity.ts`: `readBuildCommit(path)` and `versionHandler(commit)` per design D4. The body has only `commit`; `Cache-Control: no-store`; 200 when the commit is known, 503 with `{"commit": null}` otherwise.
- [x] 1.2 `apps/cms/src/index.ts` `register()`: read `BUILD_COMMIT` once from `strapi.dirs.app.root`, and register `strapi.server.router.get('/_version', …)`. No database, content or environment access.
- [x] 1.3 `apps/cms/Dockerfile`, at the end of the runtime stage: `ARG APP_COMMIT_SHA`, then a `RUN` that fails unless it's 40 lower-case hex characters and writes `/app/BUILD_COMMIT`. The build stage is unchanged.
- [x] 1.4 Add `apps/cms/BUILD_COMMIT` to `.gitignore`.

## 2. Workflow

- [x] 2.1 `build-push`:
  - give the build step `id: push`;
  - pass `build-args: APP_COMMIT_SHA=${{ github.sha }}`;
  - set `push: ${{ github.ref == 'refs/heads/main' }}` and `load: ${{ github.ref != 'refs/heads/main' }}`;
  - add job `outputs: digest`;
  - off `main`, a step asserts `docker run --rm --entrypoint cat <image> /app/BUILD_COMMIT` equals `github.sha`.
- [x] 2.2 `deploy`:
  - `needs: build-push`, `if: github.ref == 'refs/heads/main'`, `timeout-minutes: 20`, `permissions: {}`;
  - `digitalocean/app_action/deploy@cc55bc9b848d25f9c1c9f831cf843fbab3fbfb15` (v2.0.11), with `token` and `app_name: ${{ vars.DIGITALOCEAN_APP_NAME }}`;
  - env `IMAGE_DIGEST_KUASAR_WEBSITE_KUASAR_SITE_CMS: ${{ needs.build-push.outputs.digest }}`;
  - fail early with a clear message if the token or app name is empty.
- [x] 2.3 `deploy` verification steps per design D5:
  - **Safety note (2026-10-02):** the digest and `live_url` are read back with a minimal DigitalOcean API call, extracting only those two fields. The action's `app` output, which contains the spec and encrypted secrets, is never passed through step `env` (GitHub prints step env in the public run log), echoed, or written to the summary.
  1. the active deployment's `kuasar-website-kuasar-site-cms` service `image.digest` equals the built digest;
  2. `/_version` returns `commit == github.sha`, polled every 10 s for at most 5 min;
  3. `/_health` returns 204;
  4. unauthenticated `?status=draft` returns 403, reading the status code only.

  `live_url` comes from the same minimal API call as the digest, not from the action output. The expected and observed values go into `$GITHUB_STEP_SUMMARY`. No secrets, spec or environment values are printed.
- [x] 2.4 Update the workflow's header comment: digest pinning, Active, live commit, main only.

## 3. Pre-merge checks (critical only)

- [x] 3.1 `actionlint` on `cms-deploy.yml` with no findings. It also checks that `steps.push.outputs.digest` and `needs.build-push.outputs.digest` resolve.
  - **Evidence (2026-10-02):** actionlint 1.7.12 with shellcheck 0.11.0 reports no findings on `cms-deploy.yml` and `tier-b-cms-drafts.yml`.
  - **Script check:** the live-verification step's own script was run against a local fake CMS, with these results:
    - commit matches → green; commit matches after initial 404s → green (retry);
    - 404, malformed JSON, wrong commit, `/_health` 503 or draft 200 → red, each with the observed value in the summary;
    - unreachable → keeps retrying, then red.
  - **Digest extraction:** checked against synthetic API responses. The matching app/service/digest is green; a wrong service, stale digest or renamed app is red.
- [x] 3.2 `/_version` coverage:
  - **Evidence (2026-10-02, local):**
    - `build-identity.test.ts` 4/4 and `draft-guard.test.ts` 6/6;
    - `tests/cms-drafts/check.mjs` against a throwaway Postgres: draft guard 9/9 as before, plus `/_version` → 200 `{commit}` equal to the synthetic baked commit with `no-store`, and `/_health` 204. The temporary `BUILD_COMMIT` is removed afterwards.
  - `apps/cms/src/build-identity.test.ts` covers a valid SHA, a missing file, an empty file, malformed or short or upper-case input (→ 503 and `null`), the exact body keys, and `no-store`;
  - `tests/cms-drafts/check.mjs` writes a synthetic 40-hex `apps/cms/BUILD_COMMIT`, boots the real Strapi, asserts `/_version` returns exactly that, and removes the file;
  - add the unit test to `.github/workflows/tier-b-cms-drafts.yml`.
- [x] 3.3 Push the branch, then `gh workflow run cms-deploy.yml --ref change/cms-deploy-digest`:
  - **Evidence (2026-10-02):** run [37055010240](https://github.com/kuasar-website/kuasar-site/actions/runs/37055010240), a manual run on `change/cms-deploy-digest` at `3645d3e`:
    - `build-push` succeeded: the image was built with `load: true`, and "Log in to GHCR" was skipped;
    - the baked-identity check logged `expected=3645d3e595b37ea79664ea073c4d2593cf3b618d baked=3645d3e595b37ea79664ea073c4d2593cf3b618d`;
    - `deploy` was **skipped**;
    - GHCR `sha-3645d3e…` → 404, so nothing was pushed.
  - Tier B CMS drafts on `3645d3e` is green.
  - `build-push` builds, and the baked-commit check equals the branch head SHA;
  - **nothing is pushed** to GHCR (no new `sha-` tag);
  - `deploy` is **skipped**, and there's no new deployment in DigitalOcean Activity.
- [x] 3.4 Configuration preservation, read-only:
  - **Source check done (2026-10-02)** at the pinned commit `cc55bc9`:
    - `replaceImagesInSpec` assigns only `image.Tag` and `image.Digest`, for the component whose env key is set;
    - the PR-preview spec rewrite runs only with `deploy_pr_preview`, which isn't set;
    - it logs only the app name and the live URL;
    - a wrong `app_name` fails ("app does not exist") instead of creating an app.
  - **Result (2026-10-02): PASS.**
    - **The pinned action** reads the live spec (`Apps.Get`), mutates only the target component's `image.digest`/`image.tag`, and submits that same spec (`Apps.Update`). Every `envs` entry is therefore resubmitted as returned.
    - **DigitalOcean's app-spec reference:** SECRET values come back encrypted, and "on following submissions, the encrypted value should be used", so they're preserved.
    - **No configuration exposed:** the workflow never reads, prints, stores or commits the spec.
    - **Baseline:** the 0.1a key list (18 keys, 11 secret) is recorded for the post-merge comparison (4.1).
  - confirm, from the pinned action's source, that only `image.digest` and `image.tag` change in the spec it writes back;
  - confirm task 0.1a's key list is complete.
- [x] 3.5 OpenSpec strict validation, Tier A and the required checks (Tier A, time-state) are green. Tier B CMS drafts is green, including `/_version`.
  - **CI on PR #42 (2026-10-02), head `a58a7af`** (the branch with `main` at `ed3c70c` merged in), all green:
    - Tier A: run [37056814895](https://github.com/kuasar-website/kuasar-site/actions/runs/37056814895) (required);
    - time-state: run [37056822054](https://github.com/kuasar-website/kuasar-site/actions/runs/37056822054) (required);
    - Tier B CMS drafts (`draft-guard` and `build-identity` unit tests plus the real-Strapi check, including `/_version` and `/_health`): run [37056822080](https://github.com/kuasar-website/kuasar-site/actions/runs/37056822080);
    - Vercel preview deployment: green.
  - **Local (2026-10-02):**
    - strict validation passes;
    - Tier A passes: typecheck (including CMS `tsc`), lint, stylelint, reduced-motion, locale parity, budgets, content, media, cms, web build and `check:budgets`;
    - CMS production `strapi build` passes;
    - time-state 12/12.

## 4. Post-merge production smoke check (critical; right after merge)

- [x] 4.1 The merge's push to `main` runs the workflow. Confirm:
  - the `deploy` job waited for Active, and its summary shows the expected digest equal to the live digest, `/_version` commit equal to the merge commit, `/_health` 204 and draft 403;
  - DigitalOcean Activity shows the new deployment **Active** with that digest;
  - App → Settings shows the same environment-variable keys and types as task 0.1a.

  If the run is red, follow the recovery steps (design D10) and report. **A red run here is the intended signal, not a reason to bypass.**
  - **Evidence (2026-10-02), PASS.** PR #42 merged as `a5c9acf89646f279febef3ee98b190af9edeabad` (21:28 UTC). Its push ran CMS deploy [run 37067025084](https://github.com/kuasar-website/kuasar-site/actions/runs/37067025084), green first time, with no rerun and no manual action:
    - the action logged `PENDING_BUILD` → `DEPLOYING` → **`ACTIVE`** (21:32:59 UTC);
    - expected digest = active service digest = `sha256:ce7165ffae48da189738491ffc3000561cc3c0f3b43cd1cf210cb723cb8ab85f`;
    - the live-CMS step passed: `/_version` commit = merge commit, `/_health` 204, unauthenticated `?status=draft` 403. The same three public reads, repeated by hand afterwards, returned `200 {"commit":"a5c9acf89646f279febef3ee98b190af9edeabad"}` with `Cache-Control: no-store`, `204` and `403`;
    - the public run log contains no app spec, env entries or encrypted values.
  - **Maintainer checks in DigitalOcean (2026-10-03):**
    - Activity shows the deployment started 00:31:48 local time (21:31:48 UTC) as **Success / Live Deployment**, the one the workflow read with the digest above;
    - App → Settings shows exactly **18** service-level environment variables, **11 secret (encrypted), 7 plain**, with names and categories identical to the 0.1a baseline. No value was revealed.
  - This is also the first observation of the `DIGITALOCEAN_ACCESS_TOKEN` working with the new action (0.2): scope and validity confirmed. Its expiry is still not recorded.
- [x] 4.2 After 4.1 passes, delete the unused `DIGITALOCEAN_APP_ID` repository secret.
  - **Done (2026-10-03),** after 4.1 and the maintainer's confirmation. No workflow or code on `main` at `a5c9acf` referenced it. It was deleted with `gh secret delete`; the repository secrets are now `CMS_BASE_URL`, `CONTENT_BACKUP_API_TOKEN` and `DIGITALOCEAN_ACCESS_TOKEN`. It was a repository secret only, with no environment-level copy. No DigitalOcean setting was changed and no deploy was triggered.

## 5. Documentation

- [x] 5.1 `docs/ops/cms-runbook.md` step 4. A **green CMS deploy means**:
  - the exact built digest was deployed;
  - DigitalOcean reached Active;
  - the live CMS reports the expected commit at `/_version`;
  - `/_health` is healthy;
  - the public draft guard is active.

  Also state that `DIGITALOCEAN_APP_NAME` replaces `DIGITALOCEAN_APP_ID`, and that only `main` deploys.
- [x] 5.2 `docs/ops/cms-runbook.md` troubleshooting:
  - "CMS deploy run failed: which step (Active, digest, `/_version`, health, draft guard)": open Activity → deploy logs, then recover per design D10;
  - "Force Rebuild and Deploy is the emergency fallback and redeploys the pinned digest; afterwards check `/_version`, `/_health` and `?status=draft` by hand".
- [x] 5.3 `docs/HANDOVER.md` Deploying: one sentence each that a green CMS deploy means it's live with the expected commit, and that a manual run deploys from `main` only.

## 6. Verification gate

- [x] 6.1 **No existing merge gate covers the deploy path.** Tier A doesn't lint workflows, and per ADR 0004 the CMS deploy isn't a gate. `/_version` is covered by Tier B CMS drafts (not required). The deploy itself is covered by the pre-merge checks (3.1–3.4) and the post-merge smoke check (4.1). Don't add a new gate.

## Deferred (not launch-blocking)

- Observing a later real `apps/cms/**` change deploy end to end. It happens on the next CMS merge.
- Recording the 2026-10-02 incident's DigitalOcean Activity entry, to settle whether it was a stale image or an unfinished deployment.
- Automated rollback, a staging app, an app spec in the repository, extended test matrices, and wider observability or release tooling.
