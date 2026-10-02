## Context

- Next.js 16.3.1 renders `<html>` only in a **root layout**: the top-most `layout` with none
  above it. The installed docs allow it under a dynamic segment "when implementing
  internationalization with `app/[lang]/layout.js`"
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`), and
  the i18n guide's static-rendering example is exactly `app/[lang]/layout.tsx` with
  `generateStaticParams` and `<html lang={(await params).lang}>`
  (`…/01-app/02-guides/internationalization.md`).
- `site-shell` chose a nested layout because `app/layout.tsx` already owned `<html>`, and
  recorded the root `lang` as an open question (its design.md, Risks and Open Questions).
- Routing rules are unchanged: `design/i18n.md` and `next.config.ts` (`/` → 307 `/en`).

## Decisions

### D1. The `[locale]` layout is the root layout

`app/[locale]/layout.tsx` renders `<html lang={locale}>` and `<body>`, with `SiteShell`,
Analytics and Speed Insights inside `<body>` in the same order as before. `app/layout.tsx`
is deleted; keeping it would keep it as the root, so `<html>` could only ever carry one
language. Rejected alternatives:

- **Client-side `document.documentElement.lang`:** the server HTML stays wrong, and
  crawlers and first paint read the server HTML.
- **Reading the locale from headers or middleware:** makes every route dynamic, which
  `docs/adr/0001-stack.md`'s static-first rule forbids.
- **`next/root-params` in `app/layout.tsx`:** still needs the root layout under the
  segment to be a root param, so it isn't smaller.

### D2. Remove the dead root page

`app/page.tsx` was the create-next-app template. A page with no root layout above it
cannot build, and `/` is answered by the `next.config.ts` redirect before any page
renders, so the template has never been served.

### D3. A global 404 document (experimental flag)

With the root layout under `[locale]`, a URL that matches no locale route has no layout to
render in. `dynamicParams = false` sends unknown locales and unknown slugs there too. Next
then uses its bare built-in document, with no `lang`, fonts or global styles, whereas
production today serves that 404 inside the old root layout with `lang="en"`.
`app/global-not-found.tsx` is the documented remedy for "your root layout is defined using
top-level dynamic segments" (`…/03-file-conventions/not-found.md`). It needs
`experimental.globalNotFound`, which has been experimental since v15.4 and is present in
16.3.1's config schema. It is a **separate commit**: reverting it leaves D1 intact and only
returns 404s to Next's built-in page.

- No locale is known, so it shows both languages (`design/i18n.md`, "404 and 500
  pages"), the Turkish block tagged `lang="tr"`, with the document default `en` (the
  `x-default` locale). Next keeps the 404 status and adds `noindex` itself.
- Its links are plain `<a>`. Leaving this document is a full page load anyway ("navigating
  across multiple root layouts will cause a full page load", layout.md), and importing
  `next/link` here measured **+3.4 KB first-load JS on every route**.

A per-locale `app/[locale]/not-found.tsx` was tried and dropped: with
`dynamicParams = false`, unknown paths never reach a page, so it was never rendered.

### D4. Shared fonts

`next/font` must be called at module scope. `app/fonts.ts` exports the Inter and Orbitron
instances (unchanged options), so both documents use one definition.

## Risks / Trade-offs

- **Experimental flag (D3).** If a Next.js upgrade changes `globalNotFound`, the build or
  the 404 is what breaks, never a content page. Check it on each Next upgrade.
- **Locale-less 404 is not localized beyond both languages.** That's intended:
  `design/i18n.md` requires both languages on that page.

## Motion, first-load JS and Strapi

- **Motion:** none.
- **First-load JS**, measured locally with `npm run check:budgets` against a local build of
  `main`: home 143.6 → 143.5 KB of 160 KB; every other route 0.1–0.2 KB lower;
  `/_not-found` 132.7 → 130.7 KB. No import reaches an animation library.
- **Strapi:** no new field and no fetch; the 404 never fetches Strapi.
