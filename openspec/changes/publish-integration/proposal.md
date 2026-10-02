## Why

The site is statically generated and never fetches Strapi in the request path (ADR 0001
§2). Without this capability, a Strapi publish changes nothing until someone redeploys,
and editors publish blind (ADR 0002 §8). Two Dev 3 changes are explicitly blocked on it:
- `announcements` 6.2 and `alumni-directory` 6.2 wait for "the live fetch function, its
  base-URL environment variable, and revalidation tags. No such convention exists
  anywhere in the codebase yet".
- The merged events-showcase and schedule-calendar READMEs, and the Galactic Summit README
  in PR #36 (merged 2026-10-02), each hand their cache tag to "the publish-integration
  owner".

The catalogue (`docs/task-assignments.html`) lists this capability under Dev 4 and as
"Blocked by cms-platform and the domain". It is being taken over to unblock Dev 3.
cms-platform is merged and production Strapi is live, so **implementation and non-domain
tests** proceed against the current Vercel deployment. **Domain-dependent live acceptance
stays open** until the real production domain path is ready.

**Audience:** neither directly. It serves editors (preview) and keeps the public site
truthful (credibility).

## What Changes

- **`/api/revalidate`** (POST): authorised by a shared secret sent in a request header and
  compared in constant time.
  - On Strapi entry publish, unpublish, update and delete (plus create and media
    changes), it calls `revalidateTag(tag, 'max')` for every tag mapped to the changed
    content type. It deliberately does **not** call `revalidatePath`: on the current
    fallback-false localized routes, a hard path expiry produced a persistent 404.
  - **Known unresolved acceptance gap:** with `'max'` alone, the *first* reload after a
    publish is still stale, and the change appears on the next request. The accepted
    requirement ("first reload shows the change") is **not met and not amended**; see
    design.md D2 and tasks.md 6.1 and 6.4.
  - Unauthenticated, malformed or wrong-method calls are rejected.
  - It never reads content from the request beyond the event name and model.
- **`/api/preview`** (GET): authorised by a separate shared secret.
  - Accepts only `uid`, `documentId`, `locale` and `status` from Strapi's native preview
    handler.
  - Enables or disables Draft Mode with `const draft = await draftMode()`.
  - Redirects to a pathname it derives itself from a fixed content-type → route map,
    never to a URL or path taken from the request.
  - Responses carry `X-Robots-Tag: noindex`.
- **One content-type registry** (`lib/strapi/registry.ts`): the single source of truth for
  each Strapi content type's cache tags, public paths and preview route. Dev 3's
  `announcements` and `alumni-directory` tags are reserved there, so their loaders can
  adopt them.
- **A fetch convention for Strapi loaders** (`lib/strapi/content-request.ts`). It covers:
  - the base URL `STRAPI_URL` and the optional `STRAPI_API_TOKEN`, both server-only;
  - the tag and cache options;
  - a Draft Mode switch that requests drafts only in preview, with a server-only
    `STRAPI_PREVIEW_TOKEN`.

  It is adopted by the merged events and schedule loaders. Galactic Summit's entry is
  **reserved** in the registry, but its loader is adopted only after #36 is on `main`.
  This is the "live fetch function" Dev 3 is waiting for.
- **Framing and indexing scoped to preview only:** Draft Mode responses (identified by the
  `__prerender_bypass` cookie) and `/api/preview` responses get `Content-Security-Policy:
  frame-ancestors 'self' <Strapi origin>` and `X-Robots-Tag: noindex`. **Public responses
  are unchanged.** This change adds no site-wide CSP or framing policy, and relaxes
  nothing.
- **Strapi side:** `apps/cms/config/admin.ts` gains `admin.preview` (`allowedOrigins` = the
  frontend origin, and a handler that builds the `/api/preview` URL). Sponsor has no
  preview, because the showcase is held.
- **Docs:** runbook steps 6–7 are updated to the implemented contract (header-borne secret,
  environment names, troubleshooting rows for 401, blank frame and stale page).

**No cron and no time-based revalidation**, ever. No CMS schema change. No new runtime
dependency.

## Capabilities

### New Capabilities

- `publish-integration`: on-demand revalidation from Strapi webhooks, editor preview
  through Draft Mode, the content-type registry and fetch convention that every Strapi
  loader uses, and the preview-scoped framing and indexing policy.

### Modified Capabilities

None at the spec level. The events, schedule and Galactic Summit loaders change only
internally: they adopt the shared request convention, and their published-only public
behaviour is unchanged.

## Impact

- **Storage:** no entity changes; nothing moves between git and Strapi.
- **Code:**
  - new: `apps/web/app/api/revalidate/route.ts`, `apps/web/app/api/preview/route.ts`
    (plus an exit route), `apps/web/lib/strapi/{registry,content-request,secrets}.ts` and
    their tests;
  - modified: `apps/web/next.config.ts` (headers), `apps/web/lib/events/data.ts`,
    `apps/web/lib/schedule/data.ts`, `apps/cms/config/admin.ts`,
    `docs/ops/cms-runbook.md` (steps 6–7 and troubleshooting);
  - **not in this change:** `apps/web/lib/summit/data.ts`, which is adopted in a
    follow-up once #36 is on `main`.
- **New environment variables** (names only; values are never committed):
  - `apps/web`: `REVALIDATE_SECRET`, `PREVIEW_SECRET`, `STRAPI_PREVIEW_TOKEN`;
  - `apps/cms`: `CLIENT_URL`, `PREVIEW_SECRET`.
- **Not touched:** Dev 3's announcements and alumni code (they adopt the registry and
  convention in their own changes), content-backup, media-pipeline, and git content.
- **Live acceptance stays manual and open** until the secrets are set in Vercel and App
  Platform, the Strapi webhook and preview are configured, and the real production domain
  path is ready.
- **Security finding (task 0.4, 2026-10-02):** a local synthetic Strapi 5.52.3 check showed
  that an **unauthenticated Public-role request with `?status=draft` returns draft
  entries**. Production grants Public `find` on all seven collections, Alumni included.
  This capability's design never relies on public draft access (preview reads drafts only
  with `STRAPI_PREVIEW_TOKEN`), but the CMS exposure itself is a separate defect that must
  be fixed. See design.md, D4.
