## Why

On 2026-10-02, after #39 (cms-draft-guard) merged, `.github/workflows/cms-deploy.yml`
built and pushed the correct CMS image, and GitHub Actions reported the run green. Yet
production kept serving the previous revision: unauthenticated `?status=draft` still
returned 200. The guard went live only after a manual **Force Rebuild and Deploy** in
DigitalOcean.

The workflow's `deploy` job sends one `POST /v2/apps/$APP_ID/deployments` with
`{"force_build": false}` and exits on HTTP 2xx. It never learns which deployment it
created, never waits for it, and never checks which image went live. The app's
configuration points at the mutable `latest` tag. So a green CMS deploy currently doesn't
mean the merged CMS code is live.

DigitalOcean's container-image guide recommends deploying by **image digest** ("To trigger
the deployment of a new image consistently, use SHA digests"). App Platform doesn't
redeploy on its own for images from GitHub's registry.

This has to be reliable before launch: every CMS fix, including security fixes like #39,
reaches production only through this path.

**Audience:** neither directly. It's operational reliability that protects every
CMS-backed page and the editors.

## What Changes

- **`build-push`** keeps the existing Docker build unchanged and exposes the pushed
  image's **digest** (from `docker/build-push-action`) as a job output.
- **`deploy`** replaces the `curl` call with DigitalOcean's official action,
  `digitalocean/app_action/deploy@v2`, pinned to a commit SHA. It:
  - reads the **existing** app configuration by app name;
  - sets the CMS service's image to that **exact digest** (no `latest`);
  - updates the app and **waits** for the deployment to finish;
  - fails unless the deployment ends **Active** (Error, Canceled or Superseded fail it).
- **A verification step** fails the run unless the live app's CMS image digest equals
  the digest built in that run. The digest is written to the run summary, to help with
  recovery.
- **Main only:** both jobs run only when `github.ref == 'refs/heads/main'`. A manual run
  from any other branch deploys nothing.
- **Unchanged:** the frontend and Vercel, the Dockerfile, the triggers (push to `main` on
  `apps/cms/**`, and manual dispatch) and the concurrency group.
- **Docs:** `docs/ops/cms-runbook.md` step 4 and troubleshooting, and the Deploying
  section of `docs/HANDOVER.md`.
  - The CMS deploys by digest.
  - A green deploy means the deployment is Active.
  - Recovery covers a failed run.
  - Force Rebuild and Deploy stays as the emergency fallback, and now redeploys the
    pinned digest.

**Dependencies:** one new CI action, `digitalocean/app_action/deploy` v2.0.11, pinned to
commit `cc55bc9b848d25f9c1c9f831cf843fbab3fbfb15`. No runtime dependency, and no change to
the CMS or web code.

**Content:** none. No entity is added or moved.

**Locales:** not applicable. Nothing user-facing changes in either locale.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cms-platform`: ADDED a requirement that a CMS deploy runs the exact image built from
  `main`, and reports success only once that image is Active.

## Impact

- `.github/workflows/cms-deploy.yml`.
- `docs/ops/cms-runbook.md` (step 4 and troubleshooting) and `docs/HANDOVER.md`
  (Deploying).
- **GitHub configuration:** a new Actions **variable** `DIGITALOCEAN_APP_NAME`. The existing
  `DIGITALOCEAN_ACCESS_TOKEN` secret is reused (the `app` read/update scopes are enough).
  `DIGITALOCEAN_APP_ID` is no longer read, and can be removed after the post-merge check.
- **DigitalOcean:** after the first run, the app's CMS image is pinned to a digest instead
  of the `latest` tag. Environment variables and secrets are carried over unchanged: the
  action writes back the app's own configuration, in which DigitalOcean returns secret
  values already encrypted.
- No ADR changes: ADR 0002 decision 4 (a prebuilt public GHCR image, never built on the
  instance) still holds.
