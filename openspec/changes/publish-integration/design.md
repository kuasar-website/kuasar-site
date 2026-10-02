## Context

See proposal.md, "Why". These are the facts on `main` at `b2343ac` (2026-10-02):

- **Authority:**
  - ADR 0001 §2: static generation; a shared-secret revalidation handler;
    `revalidateTag(tag, 'max')` on Next 16; never a cron.
  - ADR 0002 §8: preview via Strapi's native preview into Draft Mode;
    `const draft = await draftMode()`; framing scoped to preview; the redirect is derived
    by the handler, never taken from a query parameter.
  - Catalogue (`docs/task-assignments.html`): it writes `app/api/revalidate/**` and
    `app/api/preview/**`, and its acceptance is publish → reload changes, preview inside
    the admin iframe, and both handlers rejecting unauthenticated calls.
  - Runbook steps 6–7 describe the webhook and preview configuration.
- **Existing Strapi consumers** (each its own loader, all `status=published`,
  `force-cache`, `next: { tags, revalidate: false }`, `STRAPI_URL` + optional
  `STRAPI_API_TOKEN`):

  | Loader | Tag | Status |
  |---|---|---|
  | `lib/events/data.ts` | `events-showcase` (stellar-talk, nebula-night) | merged |
  | `lib/schedule/data.ts` | `schedule-calendar` | merged |
  | `lib/summit/data.ts` | `galactic-summit` | PR #36, unmerged |

  Each handoff README names its tag plus paths plus `/sitemap.xml`.
- **Dev 3's foundations** (`lib/cms/announcements.ts`, `lib/cms/alumni.ts`) are mappers
  only. Their 6.2 tasks wait for this capability's fetch function, base URL and tags.
- **Security headers:** `apps/web` sends none today: no `headers()` in `next.config.ts`, no
  middleware or proxy, so no CSP and no `X-Frame-Options`.
  This change keeps it that way for public responses (D5).
- **Domain dependency:** the catalogue says publish-integration is "Blocked by
  cms-platform and the domain". cms-platform is done. The production domain path isn't
  ready yet, so implementation and non-domain tests use the current Vercel deployment,
  and **domain-dependent live acceptance (section 8) stays open** until it is.
- **Revalidation evidence (2026-10-02, real `next build`/`next start` of this app):**

  | Mode | First reload | Later reloads |
  |---|---|---|
  | `revalidateTag(tag, 'max')` | stale | fresh |
  | `revalidatePath(path)` | **404** (`NoFallbackError`) | 404, persistent |
  | `revalidateTag(tag, { expire: 0 })` | **404** | 404 |

  Root cause, in the Next 16.3.1 source: a hard tag expiry makes `FileSystemCache.get`
  return `null` for the page, and `app-page-runtime` throws `NoFallbackError` for a
  production request on a dynamic-segment route with fallback `false` (from
  `dynamicParams = false` on `app/[locale]/layout.tsx` or the page). The only working
  configuration found removes `dynamicParams = false` from the shared `[locale]` layout
  and the page. That weakens 404 handling (unknown locales render on demand and get
  cached), so it's a locale-routing decision, outside this change.

  So preview needs **no change to any route's segment config**. (The spike was built with
  `--webpack`, because Turbopack rejects a `node_modules` symlink outside the project root;
  task 0.2 re-verifies inside the real Turbopack build.)

## Goals / Non-Goals

**Goals:**
- One registry and one request convention, so revalidation, preview and every loader agree
  on tags (and on the public and preview paths). That convention is what Dev 3 needs.
- Fail closed: no secret means no revalidation and no preview, and nothing derived from
  untrusted input decides a redirect target.

**Non-Goals:**
- Dev 3's announcements and alumni routes and loaders; this capability only reserves
  their registry entries.
- A site-wide CSP beyond `frame-ancestors`.
- Webhook signing beyond a shared secret (Strapi's webhooks don't sign).
- Live configuration of production secrets (manual tasks).

## Decisions

### D1. The webhook secret travels in a header, not the query string
Strapi webhooks support custom headers. The handler accepts only
`Authorization: Bearer <REVALIDATE_SECRET>`, compared with `crypto.timingSafeEqual` over
equal-length buffers. A query-string secret ends up in Vercel request logs and in Strapi's
delivery log, so it is **rejected even when correct**. Runbook step 6 currently says
`?secret=`; this change updates it (the runbook is operational guidance, not an ADR).

*Alternative rejected:* accepting both forms. It keeps the leak and two code paths alive.

### D2. Revalidation is tag-only, from one registry
`lib/strapi/registry.ts` maps each uid to `{ tags, paths(locale), preview }`. Only the tags
drive revalidation; the paths document which pages each tag covers and feed preview:

