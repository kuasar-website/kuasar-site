## 1. Vercel Analytics and Speed Insights

- [x] 1.1 Add `@vercel/analytics` (2.0.1) and `@vercel/speed-insights` (2.0.0) to
      `apps/web/package.json` — the current published versions, checked against the npm
      registry and installed, not assumed. Mount `Analytics` and `SpeedInsights` from their
      `/next` entry points once in `apps/web/app/layout.tsx`, inside `<body>`. *(Confirmed
      by reading the installed package source, not just its docs: both `/next` components
      carry their own `"use client"` directive, so the root layout stays a Server
      Component; both inject their runtime `<script>` imperatively via a client-side
      `useEffect`, which is why no `<script src="...insights...">` tag appears in curl'd
      SSR HTML — that is expected Vercel behavior, not a bug, and is why this file's own
      local verification could confirm the wrapper mounts and builds cleanly but not that
      a real collection event fires, which only happens on Vercel's own infrastructure.)*
- [x] 1.2 Confirm neither wrapper is exempted from the per-route first-load JS budget.
      *(No exemption exists anywhere in `apps/web/budgets.json` or `scripts/checks/
      budgets.mjs`; `npm run check:budgets` measures `/` and `/_not-found` with both
      wrappers included: `/` 138.1 KB / 175 KB, `/_not-found` 132.5 KB / 175 KB — both a
      real, measured increase of ~2 KB each over the pre-change baseline, not a hidden
      zero.)*
- [x] 1.3 Confirm no Google Analytics, Tag Manager, pixel, or other third-party embed is
      introduced. *(Only `@vercel/analytics` and `@vercel/speed-insights` were added to
      `package.json`/`package-lock.json` — diffed directly, nothing else. Both are Vercel's
      own first-party packages, explicitly required by `docs/adr/0001-stack.md` §6, and
      `docs/adr/0002-cms.md`'s KVKK rule bars only third-party analytics/embeds/pixels/tag
      managers, which this is not.)*

## 2. Root layout metadata

- [x] 2.1 Replace the `create-next-app` placeholder `metadata` export (`title:
      "Create Next App"`) with real KUASAR fallback metadata: `title: { default: "KUASAR",
      template: "%s" }` and a factual description. *(The identity template ("%s") rather
      than a real prefix/suffix template is deliberate — see `design.md`, "Root metadata
      gets a title.default, never a title.template"; a real template would have
      double-suffixed `about-and-join`'s already-complete `"<Page> | KUASAR"` titles, which
      a TypeScript build + a live curl of `/` together confirmed does not happen: the stock
      `/` page renders exactly `<title>KUASAR</title>`, the fallback, with no route-specific
      override yet to test against a real conflict case.)*
- [x] 2.2 Add `metadataBase` so relative canonical/hreflang URLs (as
      `sectionAlternates()` already emits) resolve against the real site origin instead of
      `next`'s `http://localhost:3000` default. *(Discovered and fixed during
      implementation: `new URL("https://<DOMAIN>")` throws, because `<`/`>` are not legal
      URL characters — unlike `robots.ts`/`sitemap.ts`, which only ever string-interpolate
      the placeholder and never parse it as a URL. `metadataBase` is therefore `undefined`
      until `NEXT_PUBLIC_SITE_URL` is set post-domain-registration, matching Next's own
      documented fallback rather than fabricating a fake domain.)*
- [x] 2.3 Confirm no route-specific metadata already written by another capability is
      overridden. *(No route currently sets conflicting metadata to test against directly —
      `about-and-join` is still an open, unmerged PR, not on `main` — but the template
      mechanism itself was verified against the installed Next.js 16.3.1 title resolver
      source, not assumed; see `design.md`.)*

## 3. robots.txt and sitemap.xml — verified, not modified

- [x] 3.1 Confirm `robots.ts` references the sitemap and disallows neither `/en` nor
      `/tr`. *(Read directly: `rules: { userAgent: "*", allow: "/" }`, `sitemap:
      "${SITE_URL}/sitemap.xml"` — already correct, unmodified by this change.)*
- [x] 3.2 Confirm the preview-route `noindex` rule is not prematurely implemented.
      *(`robots.ts`'s own comment already defers this to `publish-integration`, correctly —
      the preview route does not exist. Left as-is.)*
