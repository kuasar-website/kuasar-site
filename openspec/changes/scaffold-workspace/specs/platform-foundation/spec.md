## Purpose

Gives the project a workspace that a fresh clone can install and build on the pinned
Node/npm toolchain, and gives every later change a Strapi fetch helper that fails loudly
and points at the runbook instead of surfacing a raw network error.

## ADDED Requirements

### Requirement: Fresh clone installs on the pinned toolchain
A contributor on the pinned Node version SHALL be able to clone the repository and
install dependencies without manual intervention, resolving to the exact versions
recorded in the committed lockfile.

#### Scenario: Clean install from the committed lockfile
- **WHEN** a contributor on the Node version declared in `.nvmrc` runs `npm ci` in a
  freshly cloned repository
- **THEN** installation completes with no lockfile changes and no version resolved
  outside what `package-lock.json` records

#### Scenario: Declared engine does not match the running Node version
- **WHEN** `npm install` runs under a Node major version other than the one declared in
  `package.json` `engines`
- **THEN** npm reports the engine mismatch rather than silently installing against an
  unsupported runtime

### Requirement: apps/web builds without a reachable CMS
`apps/web` SHALL produce a production build using only the pinned toolchain, with no
dependency on Strapi being reachable, since no route in this change fetches Strapi.

#### Scenario: Production build succeeds with no CMS running
- **WHEN** `npm run build` runs in `apps/web` and no Strapi instance is reachable at any
  configured URL
- **THEN** the build completes successfully, because this change ships no page or route
  that fetches Strapi at build or request time

#### Scenario: Production build succeeds from a clean install
- **WHEN** `npm run build` runs in `apps/web` immediately after `npm ci`
- **THEN** the build completes with no additional manual setup step

### Requirement: Strapi fetch failures name Strapi and point at the runbook
Any code path that fetches from Strapi at build time SHALL wrap the underlying request
so that a network-level failure to reach the CMS produces an explicit error identifying
Strapi and pointing at `docs/ops/cms-runbook.md`, never a raw network error surfaced
as-is.

#### Scenario: Strapi is unreachable
- **WHEN** the Strapi fetch wrapper is called and the configured Strapi URL cannot be
  reached (connection refused, timeout, or DNS failure)
- **THEN** the wrapper throws an error whose message names Strapi and points at
  `docs/ops/cms-runbook.md`, rather than propagating the raw network error (e.g.
  `ECONNREFUSED`) unchanged

#### Scenario: Strapi responds successfully
- **WHEN** the Strapi fetch wrapper is called and the configured Strapi URL responds
  successfully
- **THEN** the wrapper returns the response to the caller unchanged, adding no error
  wrapping on the success path

#### Scenario: A configuration error is not mistaken for network unreachability
- **WHEN** the Strapi fetch wrapper is called with a base URL that cannot be parsed as a
  valid URL
- **THEN** the resulting error is distinct from the network-unreachable message — a
  configuration error and a network failure remain distinguishable to the caller

### Requirement: The committed wordmark is preserved untouched
The workspace scaffold SHALL NOT move, regenerate, or modify the existing brand asset.

#### Scenario: Wordmark survives scaffolding
- **WHEN** the workspace and `apps/web` scaffold is created or rebuilt
- **THEN** `apps/web/public/brand/kuasar-wordmark.svg` still exists at that exact path
  with its content unchanged