| uid | tags | public paths (both locales) | preview |
|---|---|---|---|
| `api::stellar-talk.stellar-talk`, `api::nebula-night.nebula-night` | `events-showcase` | `/en/events`, `/tr/etkinlikler` | events path |
| `api::schedule-event.schedule-event` | `schedule-calendar` | `/en/schedule`, `/tr/takvim` | schedule path |
| `api::galactic-summit.galactic-summit` | `galactic-summit` | `/en/galactic-summit`, `/tr/galactic-summit` | summit path |
| `api::announcement.announcement` | `announcements` (**reserved for Dev 3**) | `/en/news`, `/tr/duyurular` (+ slug detail once Dev 3 defines it) | news path |
| `api::alumnus.alumnus` | `alumni-directory` (**reserved for Dev 3**) | `/en/alumni`, `/tr/mezunlar` | alumni path |
| `api::sponsor.sponsor` | none (the showcase is held, and the Summit never fetches sponsors) | none | none |

The sitemap fetches with the same tags, so it's covered too. Paths are built with
`sectionPath()`, never hard-coded. The handler calls `revalidateTag(tag, 'max')` for each
tag and nothing else; it never calls `revalidatePath` (see below). The registry owns the
tag strings. The merged loaders (events, schedule and, since #36 merged, Galactic Summit)
keep their exported constants, and a unit test asserts each equals the registry's value,
so nothing drifts and no loader churns.

**Tags only, no `revalidatePath`:** `revalidateTag(tag, 'max')` is mandated (ADR 0001
§2) and covers every route and sitemap that fetched with the tag. `revalidatePath` is
**not used**: on these fallback-false localized routes it produced a persistent 404
(Context, evidence table).

**Known unresolved acceptance gap:** the accepted requirement is "publish → wait seconds
→ reload → changed". With `'max'` the first request after a publish is stale and
triggers regeneration, and the change is visible on the next request. The production
check measures and reports this every run, and never counts it as a pass. Closing the gap
needs a separate decision on locale routing (`dynamicParams`) plus verification on Vercel,
whose ISR cache differs from `next start`. Task 6.4 tracks it; the requirement is unchanged.

**Events handled:**
- `entry.create`/`update`/`publish`/`unpublish`/`delete` revalidate the model's tags and
  paths. Draft-only edits are harmless to include, and it avoids reasoning about which
  ones matter.
- `media.update`/`media.delete` revalidate all tags (a replaced file changes URLs
  everywhere).
- Anything else: 200, nothing revalidated.

### D3. Preview derives its target; nothing from the query decides it
The Strapi handler (`apps/cms/config/admin.ts`) returns
`${CLIENT_URL}/api/preview?secret=…&uid=…&documentId=…&locale=…&status=…`, or `null` for
uids without a preview (Sponsor).

`/api/preview`:
1. Checks the secret in constant time.
2. Validates the input:
   - `uid` is in the registry with a `preview`;
   - `locale` is in `LOCALES`;
   - `documentId` matches `^[a-z0-9]{20,32}$`;
   - `status` is `draft` or `published`.
3. Resolves the path from the registry. Slug-routed types (announcements, once Dev 3
   defines them) fetch the document's slug server-side with the preview token.
4. Asserts the result starts with `/en/` or `/tr/`.
5. Calls `const draft = await draftMode()`, then `draft.enable()` for `draft` or
   `draft.disable()` for `published`.
6. Issues a `redirect()`.

Every other query parameter is ignored. `POST /api/preview/exit` disables Draft Mode and
redirects to that locale's home. GET only for the entry: Strapi opens a URL; Next's guide
notes this exception.

### D4. Draft data only in Draft Mode, with a dedicated preview token
`lib/strapi/content-request.ts` exports `strapiRequest(path, { tag, params })`. It returns
the URL and init.
- **Normally:** `status=published`, `STRAPI_API_TOKEN` if set, `cache: 'force-cache'`,
  `next: { tags: [tag], revalidate: false }`.
- **When `(await draftMode()).isEnabled`:** `status=draft`, `Authorization: Bearer
  STRAPI_PREVIEW_TOKEN`, `cache: 'no-store'`. Draft Mode bypasses the cache anyway.
- **Missing token in Draft Mode:** the request fails loudly ("preview not configured")
  rather than silently showing published content.

Loaders keep their validation. Their "skip rows without `publishedAt`" safeguard stays
**on outside Draft Mode**, and is bypassed only when the request convention reports
preview. A test proves a non-draft build never includes a draft row.

**Security finding (task 0.4, verified 2026-10-02):** a local, synthetic Strapi 5.52.3
built from this repository's `apps/cms` (throwaway Postgres; Public granted only
`find`/`findOne` on Schedule Event, as in production; one draft-only and one published
synthetic entry) returned the draft to an **unauthenticated** request: `GET
/api/schedule-events?status=draft` listed `SYNTH-DRAFT-ONLY-7Q3X`, and `GET
/api/schedule-events/<id>?status=draft` returned it directly. This matches the source:
`status` is an allowed Content API parameter, and the core service only defaults it.
Production grants Public `find` on all seven collections, **Alumni included**, so every
draft is publicly readable once one exists. Production was empty on 2026-10-02, so nothing
is exposed yet.

