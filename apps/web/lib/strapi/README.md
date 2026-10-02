# Strapi: registry, request convention, revalidation and preview

The contract is `openspec/changes/publish-integration/` (and `openspec/specs/publish-integration`
after archive). This README is the handoff for every Strapi loader, including Dev 3's
`announcements` and `alumni-directory`.

## For a new Strapi loader (Dev 3: announcements 6.2, alumni-directory 6.2)

1. **Tag:** use the reserved tag in `registry.ts` (`CACHE_TAGS.announcements`,
   `CACHE_TAGS.alumni`). Export it from your loader. `registry.test.ts` asserts your
   constant equals the registry's, so add your import there.
2. **Base URL:** `STRAPI_URL` (server-only), optional `STRAPI_API_TOKEN`. Production builds
   must fail without `STRAPI_URL` (see `components/events/content.tsx`).
3. **Requests:** `const read = strapiRead(TAG, { token, preview, previewToken })` from
   `content-request.ts`. Then:
   - set `status` to `read.status` and pass `read.init` to `fetch`;
   - keep skipping rows without `publishedAt` **unless** `read.status === 'draft'`.
4. **Preview flag:** in your server component, pass `preview: await isPreview()` and
   `previewToken: previewToken()` from `draft.ts`.
5. **Preview route:** when your route exists, set `preview: true` for your uid in
   `registry.ts` **and** add the uid to `apps/cms/src/preview-url.ts` (a test checks the two
   agree). Slug-routed detail previews need a derived slug lookup; never take a path from
   the request.

Public output stays published-only and static. No request-time Strapi fetch except in
Draft Mode, and never a cron or a time-based `revalidate`.

## Revalidation (`/api/revalidate`)

- **Auth:** `Authorization: Bearer <REVALIDATE_SECRET>` only (a query secret gets 401).
- **What it calls:** `revalidateTag(tag, 'max')` for the uid's registry tags; media
  events revalidate all tags. Sponsor and unknown models are no-ops.
- **Never `revalidatePath`:** on the fallback-false localized routes (`[locale]` +
  `dynamicParams = false`) it produced persistent 404s.
- **Known gap:** with `'max'`, the first view after a publish can still be stale (the next
  one is fresh). It's tracked in the change's tasks (6.4) and needs a locale-routing
  decision.

## Preview (`/api/preview`, `POST /api/preview/exit`)

- **Input:** only `uid`, `documentId`, `locale` and `status`, plus `PREVIEW_SECRET`.
- **Redirect:** a **relative**, registry-derived path. Any `url`/`path`/`redirect` parameter
  is ignored.
- **Draft Mode:** drafts are read with `STRAPI_PREVIEW_TOKEN` only.
- **Headers:** Draft Mode responses are `noindex` and framable only by the Strapi origin
  (`next.config.ts`, cookie-scoped). Public responses are unchanged.
