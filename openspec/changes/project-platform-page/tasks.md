No motion is introduced, so the un-animated baseline is the whole page. Both locales are
covered in every content and copy task.

## 1. Routing, registry and navigation

- [x] 1.1 Resolve `projects` → `projects`/`projeler` in `apps/web/lib/i18n/segments.ts` (design D1)
- [x] 1.2 Registry: `CACHE_TAGS.projectPlatform`, both uids with `section: "projects"`, `preview: false`; update `registry.test.ts` (D7)
- [x] 1.3 Navigation entry "Project Platform" / "Proje Platformu" (`components/shell/navigation.ts`)

## 2. Mapper and loader

- [x] 2.1 `lib/cms/project-platform.ts`: map the single type and a project; strict contract, lenient optional links; year label; ordering; locale merge (D2, D4, D5, D6)
- [x] 2.2 `lib/cms/project-platform-data.ts`: published-only fetches, single-type 404 as no entry, pagination, the tag (D3)
- [x] 2.3 Unit tests for both: zero/one/many, both locales, fallback, every throw and every dropped link, request shape and tag

## 3. Page

- [x] 3.1 `components/project-platform/`: copy (EN/TR), server-only loader, view, styles; text-only cards without a cover (D8)
- [x] 3.2 Routes `app/[locale]/(project-platform)/{projects,projeler}/page.tsx`: static, metadata with canonical and hreflang
- [x] 3.3 Sitemap: each locale only when it has content (D9)

## 4. Verification

- [x] 4.1 `tests/project-platform/check-routes.mjs`: real production builds against a synthetic Strapi, empty and populated, covering every scenario in `specs/project-platform-page`
- [x] 4.2 `.github/workflows/tier-b-project-platform.yml` (unit tests + route check; path-filtered, not required)
- [x] 4.3 Teach the other Tier B synthetic servers the two new endpoints (D10)
- [x] 4.4 Local visual check (production build, Playwright) against a synthetic Strapi: 375, 768, 1024, 1440 px, both locales, no horizontal overflow
- [x] 4.5 Tier A steps locally; `npx @fission-ai/openspec@1.9.0 validate project-platform-page --strict`

**CI gates:** Tier A covers typecheck, lint, stylelint, the build and the weight budget. The
new Tier B project-platform workflow covers the mapper, the loader and the built routes. It
is not a required check. Nothing in CI checks the production Public permission; 7.1 does.

## 5. Documents

- [x] 5.1 `design/content-model.md`: the page exists and the Public role reads both types
- [x] 5.2 `design/brand.md`: the Turkish navigation label list
- [x] 5.3 `docs/ops/cms-runbook.md`: Public role permission and the end-year note
- [x] 5.4 `components/project-platform/README.md`

## 6. Review

- [ ] 6.1 Pull request opened; Tier A and Tier B green
- [ ] 6.2 Human code review

## 7. Before merge, in this order (production)

- [ ] 7.1 Super Admin grants the Public role `find` on Project Platform and `find` on Platform Project, nothing else; checks anonymous published reads answer 200 (or 404 for an unpublished single type) and anonymous `status=draft` reads answer 403
- [ ] 7.2 Redeploy the Vercel Preview; review `/en/projects` and `/tr/projeler` against real content at desktop and mobile widths
- [ ] 7.3 Merge; the production build succeeds and both pages render
