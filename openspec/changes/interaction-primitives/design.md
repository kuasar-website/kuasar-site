## Context

See `proposal.md` for motivation and `specs/interaction-primitives/spec.md` for observable behavior. The design-token contract is now on `main`, but `apps/web` has no shared UI primitives. ADR 0003 requires L3 to remain CSS-only and L2 to remain library-free; ADR 0004 enforces transform/opacity-only motion, duration tokens, and co-located reduced-motion CSS.

CSS view timelines remain a progressive feature rather than a universal baseline. MDN marks `animation-timeline` as limited availability, while current Chromium and Safari releases implement view-progress timelines. The reveal therefore cannot hide server-rendered content by default and must retain the specified `IntersectionObserver` fallback.

## Goals / Non-Goals

**Goals:**

- Provide a closed TypeScript API for the three action types so downstream components consume rather than reinterpret the design decision.
- Keep action markup server-renderable and give only the reveal fallback a client boundary.
- Use one CSS module for the action contract and one for reveal state so Tier A can inspect every motion declaration.
- Make the un-animated baseline the first render and the permanent failure mode.

**Non-Goals:**

- No production page composition, site shell, content, route, form control, disclosure, dialog, toast, or card design.
- No generic polymorphic component system, utility-class merger, CSS-in-JS layer, Storybook, or new testing framework.
- No runtime string translation, CMS field, locale-specific Strapi field, or content storage change.
- No L1 motion, GSAP, smooth scrolling, spring physics, or second scroll system.

## Decisions

### 1. One closed `ActionLink` API owns all three navigation-action styles

`ActionLink` will accept a required `variant` union of `primary | secondary | text` plus the serializable navigation props needed by `next/link`. It will deliberately exclude a consumer-supplied `className`: layout belongs on a wrapper, while instance-level style overrides are the easiest path to an undocumented fourth type. The text variant will own an `aria-hidden` arrow span so its motion and accessible-name behavior cannot drift between call sites.

The component remains a Server Component. Next.js's current App Router guidance keeps components server-side unless state, effects, event handlers, or browser APIs require a client boundary; none of those are required for a semantic link with CSS states.

Alternative considered: export three separately styled link components. Rejected because their shared semantics and focus behavior would drift. Alternative considered: a polymorphic anchor/button API. Rejected until a real non-navigation control requires it; speculative polymorphism adds types and misuse paths without serving this task.

### 2. L3 colours change immediately; only movement is transitioned

The action CSS will use semantic token values for fill, border, ink, and focus. Fine-pointer hover is gated behind `@media (hover: hover) and (pointer: fine)`. The primary fill and secondary border state may change immediately; any eased transition will name only `transform` or `opacity`, matching ADR 0004's enforced allowlist. Press feedback uses `--duration-instant`; hover movement uses `--duration-fast`; neither approaches the 300ms L3 ceiling. The arrow offset resolves to half of the shared base spacing token, which is approximately two pixels at the root size.

Reduced motion retains colour and outline changes but sets every transform to `none`. Below `md`, hover remains absent by input gating and any reveal movement is removed. Focus uses `:focus-visible`, not `:focus`, so keyboard focus is obvious without painting a persistent ring after pointer activation.

Alternative considered: transition background and border colour. Rejected because the repository's deliberate motion-property gate allows only transform and opacity; an immediate semantic state change satisfies the visual requirement without weakening the gate.

### 3. `Reveal` is a tiny client boundary over visible HTML

`Reveal` will server-render a plain visible wrapper. In an effect, it will first respect reduced motion and the element's initial viewport position. Content already visible stays static. Content below the viewport takes one of three paths:

1. If both required CSS declarations are supported, add a data mode that activates a CSS `view()` timeline.
2. Otherwise, if `IntersectionObserver` exists, mark the element pending, observe it, switch it to visible once it intersects, then disconnect.
3. Otherwise, change nothing and preserve the visible baseline.

Data attributes keep JavaScript responsible only for capability/state and CSS responsible for presentation. Cleanup disconnects the observer, including React development-mode effect replay.

Alternative considered: render hidden and reveal after hydration. Rejected because a client error, blocked script, or unsupported API would lose content. Alternative considered: observer-only. Rejected because ADR 0003 explicitly prefers CSS scroll-driven animation where support allows. Alternative considered: CSS-only with no fallback. Rejected while `animation-timeline` is not Baseline across widely used browsers.

### 4. Reveal motion is L2, not a 300ms L3 component transition

The reveal uses `--duration-reveal` and `--ease-out`, animating only opacity plus a small transform. This follows the higher-authority motion and token documents: the assignment's under-300ms acceptance applies to the three L3 interaction types, while `--duration-reveal` is explicitly the L2 section default. Desktop may combine opacity with translate/scale no lower than `scale(0.95)`; the mobile keyframes and observer state use opacity only. Reduced motion disables both paths and leaves the baseline visible.

The L3 action styles may appear on any route. The L2 reveal may also be consumed by any ordinary section route, but this change adds no production route consumer. A temporary local proof route will be used for manual review and removed before commit.

### 5. JavaScript and dependency impact stays narrow

`ActionLink` adds no client boundary and no runtime dependency. A route imports reveal client JavaScript only when it renders `Reveal`; a route with zero instances loads none. The fallback uses built-in `CSS.supports`, `matchMedia`, and `IntersectionObserver`. No import reaches GSAP or any animation library from any route. First-load impact will be measured by the existing production build and per-route budget check rather than estimated as zero.

### 6. Verification combines Tier A with focused browser review

Typecheck, ESLint, Stylelint, the reduced-motion CSS check, locale parity, budget fixtures, a production build, and route budgets will run. A temporary local proof route will render Turkish and English labels at realistic lengths, all three variants, keyboard focus, fine-pointer hover, touch emulation, reduced motion, mobile behavior, the native CSS path, and a forced observer fallback. The pull request will include a short recording because ADR 0004 explicitly leaves motion feel to human review.

No permanent screenshot or video binary will be committed.

## Risks / Trade-offs

- **[Hydration could briefly change an initially visible element]** → Measure its initial viewport position before activating either enhancement; never hide content already visible.
- **[CSS feature detection passes while a browser has a partial implementation]** → Require support for both the timeline and range declarations; the visible baseline remains available if activation is skipped.
- **[Each reveal instance creates an observer in fallback browsers]** → Disconnect after the first intersection and on unmount; typical section counts are small. A shared observer can be proposed only if measured use justifies the extra coordination.
- **[Closed styling prevents a legitimate future layout need]** → Put layout on wrappers. Add a fourth type only through a design-system change, not an escape-hatch class.
- **[The assignment's duration wording appears to conflict with the L2 token]** → Record the tier distinction explicitly and follow ADR 0003 plus `design/tokens.md`, which outrank the assignment snapshot.

## Migration Plan

1. Add the server-rendered action baseline and focus states before any transform feedback.
2. Add the visible `Reveal` wrapper and reduced-motion/mobile CSS before activating either enhancement path.
3. Add fine-pointer L3 feedback, then CSS view-timeline enhancement, then the observer fallback.
4. Verify locally and through Tier A/build budgets; remove the temporary proof route before commit.

Rollback is a normal revert of the isolated `components/ui` and OpenSpec files. No data, route, CMS schema, or external service migration is involved.
