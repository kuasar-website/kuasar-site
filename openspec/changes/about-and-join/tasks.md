## 1. Resolve dependencies and content

- [x] 1.1 Confirm `site-shell` and `interaction-primitives` are merged into `main`, then
      fast-forward this branch before implementation.
- [x] 1.2 Obtain the real Join Us and Connect Us Google Form URLs from Dev 4; verify both
      use HTTPS, belong to the club account, and are not placeholders or member-owned.
- [x] 1.3 Review the separately authored Turkish and English page copy with a club owner,
      including the responsibility statement for Propulsion, Avionics, Structures, and
      Software. Remove any fact the repository or owner cannot support.

## 2. Static bilingual baseline

- [x] 2.1 Add one typed bilingual copy module for About, Join, the four sub-teams,
      external-destination notices, page titles, and descriptions; add no CMS request or
      client component.
- [x] 2.2 Add shared About and Join Server Components plus a token-based CSS Module. Keep
      the baseline static, responsive at 320 px, and free of animation introduced by this
      change.
- [x] 2.3 Add the four thin literal route entries for `/en/about`, `/tr/hakkimizda`,
      `/en/join`, and `/tr/bize-katil`; reject all cross-locale segment combinations.
- [x] 2.4 Add self-canonical, `en`, `tr`, and English `x-default` discovery metadata for
      both page pairs through `sectionAlternates()`.

## 3. External actions

- [x] 3.1 Add the two verified form destinations as named, non-secret constants with
      HTTPS/Google Forms validation; do not commit a placeholder or iframe.
- [x] 3.2 Render exactly one shared primary `ActionLink` on each page with
      `target="_blank"`, `rel="noopener"`, and visible/localized external-destination
      wording.
- [x] 3.3 Inspect the rendered pages to confirm they contain no form controls, embedded
      documents, third-party scripts, analytics, pixels, or site-side submission storage.

## 4. Verification and review evidence

- [x] 4.1 Build all four routes and verify the correct language, shell, page copy,
      canonical/alternate metadata, external link destination, and not-found behavior for
      `/tr/about`, `/en/hakkimizda`, `/tr/join`, and `/en/bize-katil`.
- [x] 4.2 At 320 px, keyboard-check all four valid routes for reading/focus order, visible
      focus, complete Turkish labels, one primary CTA per viewport, and no horizontal
      overflow. Repeat with reduced motion and confirm the shared action does not move.
- [x] 4.3 Run axe-core on all four valid routes and attach page screenshots to the PR.
      Record this as manual review evidence: current Tier A does not run an app-level axe
      scan.
- [x] 4.4 Run Tier A-equivalent checks: typecheck, ESLint, Stylelint, reduced-motion CSS,
      locale parity, budget fixtures, content tests when present, production build, and
      weight budgets. Record per-route first-load JS and confirm no animation-library
      import reaches these routes.
- [x] 4.5 Run strict OpenSpec validation for `about-and-join` and review the final diff
      against the task assignment, ADR 0001, ADR 0002, ADR 0004, `design/brand.md`,
      `design/i18n.md`, and `design/motion.md` before requesting review.
