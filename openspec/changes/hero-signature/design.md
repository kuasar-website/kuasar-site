## Context

See proposal.md for scope. Main `cb809e7` includes the server-rendered HomeHero and home composition. The existing hero is text/wordmark/actions on a token background; no black-hole asset exists in public assets. ADR 0003 leaves technique to this proposal. ADR 0004 requires deterministic computed-value tests and a human-reviewed recording. design/motion.md and budgets.json retain home limits of 160 KB first load and 45 KB deferred.

## Goals / Non-Goals

**Goals:** A recognizable, restrained black-hole-to-quasar sequence on `/en` and `/tr`, with permanent content and safe lifecycle behavior.

**Non-Goals:** Photorealism, scientific simulation, scroll pinning, changes to timeline signature, other sections, CMS or server operations. No new copy or translated content entity.

## Decisions

### Authored vector layers with one timed GSAP sequence

Choose inline SVG source: a dark core, elliptical accretion rings and opposing jet layers, with static gradients using existing non-orange tokens. Animate transform and opacity only; do not animate filters, path geometry or layout. Preserve the canonical wordmark and its clear space. Keep artwork in a separate visual area so text contrast and both CTAs remain reliable.

The desktop narrative rotates rings, reveals jets and settles into a static quasar within four seconds, once per mount, without looping or flashing. Start only when the hero is visible. A visibility pause does not restart it. Native scrolling remains untouched. Use GSAP core and @gsap/react, without ScrollTrigger: this timed sequence needs no scrolling synchronization. This retains the site-wide single-library policy while avoiding an unnecessary plugin cost.

Alternatives: a rendered sequence requires a maintained frame asset set absent from the repository; three.js exceeds the current cap; a canvas/shader makes deterministic visual-element tests and maintenance harder. A SVG sequence is intentionally stylized and must receive human visual review, not be described as photorealistic.

### Server baseline and home-only boundary

Keep HomeHero, its actions and heading server-rendered. Add a decorative, aria-hidden static SVG that also stands alone with no JavaScript. The existing baseline remains visible during imports and on errors. A private home module under app/[locale]/_hero-signature owns the optional client lifecycle; no GSAP import belongs in shared hero, shell or layout modules. Preserve all other home section imports/order and metadata. If a minimal home wiring change is needed, document it for the home owner.

Dynamic imports occur only after hydration, visibility and eligibility checks. Use scoped useGSAP, register the hook before use, gsap.matchMedia with desktop/no-reduced-motion conditions, contextSafe for late callbacks, and revert/disconnect cleanup. A media-query change or import rejection must leave the static composition. Handle cancellation of pending imports on unmount. Never hide baseline content pending hydration.

### Mobile and user control

Below 48rem, reduced-motion users, and unsupported initialization paths get static artwork. Do not download GSAP for initially ineligible users. Switching to reduced motion or mobile during playback immediately reverts to static; returning to desktop need not replay. Pause when offscreen or document-hidden. Escape ends the decorative sequence and leaves the static baseline; it does not change focus or scroll.

### Budgets and evidence

Tier L1, home only. No animation library reaches a non-L1 route. First-load launcher overhead must be measured against an otherwise identical current-main build; do not claim zero overhead merely because GSAP is deferred. Both absolute caps remain unchanged, and any increase is reported for review rather than silently redefining policy. Deferred size must be measured with the authoritative production check, not inferred from source or npm size. GSAP core without ScrollTrigger is expected to leave room, but that is an estimate until CI verifies it.

Add Tier B hero-signature, including Chromium/Firefox, both locales, no-JS/import-error/mobile/reduced-motion/cleanup cases. Expose seeking only behind a fixture-only test flag. Compare computed transforms, opacity and bounds at 0/.25/.5/.75/1 against reviewed text fixtures. Retain existing hero baseline tests. Record the real production home for review in addition to isolated fixture evidence; no screenshot loop substitutes for human assessment.

## Risks / Trade-offs

- Stylized artwork may not meet the desired visual ambition → attach a recording and require human review before merge; keep the fallback independently shippable.
- Deferred library bytes do not guarantee field performance → measure build weight and inspect on a real phone; report unmeasured LCP honestly.
- Browser resize/import races can leak or replay motion → cancellation, scoped cleanup and remount/media-query tests.
- Main and timeline draft dependency changes can diverge → regenerate the lockfile from this branch's current main; never transplant the timeline lockfile wholesale.

## Migration Plan

After proposal review, implement the static artwork first, then the deferred enhancement and tests. Publish as a separate draft DEV 5 PR. Promote only after required checks and recording are available. Reverting enhancement wiring restores the permanent baseline without content migration.
