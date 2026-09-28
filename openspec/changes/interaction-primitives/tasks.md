## 1. Ship the visible, accessible baseline

- [x] 1.1 Add the closed `ActionLink` API under `apps/web/components/ui/` with only `primary`, `secondary`, and `text` variants, semantic link markup, an `aria-hidden` text-arrow, flexible Turkish/English label sizing, and no consumer `className` escape hatch.
- [x] 1.2 Add token-based static styles for the three action types and a visible `:focus-visible` treatment, without motion or raw colour values.
- [x] 1.3 Add the `Reveal` client wrapper so its server-rendered output is fully visible and usable before hydration, with no enhancement API required for the baseline.
- [x] 1.4 Add reduced-motion and below-`md` reveal rules first: static visible content for reduced motion and opacity-only eligibility on mobile.

## 2. Add L3 action feedback

- [x] 2.1 Add fine-pointer-only primary fill, secondary border, and text-arrow hover states; keep touch free of hover-only transforms.
- [x] 2.2 Add tokenized transform-only press/arrow transitions using `--duration-instant` and `--duration-fast`, never `transition: all`, a layout property, `scale(0)`, or a duration above the 300ms L3 ceiling.
- [x] 2.3 Complete the action reduced-motion path so colour and focus feedback remain while every arrow, scale, and position transform is removed.

## 3. Add the L2 progressive reveal

- [x] 3.1 Add the CSS view-timeline reveal using only transform and opacity, `--duration-reveal`, and shared easing, activating it only for initially off-screen content when the required CSS declarations are supported.
- [x] 3.2 Add the one-shot `IntersectionObserver` fallback for off-screen content when view timelines are unsupported, including independent instances, disconnect-on-reveal, unmount cleanup, and a visible no-API fallback.
- [x] 3.3 Confirm the reveal creates no observer or client payload on routes that do not render it and imports no animation or smooth-scroll library.

## 4. Verify behavior and gates

- [x] 4.1 Create a temporary local proof route with realistic Turkish and English labels and enough vertical space to exercise initially visible and initially off-screen reveal instances; do not commit the route or its copy.
- [x] 4.2 Manually verify all three action types with keyboard focus, fine-pointer hover, touch/mobile emulation, and reduced motion; verify native view-timeline and forced observer paths, and attach the required short motion recording to the PR because Tier A cannot judge motion feel.
- [x] 4.3 Run typecheck, ESLint, Stylelint, reduced-motion CSS, locale parity, budget fixtures, the production build, and route budgets; record that Tier A covers imports/properties/durations/reduced-motion presence but browser behavior and motion feel remain manual review.
- [x] 4.4 Inspect the production/client graph to confirm `ActionLink` stays server-renderable, reveal code appears only where imported, no animation library is reachable, and route first-load JS remains within budget.
- [x] 4.5 Remove the temporary proof route, run strict OpenSpec validation for `interaction-primitives`, and review the final diff against ADR 0003, ADR 0004, `design/motion.md`, `design/tokens.md`, and the Dev 2 assignment before requesting review.
