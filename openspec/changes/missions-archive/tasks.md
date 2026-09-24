## 1. Upstream gate and static baseline

- [ ] 1.1 Wait for PR #16 (`git-content-pipeline`) and PR #18 (`site-shell`) to merge;
      update this branch from `origin/main` and confirm their final APIs match this design.
      Do not copy either open feature branch or begin implementation before this gate.
- [ ] 1.2 Re-read the installed Next.js 16.3.1 dynamic-route,
      `generateStaticParams`, metadata, and Image documentation before coding route APIs.
- [ ] 1.3 Establish the unanimated baseline first: mission routes/components import no
      animation library, compute no server-relative time, and remain fully usable with
      hover, transforms, and JavaScript absent.

## 2. Mission view model and safe prose

- [ ] 2.1 Add server-only mission model helpers for deterministic newest-first sorting,
      localized archive/detail paths, per-locale view models, slug lookup, and
      locale-aware fact formatting without duplicating loader records.
- [ ] 2.2 Add a dependency-free Markdown-subset parser for the raw mission body covering
      headings, paragraphs, lists, inline emphasis/links, and images; reject raw HTML,
      imports/exports, JSX, and unsupported constructs with mission/locale context.
- [ ] 2.3 Parse the localized Gallery/Galeri section into image alternatives and validate
      an exact one-to-one match with `facts.gallery` in both locales; reject missing,
      empty, duplicate, extra, or unmatched paths at build time.
- [ ] 2.4 Add focused Node tests for zero/one/fifty sorting, localized paths and lookup,
      null/known apogee formatting, safe prose nodes, unsupported MDX rejection, and
      gallery-alt parity in English and Turkish.

## 3. Archive and detail components

- [ ] 3.1 Build the archive as a semantic vertical history rather than a generic grid:
      patch links are the main affordance, one mission centres, fifty remain readable,
      and the reusable composed section returns `null` for zero missions.
- [ ] 3.2 Build localized fact labels and definition-list values for year, type, lifecycle
      status, competition, launch date, and apogee; render null apogee explicitly as
      unconfirmed in both locales.
- [ ] 3.3 Render launch dates through the existing `DateTime` neutral-server/client-state
      contract only; do not add a new clock, filter, animation, cron, or revalidation.
- [ ] 3.4 Build detail prose, optional gallery, external links, and team-role sections;
      omit empty optional sections without empty headings and give every link a visible
      focus state.
- [ ] 3.5 Add the visible localized `status: incomplete` notice and link to the matching
      complete-locale mission route without redirecting or hiding available prose.
- [ ] 3.6 Add the optional fine-pointer L3 patch feedback only after the static baseline:
      CSS tokens only, no transform on touch or reduced motion, and no animation-library
      import.

## 4. Static routes and discovery metadata

- [ ] 4.1 Add the localized dynamic section route under
      `app/[locale]/(missions)/[section]/`, generating only `missions`/`gorevler` from the
      shared segment map with `dynamicParams = false`.
- [ ] 4.2 Add the archive page in both locales, including a localized honest empty state
      when no mission records exist.
- [ ] 4.3 Add the detail route generator from every mission's locale-specific slug with
      `dynamicParams = false`, defensive `notFound()`, and no request-path fetch.
- [ ] 4.4 Generate archive canonical/alternates from the localization helper and detail
      canonical/`hreflang`/`x-default` from the matched mission's two localized slugs.
- [ ] 4.5 Hand the newly published fixed and dynamic mission routes to Dev 3 for inclusion
      in their owned `app/sitemap.ts`; do not cross that file-zone boundary silently.

## 5. Verification and handoff

- [ ] 5.1 With temporary, uncommitted content fixtures, verify zero, one, and fifty
      missions in both locales; confirm adding one mission touches only `index.json`,
      `en.mdx`, and `tr.mdx`, never code.
- [ ] 5.2 Verify a mission with different locale slugs switches exactly in both directions,
      emits correct canonical/alternates, and rejects unknown section/slug routes.
- [ ] 5.3 Verify `status: incomplete`, null apogee, empty optional collections, and fully
      populated detail content in English and Turkish.
- [ ] 5.4 At narrow/mobile and desktop widths, verify archive readability, centred-one
      layout, fifty-entry flow, gallery responsiveness, no truncation/overlap/horizontal
      overflow, and useful localized image alternatives.
- [ ] 5.5 Run axe-core on both archive routes and one representative detail route per
      locale; keyboard-check focus order and patch affordances. Tier A does not currently
      cover route-wide axe, so record this as manual evidence rather than implying CI does.
- [ ] 5.6 Verify no-JavaScript server HTML keeps every date visible and neutral, then run
      the existing Tier B time-state suite for hydrated browser behavior.
- [ ] 5.7 Run typecheck, ESLint, Stylelint, reduced-motion CSS, locale parity, content tests,
      production build, import-graph/first-load budget checks, and strict OpenSpec
      validation; mission routes must stay ≤175 KB with 0 KB deferred animation.
- [ ] 5.8 Remove all temporary fixtures/proof artifacts, confirm only Dev 2's assigned
      mission paths and this OpenSpec change remain, then push a separate review PR without
      merging it.
