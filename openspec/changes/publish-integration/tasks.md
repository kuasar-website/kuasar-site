## 0. Preconditions (verify before coding)

- [ ] 0.1 Confirm against `main` that the events and schedule loaders, `next.config.ts` (no `headers()`), `apps/cms/config/admin.ts` (no `preview`) and the Strapi 5.52.3 preview contract match design.md, Context. Any drift: update this change first.
- [ ] 0.2 Re-run the Draft Mode spike inside the real `apps/web` Turbopack build on a scratch branch that is never pushed: a static route with `dynamic = "error"` reading `draftMode()` must stay ○, serve build-time HTML without the cookie, and render per request with it. Record the result in design.md, Context.
- [ ] 0.3 Verify `revalidateTag(tag, profile)`, `revalidatePath`, `draftMode()`, `headers()` with `has`/`missing` cookie conditions, and the `__prerender_bypass` cookie name against the installed Next 16.3.1 docs.
- [x] 0.4 **Security gate:** confirm whether an unauthenticated `GET /api/<plural>?status=draft` returns a draft-only entry. If it does, stop and escalate as a CMS permission defect before continuing.
  - **Evidence (2026-10-02), synthetic and local, never production:** a throwaway Postgres, with this repo's `apps/cms` (Strapi 5.52.3) booted with random throwaway secrets. Public was granted only `find`/`findOne` on Schedule Event (as in production), with one draft-only entry (`SYNTH-DRAFT-ONLY-7Q3X`) and one published entry. An unauthenticated `GET /api/schedule-events?status=draft` returned **both draft versions, including the draft-only entry**, and `GET /api/schedule-events/<id>?status=draft` returned it directly. Without `status`, only the published entry was returned. Everything was deleted afterwards.
  - **Result: drafts are publicly readable** for any collection with Public `find`. Production grants that on all seven, Alumni included. **Escalated; apply stops here pending a decision** on the CMS fix (outside this capability's design, which never relies on public draft access).

## 1. Registry and request convention

- [ ] 1.1 `apps/web/lib/strapi/registry.ts`: uid → `{ tags, paths(locale), preview }` per design D2, built with `sectionPath()`. Reserve the `announcements` and `alumni-directory` entries; Sponsor has no tags or preview.
- [ ] 1.2 `apps/web/lib/strapi/secrets.ts`: a constant-time secret comparison over equal-length buffers. It never logs or returns the secret.
- [ ] 1.3 `apps/web/lib/strapi/content-request.ts` per design D4: `status=published`, `force-cache`, registry tags and `revalidate: false` normally; `status=draft` with `STRAPI_PREVIEW_TOKEN` and `no-store` in Draft Mode; a loud failure if the preview token is missing in Draft Mode.
- [ ] 1.4 Unit tests: registry completeness for all seven uids, path generation in both locales, secret comparison, request init in both modes, and the missing-token failure.

## 2. Revalidation handler

- [ ] 2.1 `apps/web/app/api/revalidate/route.ts`: POST only, `Authorization: Bearer` secret, a query secret rejected, a JSON body with `event` and `uid`/`model`. Uses `revalidateTag(tag, 'max')` and `revalidatePath` from the registry, plus `/sitemap.xml`; media events cover all tags; unknown or Sponsor models return 200 with nothing revalidated. Logic sits in a pure function with injectable dependencies.
- [ ] 2.2 Unit tests: 401 (missing, wrong, query-only secret), 405 (GET), 400 (malformed body), each event → exact tags with `'max'` and paths in both locales, the media events, Sponsor/unknown as a no-op, and no secret in any response.

## 3. Preview handler and Strapi config

- [ ] 3.1 `apps/web/app/api/preview/route.ts`: GET; constant-time secret; validated `uid`, `documentId`, `locale`, `status`; a derived path asserted to start with `/en/` or `/tr/`; `const draft = await draftMode()` then enable or disable; redirect. Every other parameter is ignored. Responses carry `X-Robots-Tag: noindex` and the Strapi-only `frame-ancestors`.
- [ ] 3.2 `apps/web/app/api/preview/exit/route.ts`: POST disables Draft Mode and redirects to the locale home.
- [ ] 3.3 Unit tests: 401, 400 for each invalid field, and the open-redirect attempts (`url=`, `path=`, `//evil`, encoded variants) with no effect; enable for `draft`, disable for `published`; Sponsor → 400.
- [ ] 3.4 `apps/cms/config/admin.ts`: `preview: { enabled: true, config: { allowedOrigins: [CLIENT_URL], handler } }`. The handler returns null for Sponsor or when `CLIENT_URL`/`PREVIEW_SECRET` are unset. Add a CMS unit test for the handler under `test:cms`.

## 4. Loader adoption (behaviour unchanged outside Draft Mode)

- [ ] 4.1 `lib/events/data.ts` adopts `strapiRequest` and the registry tag; the `publishedAt` safeguard stays on outside Draft Mode. The events unit, browser and route suites stay green unchanged.
- [ ] 4.2 `lib/schedule/data.ts`, the same; the schedule suites stay green.
- [ ] 4.3 `lib/summit/data.ts`, the same, **only after PR #36 is on `main`**, as a follow-up; never by copying unmerged #36 code. The Summit suites stay green.
- [ ] 4.4 A unit test that every loader's tags equal the registry's, and that a non-draft request never carries `status=draft` or the preview token.

## 5. Framing and indexing policy

- [ ] 5.1 `apps/web/next.config.ts` `headers()` per design D5: one rule, only when the `__prerender_bypass` cookie is present, adding `frame-ancestors 'self' <Strapi origin>` and `X-Robots-Tag: noindex`. No site-wide CSP or framing policy; public responses unchanged.
- [ ] 5.2 Verify in a production build that Draft Mode and `/api/preview` responses carry exactly those two headers, and public responses carry neither.

## 6. Verification

- [ ] 6.1 `tests/publish/` (own lockfile if a browser is needed; otherwise plain Node) with `check-routes.mjs`: a real `next build` and `next start` against a synthetic Strapi serving published and draft rows. Asserts:
  - routes stay static with `revalidate: false`;
  - both handlers reject unauthenticated requests;
  - webhook → the **first** reload of the affected page shows the changed content (if this can't be achieved with `revalidateTag(tag, 'max')` plus `revalidatePath`, stop and report the conflict; never weaken the acceptance);
  - preview → cookie, derived redirect, draft shown only with the cookie;
  - public requests never see the draft;
  - the header policy is correct.
- [ ] 6.2 `.github/workflows/tier-b-publish.yml`: path-filtered (`apps/web/app/api/**`, `apps/web/lib/strapi/**`, `apps/web/lib/{events,schedule,summit}/**`, `apps/web/next.config.ts`, `apps/cms/config/admin.ts`, `tests/publish/**`, the workflow, lockfiles, `.nvmrc`), `timeout-minutes: 10`, not required.
- [ ] 6.3 Run Tier A locally and the events, schedule, Summit (if merged) and time-state suites; all green.

## 7. Documentation and handoff

- [ ] 7.1 `docs/ops/cms-runbook.md` steps 6–7:
  - the header-borne webhook secret;
  - the environment names (`REVALIDATE_SECRET`, `PREVIEW_SECRET`, `STRAPI_PREVIEW_TOKEN`, `CLIENT_URL`);
  - preview token scope: find/findOne on the six public types, never Alumni unless Dev 3's preview needs it;
  - troubleshooting rows for 401, a blank frame, third-party cookies, and "page unchanged after publish: check Strapi's webhook delivery log first".
- [ ] 7.2 `apps/web/lib/strapi/README.md`: the registry and request convention for new loaders. This is Dev 3's handoff for `announcements` 6.2 and `alumni-directory` 6.2.
- [ ] 7.3 Update the events, schedule and (once merged) Summit READMEs' "publish-integration owner" notes to point at the registry.

## 8. Live acceptance (manual; check only with real evidence)

Domain-dependent: these stay open until the real production domain path is ready (catalogue: "Blocked by … the domain"), even if they could be partly exercised on a Vercel URL.

- [ ] 8.1 Secrets set: the web variables in Vercel (Production and Preview) and the CMS variables in App Platform, by an account owner with two people present. Values never recorded.
- [ ] 8.2 Strapi webhook created to `<production frontend>/api/revalidate` with the `Authorization` header, firing on entry create, update, publish, unpublish, delete and media update/delete.
- [ ] 8.3 Publish in Strapi → wait seconds → reload the public page → the change is visible. Recorded with Strapi's webhook delivery log.
- [ ] 8.4 Unpublish → the content disappears after revalidation, in both locales.
- [ ] 8.5 Preview renders a draft inside the Strapi admin iframe in both locales; the public page doesn't show it; the "open in new tab" preview works.
- [ ] 8.6 An unauthenticated call to each production handler is rejected (401).
