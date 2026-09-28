## 1. Segment map data

- [x] 1.1 Create `apps/web/lib/i18n/segments.ts` encoding the localized URL
      segment table from `design/i18n.md` (`about/hakkimizda`,
      `schedule/takvim`, `galactic-summit/galactic-summit`,
      `missions/gorevler`, `events/etkinlikler`, `alumni/mezunlar`,
      `join/bize-katil`, `timeline/zaman-cizelgesi`, `news/duyurular`), keyed
      by section, with `en`/`tr` segments. Mark `projects`/`projeler` as an
      explicit `unresolved` entry (no backing entity exists in
      `design/content-model.md`) rather than a normal resolved one.
- [x] 1.2 Add `resolveSegment(sectionKey, locale)`, reading `segments.ts`,
      as the single reusable primitive for turning a section key into its
      localized segment string. Add a `resolvedSegments()` (or equivalent)
      accessor that filters out entries marked `unresolved` — this is what
      the sitemap and the switcher's section-level resolution both use, so
      there is no second copy of "which sections are live" anywhere.

## 2. Handoff to Dev 2 (`site-shell`) and reusable pattern documentation

`app/[locale]/layout.tsx` is Dev 2 (INCO)'s `site-shell` file, not Dev 3's —
confirmed against `docs/task-assignments.html`, which lists it under
`site-shell`'s "Writes" line and states `site-shell` is *blocked by*
`locale-routing`. The two tasks originally planned here (create that layout,
set `<html lang>`) have been removed from this checklist rather than left
unchecked, because they are not this capability's work to do. What remains is
locale-routing's actual obligation: supply the data and the specified
requirement `site-shell` needs.

