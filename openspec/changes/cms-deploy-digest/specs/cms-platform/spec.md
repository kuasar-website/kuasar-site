## ADDED Requirements

### Requirement: CMS deploys run the exact image built from main and report success only when it is live
The CMS deploy workflow SHALL deploy to production only from `main`, whether triggered by a
push or run manually. It SHALL deploy the CMS image by the **digest** that the same
workflow run built and pushed, never by a mutable tag. It SHALL report success only after
all of the following hold:
- DigitalOcean App Platform reports the deployment **Active**;
- the active deployment's CMS image digest equals the built digest;
- the live CMS `GET /_version` reports a `commit` exactly equal to the run's `github.sha`;
- `GET /_health` returns 204;
- an unauthenticated Content API request with `status=draft` returns 403.

It SHALL fail if the deployment ends in error, is cancelled or superseded, or exceeds its
timeout, or if any of those checks fails. Deploying SHALL leave every existing App
Platform environment variable and secret unchanged, and SHALL NOT print any credential.

#### Scenario: A CMS merge goes live
- **WHEN** a commit that touches `apps/cms/**` lands on `main`
- **THEN** the workflow deploys exactly that run's image digest, waits until it is Active, confirms the live digest, `/_version` commit, `/_health` 204 and draft 403, and only then succeeds

#### Scenario: The deployment does not become Active
- **WHEN** the App Platform deployment ends in error, is cancelled or superseded, or exceeds the job timeout
- **THEN** the workflow run fails, and the run shows the digest that was attempted

#### Scenario: Production still serves an older revision
- **WHEN** the deployment is reported Active, but `/_version` is unavailable, malformed, missing `commit`, or reports a commit other than `github.sha` until the verification deadline
- **THEN** the workflow run fails

#### Scenario: The wrong image digest is active
- **WHEN** the active deployment's CMS image digest differs from the digest this run built
- **THEN** the workflow run fails

#### Scenario: Manual run from a feature branch
- **WHEN** the workflow is started manually from any branch other than `main`
- **THEN** no image is pushed, nothing is deployed to production, and the locally built image's baked commit is checked against that run's `github.sha`

#### Scenario: Configuration survives a deploy
- **WHEN** a deploy completes
- **THEN** the App Platform app has the same set of environment variables and secrets as before, and only the CMS service's image reference has changed

### Requirement: CMS exposes a minimal build identity
Every CMS image SHALL contain the full 40-character Git commit SHA it was built from, baked
into the image at build time so that runtime configuration cannot override it. An image
SHALL NOT be produced without a valid SHA. The running CMS SHALL serve `GET /_version`
without authentication, and SHALL respond:
- with exactly `{"commit": "<sha>"}` and `Cache-Control: no-store` when the SHA is known;
- with 503 and `{"commit": null}` when it is not.

It SHALL NOT read the database, Strapi content, authentication state or environment
variables to answer. It SHALL NOT expose any other field.

#### Scenario: Production reports its commit
- **WHEN** anyone requests `/_version` on the production CMS
- **THEN** the response is 200 with only the `commit` field, equal to the commit the running image was built from

#### Scenario: Build identity missing
- **WHEN** the CMS runs without a valid baked commit, such as in local development
- **THEN** `/_version` responds 503 with `{"commit": null}`, and nothing else about the environment is revealed

#### Scenario: Image built without a commit
- **WHEN** the CMS image is built without a valid 40-character `APP_COMMIT_SHA`
- **THEN** the build fails