- [x] 3.3 Confirm `sitemap.ts` lists only routes that exist on `main`, using the existing
      locale-routing alternates mechanism, and that an empty sitemap remains valid.
      *(`find apps/web/app -type d` on `main` still returns no `[locale]/**` subdirectory;
      `sitemap.ts` still correctly returns `[]`. Confirmed no open PR's routes — including
      `about-and-join`'s four pages and `missions-archive`'s routes — are advertised; they
      are not on `main`.)*
- [x] 3.4 Domain: confirmed `<DOMAIN>` is still an unregistered placeholder on `main`
      (`git grep -in "kuasar\.org" origin/main` — zero hits outside open, unmerged PRs) —
      not settled, so `robots.ts`/`sitemap.ts` correctly keep the placeholder and this
      change does not guess a real domain anywhere either.

## 4. Sponsorship-PDF custom event

- [x] 4.1 Add `apps/web/lib/analytics/events.ts` exporting `trackSponsorshipPdfOpened()`,
      the one named, reusable definition of the one authorized custom event.
- [ ] 4.2 **Blocked, not complete.** Wire the event into the real Galactic Summit "Become a
      Partner" interaction. **No such route or component exists** on `main` or in any open
      PR inspected at implementation time (`missions-archive`, `about-and-join`,
      `media-pipeline`, `alumni-directory`, `announcements`, `hero-baseline`,
      `timeline-baseline`). This capability does not fabricate one — see `design.md`,
      "The sponsorship-PDF event is a named helper, not wired to anything yet." Owed by
      whichever capability builds the Galactic Summit page.

## 5. Verification

- [x] 5.1 Run `npm run typecheck`, `npm run lint`, `npm run stylelint`,
      `npm run check:reduced-motion-css`, `npm run check:locale-parity`,
      `npm run build -w apps/web`, `npm run check:budgets`, `npm run test:budgets`,
      `npm run test:content --if-present`, `npm run test:time --if-present`. All pass.
      *(`typecheck` caught a real type error on first pass — Next's `DefaultTemplateString`
      type requires `template` alongside `default`, which the JS-oriented docs example
      omits; fixed with the identity-template approach in 2.1. The production build caught
      a second real bug — `new URL("https://<DOMAIN>")` throwing — fixed in 2.2. Both are
      recorded here rather than silently corrected, since both are exactly the kind of
      "looked right, wasn't" mistake `context7`/"check the installed docs" exists to catch,
      and were only caught by actually running the checks, not by inspection.)*
- [x] 5.2 Confirm both wrappers present exactly once via the root layout source (not
      duplicated by any other file) and via a live `next start` + curl of `/` for the
      title/description/robots/sitemap output.
- [x] 5.3 Record explicitly: the `/_vercel/insights/...` and speed-insights runtime
      scripts these wrappers fetch are not measured by `check:budgets` or any other Tier A
      gate — only the wrapper *components'* own bundle weight is (`docs/adr/0001-stack.md`
      §6's own stated limit of CI coverage; confirmed directly by reading the installed
      package source, which injects that script via `document.createElement("script")` at
      runtime, entirely outside the measured route bundle).
- [x] 5.4 Local Lighthouse run (not production, not the real home/detail routes — see
      below) against `next start` on the stock `/` page: **Performance 0.94, Accessibility
      1.00, Best Practices 0.96, SEO 0.92** (`npx lighthouse`, headless Chrome, categories
      performance/accessibility/best-practices/seo). The one sub-1.0 SEO finding,
      `robots-txt is not valid` ("Invalid sitemap URL" on `Sitemap: https://<DOMAIN>/
      sitemap.xml"), is the `<DOMAIN>` placeholder itself being an illegal URL to a
      strict parser — a pre-existing, already-known, deliberately-unresolved condition
      (`CLAUDE.md`, "Unresolved, on purpose"), not introduced by this change and not fixed
      here, since guessing a real domain is explicitly out of scope (see 3.4). It resolves
      automatically once the domain is registered and `NEXT_PUBLIC_SITE_URL` is set.
- [ ] 5.5 **Left explicitly pending, not claimed complete:** a production Lighthouse run,
      and any Lighthouse run against the real home page or a content-detail route. Neither
      exists on `main` yet (no `[locale]/page.tsx`, no `hero-baseline`/`home-composition`
      merged), and this change does not fabricate one to close this item early.