- [x] 2.1 Specify, in `design.md` ("Unmatched locale prefixes reaching the
      root 404 is a requirement on `site-shell`, not a mechanism this
      capability builds"), the `app/[locale]/layout.tsx` requirement Dev 2
      must implement: `generateStaticParams` returning `LOCALES`
      (`en`, `tr`) and `export const dynamicParams = false`.
- [x] 2.2 Export `LOCALES` from `segments.ts` — the data `site-shell` needs
      to satisfy that requirement.
- [x] 2.3 Document the per-locale dynamic-segment resolution pattern
      (`design.md`'s illustrative `[segment]` + per-parent
      `generateStaticParams` pattern) as a short comment or note alongside
      `segments.ts`, for whichever capability (`announcements`,
      `alumni-directory`, `site-shell`, or any other) chooses to adopt it
      later. Do not create any section's route folder or
      `app/[locale]/layout.tsx` as part of this task — both are out of scope
      for this change.

## 3. Root redirect only (next.config.ts)

- [ ] 3.1 Add a single `redirects()` entry to `apps/web/next.config.ts`:
      `/` → `/en/`, `permanent: false` (307), never `permanent: true`. This
      is the only change this capability makes to that file — no rewrites,
      no other routing logic. Coordinate this edit with Dev 1 (BOOSTER), who
      owns the file, before merging.

## 4. Language-switcher resolution contract

- [x] 4.1 Implement the resolution function in `apps/web/lib/i18n/` that
      returns one of three structured outcomes, matching
      `specs/localization/spec.md`:
      - `{ kind: 'available', path }` — a target-locale slug/segment exists.
      - `{ kind: 'available', path }`, resolved via the entity's
        **default-locale** slug — CMS-backed content that has a translation
        in the target locale but no recorded slug there.
      - `{ kind: 'unavailable', homePath, reason }` — no equivalent content
        exists in the target locale at all.
- [x] 4.2 Section-level resolution: use `resolveSegment`/`resolvedSegments`
      to compute the equivalent path for the current section in the other
      locale; an unresolved section (e.g. `projects`) never produces a
      switcher target.
- [x] 4.3 Entity-level resolution: accept, from the calling page, whether a
      target-locale slug exists, whether a default-locale fallback slug is
      available (CMS-backed content only), or neither — and branch to the
      matching outcome above. This function does not look up entity data
      itself; the calling capability supplies the answer.
- [x] 4.4 Confirm the `{ kind: 'unavailable', ... }` outcome never applies
      to git-resident content — CI guarantees a slug in both locales there,
      so this path is only reachable for CMS-backed content.
- [x] 4.5 Export the resolution function and its result types from
      `apps/web/lib/i18n/` for Dev 2's shell (and any other consumer) to
      import. Do not implement or edit the switcher's visible markup, the
      "unavailable" notice UI, `components/shell/`, or `app/[locale]/page.tsx`
      — none of those are built or edited as part of this change.

## 5. Discovery metadata

- [x] 5.1 Add `hreflang` alternates for both locales plus `x-default` →
      the `/en/` equivalent, and a self-referential `canonical`, via each
      page's `alternates` metadata, sourced from `segments.ts`. Verify this
      on both an English and a Turkish page — `x-default` stays pointed at
      the `/en/` URL on the Turkish page too, and `canonical` is
      self-referential to whichever locale is actually rendering.
- [x] 5.2 Add `apps/web/app/sitemap.ts` emitting `alternates.languages` for
      every **published** route in both locales — corrected from an earlier
      version that iterated every *resolved* segment-map entry regardless of
      whether a page existed (see `design.md`, "A published route, not a
      resolved segment, is what the sitemap advertises"). Since no section
      route exists anywhere in the repo yet, it currently returns an empty
      list — a valid, spec-covered state, not a placeholder to silently
      forget. Whichever capability publishes a section's route is
      responsible for adding its entry here; not tracked automatically.
- [x] 5.3 Add `apps/web/app/robots.ts` referencing the sitemap, and confirm
      it does not disallow crawling `/en/` or `/tr/`. Note in a comment (or
      the pull request) that the preview route's `noindex` requirement
      (`design/i18n.md`; `docs/adr/0002-cms.md`) is explicitly deferred to
      `publish-integration`, since the preview route doesn't exist yet — not
      implemented here.

## 6. Verification

- [ ] 6.1 End-to-end (blocked): verify the redirect once it is added to
      `next.config.ts` (task 3.1, pending Dev 1 coordination) and deployed:
      `curl -sI https://<DOMAIN>/ | grep -iE '^(HTTP|location)'` — expect
      `307` and `location: /en/` (per `design/i18n.md`).
- [x] 6.2a Library-level: verified programmatically that
      `resolveSectionSwitch('missions', 'tr')` returns `{ kind: 'available',
      path: '/tr/gorevler' }` and `resolveSectionSwitch('missions', 'en')`
      returns `{ kind: 'available', path: '/en/missions' }` — bidirectional,
      neither result is a home path.
- [ ] 6.2b End-to-end (blocked): requires Dev 2's `site-shell` switcher UI
      and a real `/en/missions`/`/tr/gorevler` route — neither exists yet.
- [x] 6.3a Library-level: verified programmatically that
      `resolveEntitySwitch` resolves an entity detail page through its
      per-locale slug in both directions (English → Turkish and Turkish →
      English), never through either locale's home page.
- [ ] 6.3b End-to-end (blocked): requires a real entity detail page (e.g. a
      mission, owned by a not-yet-proposed capability) and `site-shell`'s
      switcher UI to click through — neither exists yet.
- [x] 6.4a Library-level: verified programmatically that
      `resolveEntitySwitch(section, locale, { hasEquivalent: false })`
      returns `{ kind: 'unavailable', homePath, reason:
      'no-equivalent-content' }`, never a path.
- [ ] 6.4b End-to-end (blocked): requires a consuming UI to render this
      outcome as a visible notice — not built by this capability; belongs to
      whichever surface (Dev 2's shell, or `i18n-hardening`) ends up owning
      that rendering.
- [x] 6.5a Library-level: verified programmatically that the CMS
      default-locale-slug fallback (`targetSlug: null`,
      `defaultLocaleSlug` set) returns `{ kind: 'available', path }`
      addressed by the default locale's slug — a distinguishable outcome
      from 6.4a's `unavailable`, confirmed by direct comparison.
- [ ] 6.5b End-to-end (blocked): requires a real CMS-backed entity (e.g. an
      announcement) in this exact translation state — `announcements` hasn't
      been proposed yet.
- [x] 6.6 Manually verify the unresolved `projects`/`projeler` entry: it
      produces no switcher target and no sitemap entry, while remaining
      present in `segments.ts` as a recorded open question. Verified: a
      production build's generated `sitemap.xml` contains 9 of the 10
      section entries with `projects` absent; `resolveSegment`/
      `resolveSectionSwitch` both throw on it.
- [x] 6.7 Confirm no internal link or navigation element added by this
      change targets the bare `/` — only external/incoming requests hit the
      redirect. Satisfied vacuously: this change adds no page, component, or
      link anywhere; there is nothing in it that could target `/`.
- [x] 6.8 Confirm Tier A (typecheck, lint, the import-graph rule, first-load
      JS budget) passes with the new files added. Verified:
      `npm run typecheck`, `npm run lint`, `npm run build -w apps/web`, and
      `npm run check:budgets` (136.0 KB / 175.0 KB on `/`) all pass against
      everything currently in this branch (`segments.ts`, `switcher.ts`,
      `metadata.ts`, `sitemap.ts`, `robots.ts`). Does not yet cover the
      pending `next.config.ts` redirect (task 3.1) or `app/[locale]/layout.tsx`
      — see report: the latter is Dev 2's file, not built by this change.
- [ ] 6.9 Note in the pull request that **no existing CI gate covers this
      change's core behavior**: Tier A's `check:locale-parity` script only
      asserts `content/**` locale-file pairs and slugs — it does not check
      the segment map, the redirect's status code, hreflang/canonical
      output, or the switcher's resolution outcomes. The `6.*b` end-to-end
      steps above stay manual per `docs/workflow.html` §10 ("What CI cannot
      see") until a browser-based check is proposed as its own change.
- [x] 6.10 Corrected and verified: the generated `sitemap.xml` now contains
      zero `<url>` entries — confirmed by building and inspecting
      `.next/server/app/sitemap.xml.body` directly. `find apps/web/app -type d`
      still returns no subdirectories, matching the empty sitemap exactly
      (no published route, no entry). `robots.txt` still correctly
      references the (now-empty) sitemap and allows both locale prefixes.
      The forward-looking obligation (add an entry when a route publishes)
      is recorded in `design.md`, not tracked by any automated check —
      pending the team ratifying who owns that step (see `design.md`).
