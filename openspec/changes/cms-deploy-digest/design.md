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
  - Whether DigitalOcean reused the previously pulled image, or the deployment simply
    hadn't finished yet, is not known. **Either way, the workflow had no means to notice**,
    and that is what this change fixes.
- **DigitalOcean documentation:**
  - `force_build` is documented only as forcing a *source build*;
  - GHCR images are never redeployed automatically;
  - digests are recommended over tags;
  - `tag` and `digest` are mutually exclusive;
  - for secret environment variables: "The value will be encrypted on first submission.
    On following submissions, the encrypted value should be used."
- **`digitalocean/app_action/deploy@v2`** (source read at v2.0.11):
  - With `app_name`, it fetches the existing app's spec, sets
    `image.digest = $IMAGE_DIGEST_<COMPONENT>` and clears `tag`, then calls `Apps.Update`.
  - It polls the newest deployment until it reaches a terminal phase, and **fails unless
    the phase is `ACTIVE`**.
  - It outputs the app JSON, including `live_url` and `active_deployment`.
- **Strapi 5.52.3** (`@strapi/core` `services/server/index.js`):
  - `/_health` is `router.all('/_health', healthCheck)` on the Koa router, which returns 204
    with no database access;
  - `strapi.server.router` is available in `register()`, and the router is mounted later
    (`initRouting`), so a route added in `register()` is served like `/_health`.

## Goals / Non-Goals

**Goals:**
- A CMS deploy deploys the exact image the same run built.
- A green deploy means that image is Active **and** the live process reports the built
  commit, is healthy, and still blocks public draft reads.
- Production deploys only from `main`.
- Environment variables and secrets are untouched.
- The smallest diff that gets there.

**Non-Goals:**
- A staging app.
- An app spec in the repository.
- Automated rollback.
- General observability or release management.
- Changes to the frontend or Vercel.
- New merge gates. Per ADR 0004 this is a deploy path, not a gate.

## Decisions

### D1. Deploy by digest with the official action, not `force_build: true`

- **Not `force_build: true`.** It's documented only for source builds, it would still
  deploy a changing tag, and it still wouldn't wait or verify anything.
- **Not a hand-written polling loop.** The official action already does that, and
  DigitalOcean maintains it.
- **The `app_name` mode** changes exactly one thing in the live spec, the CMS service's
  image reference. It writes everything else back as DigitalOcean returned it; secret
  values come back encrypted and are kept when submitted again.
- **Pinned to a commit SHA,** `cc55bc9b848d25f9c1c9f831cf843fbab3fbfb15` (v2.0.11). It's a
  third-party action holding a production token.

### D2. Digest propagation

- The build step gets `id: push`. `build-push` exposes
  `outputs.digest: ${{ steps.push.outputs.digest }}`.
- `deploy` passes it as `IMAGE_DIGEST_KUASAR_WEBSITE_KUASAR_SITE_CMS`. That's the App
  Platform service `kuasar-website-kuasar-site-cms` (task 0.1), upper-cased with `-` turned
  into `_`, exactly as the action's `componentNameToEnvVar` does. The env key is a YAML
  literal; it must change if the service is ever renamed.
- `app_name` is `${{ vars.DIGITALOCEAN_APP_NAME }}`, which is `kuasar-cms`.
- A wrong key would make the action deploy the spec unchanged. Check 1 of D5 (the digest
  check) turns that into a red run.

### D3. Build identity baked into the image

- **The workflow** passes `build-args: APP_COMMIT_SHA=${{ github.sha }}`. That's the exact
  commit checked out and built: on a push, the merged commit on `main`; on a manual run,
  the head of the dispatched ref.
