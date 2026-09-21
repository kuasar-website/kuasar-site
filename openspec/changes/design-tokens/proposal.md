## Why

The stock web scaffold still exposes temporary colours and typography, so every downstream visual capability would otherwise invent its own values and drift from the approved KUASAR design language. Establishing one observable token and typography contract now serves sponsors and prospective members indirectly through a consistent, credible bilingual experience, and unblocks all section and shell work.

## What Changes

- Emit every colour, typography, type-scale, measure, spacing, breakpoint, duration, and easing token documented in `design/tokens.md` as Tailwind v4 theme variables that are available both as utilities and as CSS custom properties.
- Establish semantic colour aliases for component use, including the reserved live, upcoming, past, and CTA meanings; add the documented Galactic Summit accent set and semantic aliases for every Schedule Event `type` without introducing a generic orange palette entry, shadows, glows, or global gradients.
- Replace the starter typography foundation with Orbitron for eligible display text and Inter for body text, navigation in both locales, and every heading or label containing `ğ Ğ ş Ş İ`; keep `ı` eligible for Orbitron.
- Establish the dark canvas and readable default ink/typography baseline without adding page components or animation behavior.
- Carry forward the `ASSUMPTION:` in `design/tokens.md`: the token structure is approved, but the provisional colour values still require correction against the wordmark before UI work begins.
- Define a new `design-system` capability that forbids raw colour values outside the token layer and raw duration or easing values in animation code.

## Capabilities

### New Capabilities

- `design-system`: The observable Tailwind theme-token contract, semantic colour rules, motion-value rules, and bilingual typography behavior available to all web components.

### Modified Capabilities

None.

## Impact

- Affects the web styling and font foundation, primarily `apps/web/app/globals.css` and `apps/web/app/layout.tsx`, plus the token inventory in `design/tokens.md` for the Schedule Event aliases.
- Does not add user-facing content, change an entity, or involve git/Strapi content storage.
- Does not change APIs, routes, CMS schemas, or data fetching.
- Adds no runtime dependency or animation library; the framework-managed font integration uses the existing Next.js installation.
- Introduces no animation, so no motion tier or per-route JavaScript budget changes apply.
- Blocks `interaction-primitives`, `site-shell`, and every page section until the token contract is implemented and verified.
