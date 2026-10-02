## Why

On 2026-10-02, after #39 (cms-draft-guard) merged, `.github/workflows/cms-deploy.yml`
built and pushed the correct CMS image, and GitHub Actions reported the run green. Yet
production kept serving the previous revision: unauthenticated `?status=draft` still
returned 200. The guard went live only after a manual **Force Rebuild and Deploy** in
DigitalOcean.

The workflow's `deploy` job sends one `POST /v2/apps/$APP_ID/deployments` with
`{"force_build": false}` and exits on HTTP 2xx. It never learns which deployment it
created, never waits for it, and never checks what went live. The app's configuration
points at the mutable `latest` tag. So a green CMS deploy currently doesn't mean the merged
CMS code is live.

DigitalOcean's container-image guide recommends deploying by **image digest** ("To trigger
the deployment of a new image consistently, use SHA digests"). App Platform doesn't
redeploy on its own for images from GitHub's registry.

Even a correct digest and an Active deployment only prove what DigitalOcean was *told* to
run. Only the live process itself can prove what is actually *serving* requests.

This has to be reliable before launch: every CMS fix, including security fixes like #39,
reaches production only through this path.

**Audience:** neither directly. It's operational reliability that protects every
CMS-backed page and the editors.

## What Changes

- **Build identity:** the CMS image carries the exact `github.sha` it was built from.
  - It's passed as the build argument `APP_COMMIT_SHA` and written to the file
    `/app/BUILD_COMMIT` in the runtime stage.
  - It's a file, not an environment variable, so App Platform configuration can't override
    it.
- **A live version endpoint:** `GET /_version` on the CMS returns only
  `{"commit": "<40-hex sha>"}`.
  - The value is read once from `BUILD_COMMIT` at startup.
  - No database, content, authentication state or environment is involved.
  - It's registered on Strapi's server router beside the built-in `/_health`.
- **`build-push`:** the existing Docker build is unchanged apart from the build argument.
  - It exposes the pushed image's **digest** as a job output.
  - It pushes only from `main`.
  - A run from any other branch builds and loads the image locally, checks the baked
    commit, and pushes nothing.
- **`deploy`** (`main` only) replaces the `curl` call with DigitalOcean's official action,
  `digitalocean/app_action/deploy@v2`, pinned to a commit SHA. It:
  - reads the **existing** app configuration by app name;
  - sets the CMS service's image to that **exact digest**;
  - waits for the deployment to finish;
  - fails unless it ends **Active**.
- **The deploy then verifies, and fails on any mismatch:**
  1. the active deployment's CMS image digest equals the built digest;
  2. the live `GET /_version` reports `commit == github.sha`, retried for a bounded time;
  3. `GET /_health` returns 204;
  4. an unauthenticated `?status=draft` request returns 403.

  The expected and observed values go into the run summary.
- **A green CMS deploy therefore means:**
  - the exact built digest was deployed;
  - DigitalOcean reached Active;
  - the live CMS reports the expected commit;
  - `/_health` is healthy;
  - the public draft guard is still active.
- **Unchanged:** the frontend and Vercel, the triggers (push to `main` on `apps/cms/**`,
  and manual dispatch) and the concurrency group.
- **Docs:** `docs/ops/cms-runbook.md` step 4 and troubleshooting, and the Deploying
  section of `docs/HANDOVER.md`. They cover what a green deploy means, how to recover from
  a red one, and that **Force Rebuild and Deploy is an emergency fallback, not the normal
  path**.

**Dependencies:** one new CI action, `digitalocean/app_action/deploy` v2.0.11, pinned to
commit `cc55bc9b848d25f9c1c9f831cf843fbab3fbfb15`. No runtime dependency. The CMS gains
one tiny route; the web app is untouched.

**Content:** none. No entity is added or moved.

**Locales:** not applicable. Nothing user-facing changes in either locale.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cms-platform`: ADDED two requirements:
  - a CMS deploy runs the exact image built from `main`, and reports success only once
    that image is Active **and** the live process reports the expected commit;
  - the CMS exposes a minimal, non-sensitive `/_version` build identity.

## Impact

- `.github/workflows/cms-deploy.yml`, `apps/cms/Dockerfile`, `apps/cms/src/index.ts`, a
  new `apps/cms/src/build-identity.ts` and its test, `tests/cms-drafts/check.mjs`,
  `.github/workflows/tier-b-cms-drafts.yml` and `.gitignore`.
- `docs/ops/cms-runbook.md` (step 4 and troubleshooting) and `docs/HANDOVER.md`
  (Deploying).
- **GitHub configuration:** a new Actions **variable** `DIGITALOCEAN_APP_NAME` = `kuasar-cms`.
  The workflow's digest key is `IMAGE_DIGEST_KUASAR_WEBSITE_KUASAR_SITE_CMS`, for the App
  Platform service `kuasar-website-kuasar-site-cms`.
  - The existing `DIGITALOCEAN_ACCESS_TOKEN` secret is reused (the `app` read/update
    scopes are enough).
  - The production CMS URL comes from the deploy action's own output (`live_url`), so no
    URL variable is needed.
  - `DIGITALOCEAN_APP_ID` is no longer read, and can be removed after the post-merge check.
- **DigitalOcean:** after the first run, the app's CMS image is pinned to a digest instead
  of the `latest` tag. Environment variables and secrets are carried over unchanged: the
  action writes back the app's own configuration, in which DigitalOcean returns secret
  values already encrypted.
- **Public exposure:** `/_version` reveals which **public** commit is live, nothing else
  (design D6).
- No ADR changes: ADR 0002 decision 4 (a prebuilt public GHCR image, never built on the
  instance) still holds.