- **The Dockerfile**, at the **end of the runtime stage only** (so the cached build stage
  isn't invalidated on every commit):
  - `ARG APP_COMMIT_SHA`;
  - `RUN` that **fails the build** unless the value is exactly 40 lower-case hex
    characters, then writes it to `/app/BUILD_COMMIT`.

  A missing or malformed argument therefore can't produce an image.
- **Why a file and not `ENV`:** App Platform environment variables override image `ENV`.
  A file baked into the image can only change with the image, which is exactly the
  property we're measuring.
- **The full 40-character SHA is used, not a shortened one.** It's the identity
  `github.sha` provides, and comparing anything shorter would weaken the guarantee for no
  security gain (D6).

### D4. `/_version` endpoint

- **`apps/cms/src/build-identity.ts`** (pure, unit-tested):
  - `readBuildCommit(path)` returns the trimmed file content if it matches
    `/^[0-9a-f]{40}$/`, otherwise `null` (missing file, empty, malformed);
  - `versionHandler(commit)` returns a Koa handler that sets `Cache-Control: no-store`
    and responds:
    - **200** `{"commit": "<sha>"}` when the commit is known;
    - **503** `{"commit": null}` otherwise.
  - The body has no other fields.
- **`apps/cms/src/index.ts` `register()`:**
  - reads `BUILD_COMMIT` **once**, from `strapi.dirs.app.root`;
  - registers `strapi.server.router.get('/_version', versionHandler(commit))`.
  - There's no database, content, users-permissions, request context or environment
    read, so it's cheap and deterministic.
- **Locally** there's no `BUILD_COMMIT`, so it answers 503 `{"commit": null}`. That's
  harmless, and the file is gitignored so it can never be committed.
- **Placement:** a plain server route beside Strapi's own `/_health`, outside `/api`. So
  the draft guard, Content API permissions and the Public role are untouched.

### D5. Post-deploy verification sequence (`deploy` job, after the action reports Active)

1. **Digest:** the active deployment's service `kuasar-website-kuasar-site-cms`
   `image.digest` must equal `needs.build-push.outputs.digest`. It is read **not** from the
   action's `app` output but by a separate step after the action: one DigitalOcean API call
   (`GET /v2/apps`, same token) selects the app named `DIGITALOCEAN_APP_NAME` and extracts
   only `active_deployment`'s service `image.digest` and the app's `live_url`. The response
   stays in a shell variable that is never printed and is unset straight after. The
   action's `app` output (spec plus encrypted secrets) is not used at all, because passing
   it through step `env` would print it in the public run log.
2. **Live commit:** `GET <live_url>/_version` is polled every 10 s for at most 5 minutes,
   until it returns HTTP 200 with JSON `commit == github.sha`.
   - It fails at the deadline if the last response was unreachable, non-200, not JSON,
     missing `commit`, or a different commit.
   - Retrying covers the short window where App Platform reports Active while the old
     instance still answers some requests. It never accepts a mismatch at the deadline.
3. **Health:** `GET <live_url>/_health` → 204.
4. **Draft guard:** unauthenticated
   `GET <live_url>/api/schedule-events?status=draft&pagination[pageSize]=1` → 403.
   - Only the status code is read; the body is discarded.
   - This also proves the guard survived the deploy.

- **`live_url`** comes from the same API call as the digest (step 1). The step fails if
  it's empty, and no URL is configured by hand.
- **The run summary** records the expected and live digest, the expected and live commit,
  and the three status codes. No tokens, spec or environment values are printed.

### D6. Security of exposing the commit

- **The repository is public** (ADR 0005), so every commit SHA, and the code at it, is
  already public. `/_version` only tells an observer **which** public commit is live.
- **The marginal risk** is learning whether a publicly visible fix has been deployed yet.
  It's negligible here: the window is minutes once this change works, and the fix's code
  is already public on `main`.
- **Not exposed:** branch names, tags, build time, Node or Strapi versions, environment,
  hostnames, digests, secret names, or registry details. A shorter identifier adds no
  safety, because the full SHA is already public, and it would weaken the exact comparison.
- **Abuse:** the endpoint is constant-time and cached in memory, with no database access.
  It's no more of a load or DoS surface than `/_health`.

### D7. Main only, and the feature-branch build check

- **`deploy`** runs only when `github.ref == 'refs/heads/main'`.
- **`build-push`** still runs from any ref, but:
  - it **pushes only from `main`**: `push: ${{ github.ref == 'refs/heads/main' }}`;
  - off `main` it loads the image locally instead, and a step
    (`if: github.ref != 'refs/heads/main'`) runs `docker run --rm --entrypoint cat <image>
    /app/BUILD_COMMIT` and asserts it equals `github.sha`.
- So a manual run from a feature branch is a **safe pre-merge proof** that the baked
  identity propagates: nothing is pushed or deployed. The guard lives in the file, which is
  visible to the next maintainer, unlike GitHub Environment settings.

### D8. Waiting and timeouts

- `deploy` gets `timeout-minutes: 20`: the action's wait, plus at most 5 minutes of live
  checks.
- `concurrency: cms-deploy` with `cancel-in-progress: false` is kept. A dashboard click
  during a run can supersede it, which fails the run; that's correct.

### D9. Bootstrap behaviour

`/_version` ships in the same change that starts checking it. If, after merge,
DigitalOcean keeps serving the previous image, `/_version` doesn't exist there (404) or
reports another commit, and **the run fails**. That's the intended behaviour: the workflow
must never be green while production serves an older CMS revision.

### D10. Recovery semantics (documented, not automated)

- After the first run, the app is pinned to a digest, so **Force Rebuild and Deploy**
  redeploys the *pinned* digest, not `latest`.
- **If a run fails after updating the spec,** the spec may pin an image that never became
  Active. Recovery:
  1. fix forward on `main`; or
  2. re-run the workflow from `main`; or
  3. in an emergency, set the image in the dashboard to the last good digest from an
     earlier green run's summary. GHCR keeps `sha-<commit>` tags.
- Force Rebuild and Deploy stays as the **emergency** fallback. It isn't the normal path,
  and after it someone must still check `/_version`, `/_health` and the draft guard by
  hand.

## Risks / Trade-offs

- **The spec round-trip could drop or alter configuration.** This is mitigated by the
  documented encrypted-secret semantics and the action's single-field edit. It's checked
  read-only before merge (task 3.4) and against the key list after merge (task 4.1).
- **A wrong component name** is caught by the digest check (D5 step 1).
- **The live checks fail on a slow rollout.** They're bounded at 5 minutes; a red run
  then means "investigate", which is the point.
- **A third-party action with a production token.** It's pinned by commit SHA, and the
  token keeps its existing custom `app` scope.
- **The token's scope and expiry are not verified before merge.** No expiry is recorded
  anywhere, and nothing pre-merge exercises the token: the feature-branch run (task 3.3)
  skips `deploy`. The first real run on `main` (task 4.1) is the check. It fails closed:
  the action reads the app before updating it, so a 401/403 stops the run before the spec
  changes.
- **No staging app.** The first real run is production, redeploying already-live CMS code
  plus the tiny `/_version` route.
- **Motion, first-load JS and Strapi fields:** none. No route, animation or content-type
  change on the web side, and no Strapi schema change.

## Migration Plan

1. **Pre-merge** (tasks 3.1–3.5):
   - lint the workflow;
   - unit-test and integration-test `/_version`;
   - dispatch from the feature branch: build, check the baked commit, and confirm no push
     and no deploy;
   - confirm configuration preservation, read-only;
   - CI green on the PR.
2. **Merge.** The push runs the workflow: `apps/cms/**` and the workflow file both changed.
3. **Post-merge smoke check** (task 4.1). The workflow does the checks; a human confirms
   DigitalOcean Activity and the environment-variable key list.
4. Remove `DIGITALOCEAN_APP_ID` only after 4.1 passes (task 4.2). Until then it keeps the
   rollback below working, because the old workflow reads it.

**Rollback:** revert the PR. The old `curl` path comes back, and the app's image reference
can be set back to tag `latest` in the dashboard. The `/_version` route is harmless if left
behind.

## Open Questions

None. The App Platform identifiers are confirmed: app `kuasar-cms`, service
`kuasar-website-kuasar-site-cms` (task 0.1).
