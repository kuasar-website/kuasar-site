## Why

The merged hero baseline and home composition now provide working bilingual entry points for sponsors and prospective members. Add the planned black-hole-to-quasar signature as a credibility enhancement while keeping both audiences' actions immediately usable.

## What Changes

- Choose a lightweight, authored SVG composition animated with dynamically imported GSAP core and `@gsap/react`: rotating accretion rings resolve into a quasar with opposing jets. This is stylized brand artwork, not a scientific simulation.
- Play one short, non-looping desktop sequence when the hero becomes visible; retain native scrolling. ScrollTrigger is unnecessary for this timed sequence. No pinning, scroll system, three.js, shader or remote image sequence.
- Keep the existing server-rendered wordmark, subtitle and actions visible throughout. Mobile, reduced motion, JavaScript failure and unsupported conditions retain the permanent static composition.
- Add bilingual motion/fallback tests, deterministic progress fixtures and a review recording. Keep the existing 160 KB first-load and 45 KB deferred limits unchanged.

## Capabilities

### New Capabilities
- `hero-signature`: Home-only progressive black-hole-to-quasar narrative, accessible static fallback and verified motion lifecycle.

### Modified Capabilities
None. Hero baseline and home composition contracts remain intact.

## Impact

DEV 5 scope: hero components, a private home-route enhancement module, focused tests and its path-filtered workflow. The home page may receive only the minimal enhancement wiring; no other owner's section, CMS, deployment or server configuration changes.

New runtime dependencies relative to main: `gsap` and `@gsap/react`, using the same library family as the independent timeline signature. No second animation library. The timeline draft is not a dependency and will not be merged into this branch. Match compatible versions when preparing the implementation and regenerate the current main lockfile without discarding other dependencies.

No content entities or CMS fields are added. SVG artwork is source code in git, not an uploaded content record; existing entity storage remains unchanged. Proposal base: main `cb809e7`, which contains HomeHero and the composed `/en` and `/tr` routes. Technique and feel remain subject to human review before merge.
