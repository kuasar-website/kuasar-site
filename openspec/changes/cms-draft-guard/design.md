## Context

See proposal.md. Strapi 5.52.3 facts (installed source):
- `utils/dist/content-api-constants.js` whitelists `status` as a Content API query
  parameter.
- `core/dist/core-api/service/core-service.js` only *defaults* it
  (`{ status: 'published', ...params }`).
- No sanitizer strips it.
- The synthetic check (publish-integration task 0.4) confirmed the exposure end to end.

Hooks available:
- `strapi.documents.use(middleware)`: a document-service middleware with `context.action`
  and `context.params`.
- `strapi.requestContext.get()`: the current Koa context, through `AsyncLocalStorage`.
  It's undefined outside a request.
- Content API authentication runs before the controller and sets
  `ctx.state.auth.strategy.name`. It's `users-permissions` for Public and end users, and
  `content-api-token` for API tokens. The admin panel uses `/admin` and
  `/content-manager/*` with its own strategy.

## Goals / Non-Goals

**Goals:** close the exposure at one choke point, after authentication, for every
collection, current and future.

**Non-Goals:**
- Changing Public permissions.
- Restricting which API tokens may read drafts (token scope is configured per token in the
  admin).
- Any `apps/web` change.

## Decisions

### D1. A document-service middleware, decided after authentication
`apps/cms/src/draft-guard.ts` exports a pure `draftReadAllowed({ action, status, path,
strategy, apiPrefix })` and a middleware factory. A read action (`findMany`, `findOne`,
`findFirst`, `count`) with `status === 'draft'` is refused when **both** are true:
- the request path starts with the REST prefix (`api.rest.prefix`, default `/api`);
- the auth strategy is anything other than `content-api-token`.

Otherwise the action passes through.
- **Refusal:** throws `errors.ForbiddenError`, which becomes 403 ("Draft content requires
  an API token.").
- **No request context** (bootstrap or scripts) passes.
- **Admin routes** don't match the prefix, so they pass.

*Alternatives rejected:*
- A global Koa middleware checking the `Authorization` header: it runs **before**
  authentication, so a bogus token would pass its check. The post-authentication strategy
  is the right signal.
- Per-route policies on all seven core routers: correct, but every future collection must
  remember to add it. The document-service middleware covers them all.
- Silently rewriting to `published`: refusing is explicit and testable, and no legitimate
  public caller sends `status=draft`.

### D2. Verification against a real Strapi
- **Unit tests:** `apps/cms/src/draft-guard.test.ts`, run with `node --test`, covering the
  decision table.
- **Integration:** `tests/cms-drafts/check.mjs`. It compiles and loads this `apps/cms`
  against `DATABASE_URL` (a throwaway database), grants Public `find`/`findOne` on Schedule
  Event and Alumni, creates one draft-only and one published entry, and creates a
  custom API token in memory (never printed). It asserts:
  - the public list and single-entry draft reads return 403;
  - a bogus bearer token gets no drafts;
  - the published reads are unchanged;
  - the API token reads drafts;
  - a no-request document read still sees drafts.
- **Workflow:** `.github/workflows/tier-b-cms-drafts.yml`, with a `postgres:16` service
  container, path-filtered to `apps/cms/**`, `tests/cms-drafts/**`, the workflow itself and
  the lockfiles. It has `timeout-minutes: 10` and isn't required. All secrets in it are
  random per run.

## Risks / Trade-offs

- [A Strapi upgrade renames the strategy or the hooks] → the integration check fails
  loudly. The runbook's "Upgrading Strapi" section names this check.
- [A future legitimate public need for drafts] → none exists. Preview uses an API token by
  design.

## Migration Plan

This is additive. It deploys with the next CMS image build, no data changes. To roll back,
revert. After deploying, repeat the production check: one synthetic draft, and a public
`?status=draft` request that must return 403 (manual task).
