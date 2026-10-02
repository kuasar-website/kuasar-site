## 0. Inputs (maintainer, no secrets recorded)

- [ ] 0.1 From the DigitalOcean control panel (App → Settings → App Spec), record **names only**:
  - the **app name**, which goes into the new Actions variable `DIGITALOCEAN_APP_NAME`;
  - the CMS **service (component) name**, which fixes the `IMAGE_DIGEST_<COMPONENT>` key;
  - the **list of environment-variable keys** and their types (`SECRET` or plain), kept locally for task 2.3. Never values.
- [ ] 0.2 Create the GitHub Actions **variable** (not a secret) `DIGITALOCEAN_APP_NAME`. Confirm the existing `DIGITALOCEAN_ACCESS_TOKEN` has the custom `app` read and update scopes and hasn't expired (`docs/HANDOVER.md` records its expiry).

## 1. Workflow

- [ ] 1.1 `build-push`:
  - give the build step `id: push`;
  - add job `outputs: digest: ${{ steps.push.outputs.digest }}`;
  - add `if: github.ref == 'refs/heads/main'`;
  - leave the build itself unchanged.
- [ ] 1.2 `deploy`:
  - `needs: build-push`, the same `if`, `timeout-minutes: 15`, `permissions: {}`;
  - replace the `curl` step with `digitalocean/app_action/deploy@cc55bc9b848d25f9c1c9f831cf843fbab3fbfb15` (v2.0.11);
  - inputs: `token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}`, `app_name: ${{ vars.DIGITALOCEAN_APP_NAME }}`;
  - env: `IMAGE_DIGEST_<COMPONENT>: ${{ needs.build-push.outputs.digest }}`;
  - fail early with a clear message if the token or app name is empty.
- [ ] 1.3 `deploy` verification step:
  - parse the action's `app` output with `jq`;
  - fail unless the active deployment's CMS service `image.digest` equals `needs.build-push.outputs.digest`;
  - write the expected and live digests to `$GITHUB_STEP_SUMMARY`;
  - print no token or spec values, only the digest and the phase.
- [ ] 1.4 Update the workflow's header comment: deploy by digest, wait for Active, main only.

## 2. Pre-merge checks (critical only)

- [ ] 2.1 Run `actionlint` on `cms-deploy.yml` with no findings. It also checks that `needs.build-push.outputs.digest` and `steps.push.outputs.digest` resolve.
- [ ] 2.2 Push the branch, then `gh workflow run cms-deploy.yml --ref change/cms-deploy-digest`. **Both jobs must show as skipped**, with no image pushed and no deployment in DigitalOcean Activity.
- [ ] 2.3 Configuration preservation, read-only:
  - confirm, from the action's source pinned at the SHA, that only `image.digest` and `image.tag` change in the spec it writes back;
  - confirm task 0.1's key list is complete, for comparison in 3.1.
- [ ] 2.4 The existing required checks (Tier A, time-state) are green on the PR.

## 3. Post-merge production smoke check (critical; right after merge)

- [ ] 3.1 The merge's push to `main` runs the workflow, which redeploys the **same CMS code that's already live** (`apps/cms/**` is unchanged). Confirm:
  - the `deploy` job waited and finished green, and the summary shows the expected digest equal to the live digest;
  - DigitalOcean Activity shows the new deployment **Active**, with image digest equal to `build-push`'s digest;
  - App → Settings shows the same environment-variable keys and types as task 0.1, with the CMS running normally;
  - `GET /_health` → 204;
  - unauthenticated `GET /api/schedule-events?status=draft` → 403 "Draft content requires an API token."

  If any of these fails, follow the recovery steps (design D5) and report.
- [ ] 3.2 After 3.1 passes, delete the unused `DIGITALOCEAN_APP_ID` repository secret.

## 4. Documentation

- [ ] 4.1 `docs/ops/cms-runbook.md` step 4:
  - the image is pinned by **digest** by the workflow, so `latest` is no longer what runs;
  - the deploy trigger uses the official action, and a green CMS deploy means the deployment is **Active** with the built digest;
  - the variable `DIGITALOCEAN_APP_NAME` replaces `DIGITALOCEAN_APP_ID`;
  - only `main` deploys.
- [ ] 4.2 `docs/ops/cms-runbook.md` troubleshooting rows:
  - "CMS deploy run failed (phase ERROR, CANCELED or SUPERSEDED, or a digest mismatch)": open DigitalOcean Activity → deploy logs; recover per design D5;
  - "Force Rebuild and Deploy redeploys the pinned digest, not `latest`".
- [ ] 4.3 `docs/HANDOVER.md` Deploying: one sentence each that a green CMS deploy means it's live, and that a manual run deploys from `main` only.

## 5. Verification gate

- [ ] 5.1 **No existing CI gate covers this.** Tier A doesn't lint workflows, and per ADR 0004 the CMS deploy is a deploy path, not a gate. Coverage is the pre-merge checks (2.1–2.3) plus the post-merge smoke check (3.1). Don't add a new gate.

## Deferred (not launch-blocking)

- Observing a real `apps/cms/**` change deploy end to end. It happens naturally on the next CMS merge.
- Recording the 2026-10-02 incident's DigitalOcean Activity entry (deployment phase and digest) to settle whether it was a stale image or an unfinished deployment.
- Any automated rollback, staging app, or an app spec kept in the repository.