This capability doesn't rely on that behaviour. Preview reads drafts only with
`STRAPI_PREVIEW_TOKEN`, and the public path stays `status=published`. But the exposure is a
CMS permission defect that needs its own fix (for example, a content-API policy forcing
`status=published` for unauthenticated requests) **before editors create drafts**. It's
escalated, not worked around here.

### D5. Framing and indexing: preview responses only; public responses unchanged
`next.config.ts` `headers()` adds **one** rule:
- `source: '/:path*'`, `has: [{ type: 'cookie', key: '__prerender_bypass' }]` →
  `Content-Security-Policy: frame-ancestors 'self' <Strapi origin>` and
  `X-Robots-Tag: noindex`.

`/api/preview` and its exit route set the same two headers on their own responses, because
the cookie may not exist yet on the first hit. Requests without the Draft Mode cookie
match no rule, so **public responses keep exactly today's headers**. No site-wide CSP or
framing policy is introduced (correction, 2026-10-02: an earlier draft proposed a
site-wide `frame-ancestors 'none'`; removed as out of scope). The Strapi origin comes from
`STRAPI_URL`'s origin at build time. Without it, the rule is omitted and preview fails
closed.

**Third-party cookie risk:** inside the admin iframe, the Draft Mode cookie is a
third-party cookie. Browsers that block those may show published content in the iframe;
Strapi's "open in new tab" preview still works. Recorded for the live check.

### D6. Motion and bundle
No UI, no animation, and no client JS added to public routes. The handlers are server-only
route handlers. First-load budgets are unchanged; Tier A `check:budgets` confirms it.

### D7. Verification
- **Unit tests** (`node --test`), in Tier A's `test:cms`/`test:content` style, under
  `apps/web/lib/strapi/*.test.ts` and `apps/web/app/api/**/*.test.ts`. The handlers take
  injectable `revalidateTag`, `draftMode` and environment (no `revalidatePath`), so they're
  unit-testable without a server.
- **Production-build check:** `tests/publish/check-routes.mjs` runs a real `next build`
  and `next start` against a synthetic Strapi that serves published **and** draft rows. It
  asserts:
  - routes stay static;
  - both handlers reject unauthenticated requests;
  - the webhook returns 200, pages never 404, and the change appears on a subsequent
    request in both locales; first-reload freshness is measured and reported as the
    known gap;
  - preview sets the cookie, redirects to the derived path, and shows the draft only with
    the cookie;
  - the header policy is correct on public and Draft Mode responses.
- **New workflow:** `.github/workflows/tier-b-publish.yml`, path-filtered, with
  `timeout-minutes: 10`, not required.

## Risks / Trade-offs

- [Public role can read drafts: **confirmed** by 0.4] → escalated as a CMS permission
  defect that needs its own fix before editors create drafts; this capability doesn't
  depend on it.
- [First reload after publish is stale with `'max'`] → known unresolved acceptance gap,
  documented and left open (6.1, 6.4). `revalidatePath` is not a fix: it 404s these
  routes.
- [Third-party cookie blocking breaks iframe preview] → use the "open in new tab" preview;
  recorded in the runbook.
- [Touching merged loaders owned by others (events: Dev 5)] → mechanical adoption of the
  convention, with no behaviour change outside Draft Mode; the existing suites must stay
  green.
- [Summit loader unmerged] → registry entry reserved; the loader is adopted in a
  follow-up after #36 is on `main`. This change touches no #36 file.

## Migration Plan

1. Merge the code; it is inert until secrets exist. A missing `REVALIDATE_SECRET` makes
   every webhook 401; a missing `PREVIEW_SECRET` makes preview 401.
2. Set the web environment variables in Vercel (Production and Preview) and the CMS
   environment variables in App Platform.
3. Create the Strapi webhook with the `Authorization` header.
4. Redeploy Strapi so `admin.preview` loads.
5. Run the live checks once the production domain path is ready.

Rollback: delete the webhook and unset the secrets (handlers then reject everything), or
revert the PR.

## Open Questions

None that change this capability's specs or tasks. Task 0.4's finding is escalated
separately; the fix belongs in `apps/cms` content-API permissions, outside
publish-integration.
