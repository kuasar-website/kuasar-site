## Context

See proposal.md. Task authority: docs/task-assignments.html, design/brand.md, design/motion.md and ADR 0003. Design tokens exist on the base, but site-shell and localized home routing do not. DEV 5 prepares the component without changing other owners' shared UI, routes or servers.

## Goals / Non-Goals

Goals: readable identity and two audience actions in the initial HTML; a reusable permanent fallback with no application JavaScript or image request for the logo.

Non-goals: home assembly, shared button implementation, language routing, CMS, analytics, real content records or signature animation. Hero-signature requires a separate proposal and baseline review first.

## Decisions

- Render a Server Component with required `joinAction` and `sponsorAction` slots. The shell supplies its existing shared links/buttons and correct locale URLs. Do not create local primary/secondary button variants or invent routes before the shell exists. Fixture actions use plain equal-weight links only; they are not shipped to production.
- Render the wordmark inline from a generated JSX copy of the committed SVG. External SVG images do not inherit the page's currentColor; CSS masks require a separate download. Inline paths use the ink token immediately without altering artwork. A test compares every path attribute and viewBox against the canonical asset to prevent drift. A regeneration script produces only the hero-local copy, never changes the canonical SVG.
- Use a semantic h1 with accessible name KUASAR and an aria-hidden SVG; the team subtitle is the exact required name in English, marked lang=en in both locales. Action context labels are localized. Use Inter and normal flow for Turkish wrapping.
- Reserve the full 0.28 × logo-width clear space on all sides. A bounded identity wrapper provides 18% padding around a 64% inner mark, yielding 0.28125 × width. Avoid fixed viewport-height compositions that crop content on short phones.
- No animation tier is introduced. This is the non-animated predecessor of L1 on `/en` and `/tr`. No use-client directive or animation import: the component adds zero application JavaScript when rendered by the server. Whole-home budgets and real-phone LCP remain integration measurements, not inferred from a fixture.

## Risks / Trade-offs

- Missing shell contracts → required action slots and explicit integration tasks instead of a competing button/router system.
- Generated artwork could drift → check geometry and colour attributes against the original in the test gate.
- Brand clear space uses substantial vertical space → preserve it and allow natural document scrolling rather than compressing the logo.
- Audience emphasis depends on supplied shared actions → final integrated visual review checks both are easy to find, without ranking them in copy.

## Migration Plan

Keep this preparation draft until site-shell is available. DEV 2 composes the DEV 5 hero into the localized homes using shared actions. Verify actual route budgets and real-phone LCP; obtain bilingual visual review before signature work. Revert only hero-local files if needed.
