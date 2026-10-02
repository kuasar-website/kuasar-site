## Why

Every Turkish page ships `<html lang="en">`. `apps/web/app/layout.tsx` was the only root
layout and hardcoded `lang="en"`; it receives no route params, so it could not know the
locale. `site-shell` worked around this by putting `lang={locale}` on its own wrapper and
left the document root as an Open Question "for a coordinated i18n-hardening change"
(`openspec/changes/site-shell/design.md`). That change is this one.

The document language is what screen readers use to choose a voice and pronunciation, and
what search engines and browsers (translation prompts, hyphenation) read first. A Turkish
page announced as English contradicts `design/i18n.md`: both languages are first-class.
Found live on 2026-10-03, the day before launch, right after the `/en` and `/tr` home
pages went live (#41).

**Audience:** both, through credibility. Turkish-speaking prospective members and
sponsors get a correctly announced Turkish site.

## What Changes

- `apps/web/app/[locale]/layout.tsx` becomes the **root layout** and renders
  `<html lang={locale}>`. It takes over the fonts, `globals.css`, site-wide metadata,
  Analytics and Speed Insights from `app/layout.tsx`, which is removed. This is the
  Next.js 16 internationalization pattern. `generateStaticParams` and
  `dynamicParams = false` are unchanged, so every route stays statically prerendered.
- The dead create-next-app `apps/web/app/page.tsx` is removed. With no `app/layout.tsx` it
  cannot build, and `/` never renders a page: `next.config.ts` redirects it to `/en` (307),
  unchanged.
- `apps/web/app/global-not-found.tsx` (enabled by `experimental.globalNotFound` in
  `next.config.ts`) serves any URL no locale route matches. Without it those 404s would
  fall back to Next's bare built-in document, with no `lang`, fonts or styles. It shows
  both languages, each tagged with its own `lang`, and links to both home pages.
- `apps/web/app/fonts.ts` holds the shared `next/font` instances for both documents.

No content, CMS, Strapi field, motion, route or URL changes. **No new runtime
dependency.** One experimental Next.js flag (`globalNotFound`) is enabled; see design.md.

## Impact

- `apps/web/app/`: `layout.tsx` and `page.tsx` removed; `[locale]/layout.tsx` rewritten;
  `global-not-found.tsx` and `fonts.ts` added; `next.config.ts` gains one flag.
- Owner components (`SiteShell` and all page sections) are untouched. `SiteShell` keeps its
  own `lang={locale}` wrapper, which now repeats the document language harmlessly.
