## ADDED Requirements

### Requirement: CMS deploys run the exact image built from main and report success only when it is Active
The CMS deploy workflow SHALL deploy to production only from `main`, whether triggered by a
push or run manually. It SHALL deploy the CMS image by the **digest** that the same
workflow run built and pushed, never by a mutable tag. It SHALL report success only after
DigitalOcean App Platform reports that deployment **Active** and the active deployment's
CMS image digest equals that digest. It SHALL fail if the deployment ends in error, is
cancelled, is superseded, or does not finish within the job timeout. Deploying SHALL leave
every existing App Platform environment variable and secret unchanged, and SHALL NOT print
any credential.

#### Scenario: A CMS merge goes live
- **WHEN** a commit that touches `apps/cms/**` lands on `main`
- **THEN** the workflow builds and pushes the image, deploys exactly that image digest, waits until the deployment is Active, verifies the live digest equals the built digest, and only then succeeds

#### Scenario: The deployment does not become Active
- **WHEN** the App Platform deployment ends in error, is cancelled or superseded, or exceeds the job timeout
- **THEN** the workflow run fails, and the run shows the digest that was attempted

#### Scenario: The wrong image ends up live
- **WHEN** the deployment becomes Active but its CMS image digest differs from the digest this run built
- **THEN** the workflow run fails

#### Scenario: Manual run from a feature branch
- **WHEN** the workflow is started manually from any branch other than `main`
- **THEN** no image is pushed and nothing is deployed to production

#### Scenario: Configuration survives a deploy
- **WHEN** a deploy completes
- **THEN** the App Platform app has the same set of environment variables and secrets as before, and only the CMS service's image reference has changed
