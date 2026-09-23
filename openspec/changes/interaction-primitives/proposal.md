## Why

Downstream sections currently have no shared interaction contract, so each contributor could invent a fourth button style, inaccessible focus treatment, or motion that bypasses the project's token and reduced-motion rules. Establishing the primitives now unblocks Phase 2 work while serving sponsors and prospective members equally through consistent, keyboard-accessible actions and progressive section reveals.

## What Changes

- Add exactly three reusable site-wide action types: primary CTA, secondary outline, and text link with arrow.
- Add their L3 CSS-only hover, focus, and press feedback, gated so touch input does not receive false hover states.
- Add a reusable L2 section reveal whose permanent baseline is visible, whose preferred enhancement uses CSS view timelines, and whose fallback uses the platform `IntersectionObserver` API without an animation library.
- Ship reduced-motion and mobile behavior with each primitive: preserve useful colour/opacity feedback while removing movement.
- Use a temporary local proof surface to verify the three action types and reveal behavior without changing the home page's information architecture or adding production content.

## Capabilities

### New Capabilities

- `interaction-primitives`: The observable API, accessibility, input-mode, reduced-motion, mobile, and progressive-enhancement behavior of KUASAR's three action types and shared L2 reveal.

### Modified Capabilities

None.

## Impact

- Adds reusable files under `apps/web/components/ui/**`; the stock home page remains outside the component implementation except for a narrowly scoped proof surface if required for manual verification.
- Adds no content entity and changes no git- or Strapi-backed content storage.
- Adds no runtime dependency, animation library, scroll library, CMS field, API, or data fetch.
- Uses only shared design tokens, CSS, React's existing client boundary for the reveal fallback, and the browser's `IntersectionObserver` and CSS feature-detection APIs.
- L3 motion is CSS-only. L2 reveal motion is progressive enhancement with no library and a visible un-animated baseline. No L1 route or route budget is introduced.
