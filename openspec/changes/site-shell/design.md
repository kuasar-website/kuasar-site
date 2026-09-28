## Context

`locale-routing` now owns the canonical locale codes, localized section segments, and
switch-resolution outcomes, while `design-tokens` owns the visual primitives. No shared
layout consumes those contracts yet. The only current App Router root layout is
`app/layout.tsx`; the task's write boundary assigns this change the nested
`app/[locale]/layout.tsx` and `components/shell/**`, not the root document or any page.

This shell therefore has to be usable before any locale page capability exists, remain
static by default, and avoid taking ownership of another developer's routes or content.
The behavior is based on `design/brand.md`, `design/i18n.md`, ADR 0001, and ADR 0004.

## Goals / Non-Goals

**Goals:**
- Supply the bilingual skip-link/header/nav/main/footer frame for all future locale pages.
- Consume, rather than duplicate, the locale-routing segment map.
- Preserve the committed wordmark's geometry, inherited colour, minimum size, and clear
  space in a reusable component.
- Make locale switching safe for home, section, and future detail routes without guessing
  localized entity slugs.
- Keep keyboard order, landmarks, and responsive Turkish labels correct before downstream
  pages begin using the shell.

**Non-Goals:**
- Publishing `/en/`, `/tr/`, or any section/detail page; those belong to later page
  capabilities.
- Editing the root layout, the public wordmark asset, locale-routing helpers,
  `next.config.ts`, sitemap, robots, or other developers' file zones.
- Adding CMS data, contact details, external URLs, analytics, a mobile-menu state system,
  or route-specific page content.

## Decisions

**The locale layout is a nested layout, not a second document root.**
`app/[locale]/layout.tsx` exports `generateStaticParams()` from `LOCALES` and
`dynamicParams = false`. Because `app/layout.tsx` already owns `<html>` and `<body>`, the
nested layout wraps its complete subtree in `lang={locale}` instead of emitting invalid
nested document elements. The wrapper language overrides the root's default English for
all Turkish shell and page content while staying inside this task's file boundary.

**The shell is server-first; only route observation and query notice handling are client
code.** Navigation, footer, wordmark, landmarks, and localized copy render as Server
Components. The small language switcher reads `usePathname`, and the unavailable notice
reads the URL query. This is the minimum client surface required by a shared layout that
does not receive the child page's pathname or search parameters.

**Navigation uses one always-visible responsive list, not a JavaScript drawer.** On narrow
screens the list becomes a one- or two-column grid; on wide screens it becomes a wrapped
row. Each link is `white-space: nowrap`, so the label itself never wraps or truncates,
while the list can still reflow. This keeps visual and keyboard order identical and avoids
adding menu state, hidden focusable controls, or motion.

**Navigation destinations are data-driven but labels are shell UI copy.** Section hrefs
come from `sectionPath()` and therefore use the existing segment map. The eight published
navigation concepts are About, Schedule, Galactic Summit, Missions, Events, Alumni, Join,
and News. Timeline is intentionally omitted by assignment; Projects is omitted because
the segment map marks it unresolved. English and Turkish UI labels live together in the
shell and both use Inter unconditionally.

**The wordmark is inline artwork copied byte-for-byte at the path-data level.** An external
`<img>` cannot inherit the parent document's `currentColor`, so it risks the exact invisible
black-logo failure the brand rules warn about. The component repeats the committed SVG's
unchanged `viewBox` and path data using React attribute names, with every colour still
`currentColor`; the source asset remains untouched. The surrounding home link supplies
the accessible name, so the duplicated decorative SVG is hidden from assistive technology.
At a fixed 120 px artwork width, layout padding is 33.6 px on all sides: exactly 0.28 times
the rendered width and therefore easy to verify rather than approximate through a fluid
calculation.

**Home and section switches resolve synchronously; detail switches trust discovery
metadata.** The client switcher recognizes the current locale and the shared resolved
section map. Home maps to the other locale home, and a section index calls
`resolveSectionSwitch()`. A detail path uses the page's existing
`link[rel="alternate"][hreflang]` metadata after hydration, because only the owning page
knows the entity's per-locale slug. If that alternate is absent, the safe target is
`/{locale}/?notice=unavailable`; the shell displays a localized status notice when that
query is present. Guessing or mechanically copying a slug was rejected because it can
produce a 404 and violates `design/i18n.md`.

**No animation is introduced.** Motion tier: none. The shell contains no animation or
transition, so reduced-motion behavior is the same as the baseline and no animation
library is reachable from its imports.

**Route JavaScript impact is deliberately narrow and measured.** Only the switcher and
unavailable-notice helpers cross the client boundary; the rest stays server-rendered.
The production build and budget checker measure the resulting shared first-load cost
before review. No runtime dependency is added.

**CMS field and locale specificity:** none. The shell neither adds nor reads a Strapi
field. Its localized strings are interface labels, and entity availability remains the
responsibility of each CMS- or git-backed page capability through discovery metadata.

## Risks / Trade-offs

**The document's root `<html lang>` remains `en` while a Turkish nested subtree declares
`lang="tr"`.** This follows valid App Router nesting and the task's explicit file boundary,
but browser chrome may still use the root language for document-level heuristics.
Mitigation: every Turkish shell and child node inherits the nearer `tr`; changing the root
document architecture is a separate coordinated change rather than an unauthorized edit.

**Detail-route alternates become exact only after hydration.** Before then the link is the
safe target-locale home with a visible notice. Mitigation: the switcher never guesses a
slug or produces a 404, and page discovery metadata replaces the fallback immediately
after hydration when an equivalent exists.

**The inline component duplicates SVG path data.** That creates a synchronization point
with the public asset. Mitigation: verification compares the `d` attributes and rejects
literal colours; the duplication is chosen specifically because external SVG images do
not inherit `currentColor`.

**The always-visible mobile navigation is taller than a collapsed menu.** This costs
vertical space in exchange for zero menu JavaScript, no hidden focus states, and identical
visual/keyboard order. The shell is navigation infrastructure rather than page content,
so reliability is the preferred trade-off.

## Migration Plan

Add the shell and locale layout without publishing a route. Verify them on a temporary
local `[locale]/page.tsx`, then remove that proof page before commit. Downstream page
capabilities can subsequently add their own pages and inherit the shell without changing
their content contracts. Reverting this change removes only the nested layout, shell
components, and its OpenSpec artifacts; it does not alter routing data or content.

## Open Questions

- Whether the root document should derive `<html lang>` from the route requires ownership
  of `app/layout.tsx` and is intentionally left for a coordinated i18n-hardening change.
