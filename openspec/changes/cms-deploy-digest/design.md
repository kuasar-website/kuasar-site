## Context

- **Current workflow** (`.github/workflows/cms-deploy.yml` at `ceaf397`):
  - `build-push`: `docker/build-push-action@v6` pushes `ghcr.io/kuasar-website/kuasar-site/cms`
    with the tags `latest` (default branch only) and `sha-<commit>`;
  - `deploy`: a `curl` `POST /v2/apps/$APP_ID/deployments` with `{"force_build": false}`,
    whose output is discarded.
- **The App Platform service** runs the GHCR image at the tag `latest` (runbook step 4).
- **Incident, 2026-10-02:**
  - the run for `ceaf397` was green: build 18:17:42, deploy request 18:17:48;
  - GHCR `latest` and `sha-ceaf397…` both resolved to `sha256:bb7d1969…`;
  - production still answered `?status=draft` with 200 until a manual Force Rebuild and
    Deploy.
  - Whether DigitalOcean reused the previously pulled `latest` image, or the deployment
    simply hadn't finished yet, is not known; the app's Activity history would show it.
    **Either way, the workflow had no means to notice**, and that is what this change
    fixes.
- **DigitalOcean documentation:**
  - `force_build` is documented only as forcing a *source build* instead of reusing a
    cached one;
  - GHCR and Docker Hub images are never redeployed automatically;
  - digests are recommended over tags to trigger deployments consistently;
  - `tag` and `digest` are mutually exclusive in the app spec;
  - for secret environment variables: "The value will be encrypted on first submission.
    On following submissions, the encrypted value should be used."
- **`digitalocean/app_action/deploy@v2`** (source read at v2.0.11, `deploy/main.go`,
  `deploy/images.go`):
  - With `app_name`, it fetches the existing app's spec through the API. For each container
    component, it replaces `image` with `digest = $IMAGE_DIGEST_<COMPONENT>` (and clears
    `tag`) when that variable is set. `<COMPONENT>` is the component name in upper case,
    with `-` changed to `_`.
  - It then calls `Apps.Update` with that spec, takes the newest deployment, and polls it
    until it reaches a terminal phase.
  - It **fails unless the phase is `ACTIVE`** (`ERROR`, `CANCELED` and `SUPERSEDED` fail).
  - Its output `app` is the app's JSON after deployment.

## Goals / Non-Goals

**Goals:**
- A CMS deploy deploys the exact image the same run built, and goes green only once that
  image is Active.
- Production deploys only from `main`.
- Environment variables and secrets are untouched.
- The smallest diff that gets there.

**Non-Goals:**
- A staging app.
- An app spec file in the repository (secrets and configuration stay in DigitalOcean).
- Automated rollback.
- Changes to the Dockerfile, the image contents, the frontend or Vercel.
- New merge gates. Per ADR 0004 this is a deploy path, not a gate.

## Decisions

### D1. Deploy by digest with the official action, not `force_build: true`

- **Not `force_build: true`.** It's documented only for source builds, it would still
  deploy a changing tag, and it still wouldn't wait or verify anything.
- **Not a hand-written `curl` and polling loop.** It's more code for the next maintainer,
  and it re-implements what DigitalOcean's own action already does and tests.
- **The official action's `app_name` mode** changes exactly one thing in the live spec,
  the CMS service's image reference. It writes everything else back as DigitalOcean
  returned it, including environment variables, whose secret values come back encrypted
  and are kept when submitted again.
- **Pinned to a commit SHA,** `cc55bc9b848d25f9c1c9f831cf843fbab3fbfb15` (v2.0.11). It's a
  third-party action holding a production token, so a moving tag isn't acceptable.

### D2. Digest propagation

- `build-push` gives its `docker/build-push-action` step an `id` and exposes
  `outputs.digest: ${{ steps.<id>.outputs.digest }}`.
- `deploy` passes it as `IMAGE_DIGEST_<COMPONENT>`. The env key must be a literal in YAML,
  so `<COMPONENT>` is written into the workflow. It's taken from the App Platform service
  name, which the maintainer supplies (task 0.1).
- **Guarding against a silent no-op.** If the env key didn't match the component name, the
  action would deploy the spec unchanged. So a final step reads the action's `app` output
  and **fails** unless the active deployment's CMS image digest equals the built digest. It
  uses no credentials, only the action's output.
- The digest is written to `$GITHUB_STEP_SUMMARY`, so a later reader can see which image
  each run deployed.

### D3. Main only

- The workflow-level triggers stay as they are. Both jobs get
  `if: github.ref == 'refs/heads/main'`.
- `workflow_dispatch` can be started from any branch, using that branch's copy of the
  file. The guard is in the file itself, so a dispatch from a feature branch skips both
  jobs: no image is pushed and nothing is deployed.
- A GitHub Environment with branch rules was considered and not taken. It's settings, not
  code, so it's invisible to a future maintainer reading the workflow.

### D4. Waiting and timeouts

- The action waits for a terminal phase.
- `deploy` gets `timeout-minutes: 15`, so a stuck deployment fails visibly rather than
  hanging. A Strapi start normally takes a few minutes.
- `concurrency: cms-deploy` with `cancel-in-progress: false` is kept, so two of our own
  runs never supersede each other. A dashboard click during a run *can* supersede it; the
  run then fails red, which is correct, and the runbook says what to do.

### D5. Recovery semantics (documented, not automated)

- After the first run, the app is pinned to a digest, so DigitalOcean's **Force Rebuild
  and Deploy** redeploys the *pinned* digest, not `latest`.
- **If a run fails after updating the spec,** the spec may pin an image that never became
  Active. Recovery:
  1. fix forward on `main`; or
  2. re-run the workflow from `main`; or
  3. in an emergency, set the image in the dashboard to the last good digest, which is
     shown in that run's summary. GHCR keeps the `sha-<commit>` tags.
- Force Rebuild and Deploy stays as the emergency fallback for "the platform is wedged",
  not for "the deploy didn't pick up my change".

## Risks / Trade-offs

- **The spec round-trip could drop or alter configuration.** This is mitigated by the
  documented encrypted-secret semantics and the action's single-field edit. The pre-merge
  check (task 2.3) compares the app spec before and after, using encrypted values only.
- **A wrong component name in the env key would deploy the spec unchanged.** The digest
  check (D2) turns that into a red run.
- **A third-party action with a production token.** It's pinned by commit SHA. The token
  keeps its existing custom `app` scope.
- **No staging app.** The first real run *is* production. That's acceptable only because
  it redeploys the CMS code that's already live (task 3.1), and the fallback (D5) is known.
- **Motion, first-load JS and Strapi fields:** none. No route, animation or content-type
  change.

## Migration Plan

1. Pre-merge (tasks 2.x):
   - lint the workflow and review the digest wiring;
   - dispatch from the feature branch, and confirm both jobs are skipped;
   - the maintainer records the app spec's environment-variable keys and the image
     reference (task 0.1). No values are recorded.
2. Merge. The workflow file is in the path filter, so the push to `main` runs it.
   `apps/cms/**` is unchanged, so this redeploys the CMS code that's already live.
3. Post-merge smoke check (task 3.1).
4. Remove the unused `DIGITALOCEAN_APP_ID` secret only after that check passes.

**Rollback:** revert the PR. The old `curl` path comes back, and the app's image reference
can be set back to tag `latest` in the dashboard.

## Open Questions

None blocking. The exact App Platform **service name** and **app name** are inputs, not
decisions (task 0.1).
