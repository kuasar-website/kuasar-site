# DEV 5 hero integration — 2026-09-28

Shared site-shell (#18) and interaction-primitives (#15) are merged. This branch
has been updated from main. `HomeHero` now renders the actual shared ActionLink
components, retaining the static Hero and semantic wordmark.

## Home owner handoff

Render `<HomeHero locale={locale} sponsorHref={approvedConnectUrl} />` inside
the existing shell. It owns the home's h1; do not add another main/h1. Join paths
come from `sectionPath('join', locale)`.

PR #24 (`about-and-join`) defines verified club Google Form destinations in
`components/about-and-join/form-links.ts` as `FORM_LINKS.connect`. Once that PR
is merged, home-composition can supply that value without a copied URL constant.
Its Join pages must be published before enabling the real home entry points.
No DEV 5 code changes that PR or invents an alternate destination.

## Verification

The dedicated browser fixture now renders actual SiteShell and HomeHero with real
shared styles. Test-only destination pages let keyboard checks activate both
actions without submitting forms. Checks cover both locales, narrow/desktop
layouts, skip link, language switch, one main/h1, logo clear space, and reduced
motion. They do not establish production home LCP.

## Remaining release requirements

DEV 2 home assembly; real home first-load JS ≤160KB; real-phone LCP <2.5 seconds;
bilingual visual review and baseline merge before any signature enhancement.
