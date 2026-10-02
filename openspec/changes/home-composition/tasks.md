## 1. Preconditions and plan

- [x] 1.1 Confirm every blocking section change is merged into `main`, including PR #36,
      and create `change/home-composition` from that merge.
- [x] 1.2 Read the installed Next.js 16.3.1 page and Server Component documentation and
      confirm promise-valued params and server-only composition.
- [x] 1.3 Confirm the owner handoffs and exclusions: hero, timeline, missions and events
      are home-ready; Schedule and Galactic Summit explicitly exclude home sections.

## 2. Static bilingual composition

- [x] 2.1 Add `app/[locale]/page.tsx` as a static Server Component with defensive locale
      validation and localized canonical/alternate metadata.
- [x] 2.2 Compose `HomeHero`, `TimelineSection`, `MissionArchiveSection` and
      `EventsSection` in the agreed order without changing owner files.
- [x] 2.3 Supply `FORM_LINKS.connect`, preserve one primary CTA, and add the token-based
      empty-safe Timeline rhythm wrapper.

## 3. Verification

- [x] 3.1 Add a focused composition test proving the route remains server-only, imports
      owner handoffs, uses the verified form contract, retains order and spacing tokens,
      and defines bilingual discovery metadata.
- [x] 3.2 Run the owner collection suites that cover zero, one and many; run real
      production-route fixtures so populated Timeline and Events also pass the home
      budget. Record that mission cardinality is owner-tested if no production fixture
      exists.
      - **Evidence (2026-10-02):** Timeline and Events owner tests pass at zero, one and
        fifty. Their production-route fixtures rebuild the real home at zero/fifty and
        pass the 160 KB budget. Mission model tests pass at zero and fifty, and the
        shared content loader passes zero, one and many. The clean all-zero production
        home also renders both locales successfully.
- [x] 3.3 Run Tier A-equivalent checks: typecheck, lint, Stylelint, reduced-motion CSS,
      locale parity, content/media/time tests, production build and authoritative budget
      check. **CI gate:** Tier A. Site-wide axe and Lighthouse remain the separate
      `verification-browser-gates` change.
      - **Evidence (2026-10-02, Node 24.20.0):** Tier A-equivalent checks pass. The clean
        `/[locale]` build measures 143.6 KB first-load JS of 160 KB and 0.0 KB deferred
        animation of 45 KB. Populated Timeline and Events builds report the same result.
- [x] 3.4 Inspect `/en` and `/tr` at phone and desktop widths for one h1/main, one primary
      CTA in the default viewport, no horizontal overflow, localized copy, zero-state
      spacing and keyboard access. No motion recording is required because this change
      adds no motion.
      - **Evidence (2026-10-02):** both locale homes have one `main` and one `h1`; at
        320 px, `scrollWidth === innerWidth`, the empty Timeline wrapper computes to
        `display: none`, and each locale has one primary action. The Turkish phone and
        desktop layouts were inspected, and first Tab visibly focuses the skip link.
- [x] 3.5 Run strict OpenSpec validation and review the final diff against the Dev 2 write
      boundary before requesting review.
      - **Evidence (2026-10-02):** strict validation passes. Production code changes are
        limited to the assigned `app/[locale]/page.tsx`; the remaining files are this
        change's OpenSpec plan and focused home verification. No owner component, loader,
        shared stylesheet, CMS file, sitemap or package manifest is changed.
