## Why

Nothing user-facing can be built yet: there is no locale prefix, no localized URL
segment, no redirect from `/`, and no language switcher. Every section change
downstream (missions, news, alumni, timeline, and so on) needs a route shape to
build into, so this has to land before anyone hard-codes a path in a component.

## What Changes

- Add path-prefixed locale routing under `app/[locale]/`, for exactly `en` (default)
  and `tr`.
- Add the localized URL segment map from `design/i18n.md` as the single source of
  truth, read by both the language switcher and `sitemap.ts`. An entry with no
  backing page (see `projects`/`projeler` below) is excluded from generated output
  until it is resolved.
- Add a fixed `307` redirect from `/` to `/en/` (never `301`/`308` — see
  `design/i18n.md` for why a permanent redirect can't be undone). No internal
  link is added that points at bare `/` — the redirect exists for incoming
  traffic, not in-app navigation.
- Add the route-resolution contract behind the language switcher — the segment
  map, path resolution, and the per-entity slug-or-absence input, consumed by
  Dev 2's shell component — covering the two failure modes `design/i18n.md`
  documents as distinct: no equivalent page at all (resolve to the target
  locale's home page with a reason the consuming UI renders as a notice, never
  a 404) versus a missing target-locale slug on CMS-backed content (fall back
  to the default locale's slug for that same entity, per `design/i18n.md` and
  `design/content-model.md`). This proposal does not implement the switcher's
  visible markup.
- Add `hreflang` alternates (both locales plus `x-default` → `/en/`) and a
  self-referential `canonical` on every page, in both locales.
- Add `sitemap.ts` and `robots.ts` emitting `alternates.languages` for every
  resolved route in both locales. The preview route's `noindex` requirement
  (`design/i18n.md`, `docs/adr/0002-cms.md`) is explicitly deferred — the
  preview route doesn't exist until `publish-integration` ships — rather than
  silently dropped.

Out of scope, by design, and owned by other capabilities:
- Page content and MDX loading from `content/` — that's `git-content-pipeline`.
- The three error-page cases (known-locale 404/500, locale-less fallback) — that's
  `i18n-hardening`.

## Capabilities

### New Capabilities
- `localization`: path-prefixed locale routing, the localized segment map, the
  fixed `/` → `/en/` redirect, the language switcher and its two distinct
  failure modes, `hreflang`/canonical/sitemap emission.

### Modified Capabilities
(none — `platform-foundation` and `verification-gates` are unaffected at the
requirement level; this change only adds new routes and files under the
workspace they scaffolded)

## Impact

- **Audience served:** Neither sponsors nor prospective members directly — this is
  foundational routing infrastructure. It serves credibility: a site where the
  Turkish and English versions are not equally reachable, or where a redirect is
  wrong in a way that can't be undone, undermines the exact bilingual promise the
  site is built on. Both audiences depend on it indirectly to reach content in
  their own language.
- **New runtime dependency:** none. This is native Next.js App Router routing
  (`app/[locale]/` segments, `sitemap.ts`, `robots.ts`) — no i18n library, no
  middleware. `design/i18n.md` explicitly rejects `Accept-Language` sniffing and
  the middleware it would require. The exact Next.js API surface is verified
  against whatever is actually installed (`apps/web/package.json` pins
  `16.3.1`) at implementation time, not assumed from this proposal.
- **Content storage:** no content entities are added or moved by this change. It
  does not touch the git/Strapi split — it only fixes the URL shape that
  `git-content-pipeline` and every Strapi-backed section will render into.
- **Affected code:** `apps/web/lib/i18n/**` (the segment map and the
  route-resolution helpers), `apps/web/app/sitemap.ts`, and
  `apps/web/app/robots.ts`. This proposal does **not** create
  `app/[locale]/layout.tsx`, `(news)/`, `(alumni)/`, or any other section's
  route implementation. `app/[locale]/layout.tsx` is Dev 2 (INCO)'s
  `site-shell` capability's file per `docs/task-assignments.html` — it hosts
  the nav, footer, wordmark, and the switcher's home, and `site-shell` is
  explicitly *blocked by* `locale-routing`, meaning this capability's job is
  to finish its exports (the `LOCALES` list, the segment map, the switcher's
  resolution contract) so `site-shell` can build that file afterward, not to
  build it here. `announcements`, `alumni-directory`, and every other section
  are separate, later capabilities that may adopt the resolution pattern this
  change defines, in their own proposals. The switcher's visible markup lives
  in Dev 2's shell (`components/shell/`), not here — this is a
  boundary/handoff, not shared ownership: locale-routing supplies the
  route-resolution contract (the segment map, `resolveSegment`,
  `resolveSectionSwitch`/`resolveEntitySwitch`, and `sectionAlternates`), and
  Dev 2's shell and layout consume it. This proposal does not implement or
  edit `site-shell`.
- **Integration dependency, Dev 1 — `next.config.ts`, kept to a minimum:**
  `apps/web/next.config.ts` is Dev 1 (BOOSTER)'s file. Locale-routing requires
  at most the single `/` → `/en/` redirect there. This proposal does **not**
  modify that file — the redirect is a pending, coordinated addition to be
  made with Dev 1, not something this change performs unilaterally. How
  individual sections get fully localized segments (e.g. `/tr/gorevler`) is
  recorded as an architectural decision in `design.md`, scoped to stay within
  files Dev 3 already owns — no generated routing or rewrites logic is added
  to `next.config.ts` by this change, and it does not mandate a folder-naming
  convention on any other capability's owned route group.
- **Integration dependency, Dev 2 — `app/[locale]/layout.tsx`:** per
  `docs/task-assignments.html`, that file belongs to Dev 2's `site-shell`
  capability, not to `locale-routing`. This proposal supplies the data and
  contracts `site-shell` needs (see "Affected code" above) and specifies, in
  `design.md`, the requirement `site-shell` must implement there
  (`generateStaticParams` over `LOCALES`, `dynamicParams = false`) — it does
  not implement that file itself.
- **`projects`/`projeler` — unresolved, and handled as unresolved:**
  `design/i18n.md`'s segment map lists `projects | projeler`, and no Project
  entity exists anywhere in `design/content-model.md`. This proposal does
  **not** invent one, and does **not** ship that entry as a live route,
  sitemap entry, or switcher destination. The segment map data carries the
  entry with an explicit "unresolved" marker that both the sitemap generator
  and the switcher skip, so the map keeps recording the open question without
  producing a route that 404s. Resolving what it actually maps to remains a
  separate, tracked decision.
