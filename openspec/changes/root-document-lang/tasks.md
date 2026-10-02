## 1. Root document

- [x] 1.1 Make `apps/web/app/[locale]/layout.tsx` the root layout with `<html lang={locale}>`,
  carrying over fonts, `globals.css`, site metadata, `SiteShell`, Analytics and Speed
  Insights. Remove `apps/web/app/layout.tsx` and the dead `apps/web/app/page.tsx` (D1, D2).
- [x] 1.2 Add `apps/web/app/global-not-found.tsx` and `experimental.globalNotFound`, with
  shared fonts in `apps/web/app/fonts.ts`, as a separate commit (D3, D4).

## 2. Verification

- [x] 2.1 Local, 2026-10-03: a production build with a local fake Strapi (no real CMS), then
  `next start`:
  - `/` → 307 `/en`;
  - `/en`, `/en/events`, `/en/schedule`, `/en/about` → 200 with `lang="en"`;
  - `/tr`, `/tr/etkinlikler`, `/tr/takvim`, `/tr/hakkimizda` → 200 with `lang="tr"`;
  - `/some-garbage`, `/tr/no-such-page`, `/en/missions/no-such-mission` → 404, `lang="en"`,
    a bilingual body, the Turkish block `lang="tr"`, `noindex`;
  - `/robots.txt` and `/sitemap.xml` → 200.

  The route table still prerenders `/en`, `/tr` and every localized route as SSG.
- [x] 2.2 Tier A locally: typecheck, lint, stylelint, reduced-motion, locale parity, budget
  tests, content, media and cms tests, a clean web build and `check:budgets` (home 143.5 KB
  of 160 KB). Also `tests/home/composition.test.mjs` 4/4 and the apps unit tests 240/240.
- [x] 2.3 **CI gate:** Tier A covers the build, the budgets and lint. **No existing CI gate
  asserts `<html lang>`**, so 2.1 is the evidence for this requirement. Add an assertion
  when `verification-browser-gates` lands rather than implying coverage now.
- [ ] 2.4 After merge, on production: `/` → 307 `/en`, `/en` with `lang="en"`, `/tr` with
  `lang="tr"`, and an unknown URL → 404 with the bilingual page.
