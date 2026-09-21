## Context

See `proposal.md` for motivation and `specs/design-system/spec.md` for behavior. The web app is still the stock Next.js scaffold: `globals.css` contains temporary light/dark values and `layout.tsx` loads Geist, while `page.tsx` contains stock raw colour classes. The approved source of truth is `design/tokens.md`, with typography constraints in `design/brand.md` and verification constraints in ADR 0004.

The palette values remain provisional under the existing `ASSUMPTION:` in `design/tokens.md`. This change centralizes them but does not claim brand validation or resolve that assumption.

## Goals / Non-Goals

**Goals:**

- Make the complete token inventory present in production CSS even before downstream components consume it.
- Give downstream CSS and Tailwind markup one semantic API, including all five Schedule Event types.
- Self-host Inter and Orbitron through the existing Next.js font integration and expose both through the theme.
- Remove stock scaffold colour/font behavior that conflicts with the new contract while preserving the placeholder page structure.

**Non-Goals:**

- No KUASAR page, navigation, component, content, animation, CMS field, or route is built here.
- No final brand-palette approval, wordmark recolouring, light theme, theme switcher, shadow system, glow, or gradient system is introduced.
- No automatic runtime inspection of strings is added to choose a font; the typography rule remains an explicit rendering decision for the component that owns the string.

## Decisions

### 1. Emit a closed, static Tailwind theme from `globals.css`

Direct token values will live in top-level `@theme static` blocks so Tailwind emits every custom property even when unused. Variable-backed aliases will use the `inline` behavior where needed so generated utilities resolve the referenced value correctly. This follows Tailwind v4's CSS-first theme model and makes the same source usable by utilities and hand-written CSS.

The default colour and shadow namespaces will be reset before KUASAR values are declared. This is required for “no generic orange” and “no shadow scale” to be true: merely adding KUASAR tokens would leave Tailwind's default orange and shadow utilities available. Other useful framework primitives remain unless `design/tokens.md` replaces their namespace.

Alternative considered: ordinary `:root` variables. Rejected because they do not create the Tailwind utility/variant API and would weaken the single-contract rule. Alternative considered: a JavaScript Tailwind config. Rejected because Tailwind v4 and ADR 0001 require CSS-first `@theme` configuration.

### 2. Add semantic Schedule Event aliases without expanding the palette

`design/tokens.md` will record `--color-event-talk`, `--color-event-screening`, `--color-event-summit`, `--color-event-workshop`, and `--color-event-other`. They will alias existing orbital blue, nebula purple, Summit aurora, readable ink, and muted ink values respectively. This closes the task-assignment gap without giving the future calendar permission to invent hex values or misuse orange state tokens.

Alternative considered: add five new raw hues. Rejected while the base palette is still an explicit assumption and before the calendar has an accessibility-reviewed legend. Alternative considered: reuse live/upcoming state colours. Rejected because event category and time-relative state are different meanings.

### 3. Load both fonts once at the root and bridge them into the theme

`layout.tsx` will replace the Geist imports with `Inter` and `Orbitron` from `next/font/google`, expose their generated CSS variables on the root element, and let Next.js self-host the files produced at build time. Inter will include the Turkish-capable subset; Orbitron will use its available Latin subset. `globals.css` will map those variables to the `font-sans` and `font-display` theme APIs and set Inter as the document baseline.

The font choice for a particular display string stays explicit: future rendering code must select Inter when the string contains `ğ Ğ ş Ş İ`. CSS cannot reliably choose a font family by inspecting characters, and allowing per-glyph fallback would create the visible mixed-face failure the rule exists to prevent. The PR verification will therefore include a manually reviewed `--text-5xl` Turkish specimen in Inter; it is evidence, not a committed screenshot baseline.

Alternative considered: rely on the browser's fallback glyph selection. Rejected because only the missing glyph would switch face. Alternative considered: use Inter for every heading. Rejected because it removes the approved Orbitron display role and incorrectly treats `ı` as unsupported.

### 4. Make the baseline dark and locale-independent

The starter light/dark media-query switch will be removed. The root/body baseline will use semantic canvas, body ink, and font tokens regardless of system preference, matching `design/brand.md`. Both locale trees inherit the same foundation; locale-specific components only choose between the safe display and sans font APIs.

The stock placeholder page will not be redesigned. Its temporary raw/default colour classes will be replaced mechanically with semantic tokens so the repository satisfies the contract immediately instead of waiting for `home-composition`.

### 5. Verification uses existing gates plus focused inspection

Tier A typecheck, lint, Stylelint, reduced-motion checks, production build, and bundle budgets will run after implementation. ADR 0004's static motion check already rejects raw time values in CSS. Current automated gates do not reject raw Tailwind colour literals in TSX and do not prove which font rendered a Turkish string; those two gaps will be stated honestly and covered in this change by focused source inspection, manual computed-style/font inspection, and the required PR screenshot specimen. Expanding Dev 4's repository-wide gate is a separate capability, not an implicit side effect of this one.

No animation is introduced, so there is no L1/L2/L3 assignment, reduced-motion implementation, or mobile motion fallback in this change. Per-route first-load JavaScript impact is expected to be zero; font files affect static assets, not route JavaScript. No code imports or reaches an animation library from any route.

No CMS-backed content changes. No Strapi field is added, locale-specific or otherwise.

## Risks / Trade-offs

- **[Provisional palette becomes mistaken for final brand approval]** → Keep the `ASSUMPTION:` line unchanged and mention it in the PR; centralization makes later correction one token-layer edit.
- **[Clearing default theme namespaces silently removes a stock utility]** → Migrate the stock placeholder's affected classes and verify the production output before downstream branches rebase.
- **[Orbitron/Inter increase font asset weight]** → Use variable fonts, load each family once at the root, and verify build/budgets; do not add another family.
- **[Developers forget the glyph rule because CSS cannot automate it]** → Keep the rule in the capability spec and require the Turkish display specimen during review; a reusable rendering helper can be proposed with the later component change.
- **[Event category colours are not sufficiently distinguishable in the future calendar]** → Treat labels as the source of meaning and validate the legend during the calendar capability; change only the semantic aliases if visual testing fails.
- **[Raw colour policy is only partially automated today]** → Use focused source inspection now and state the missing CI coverage honestly in `tasks.md` and the PR; propose a repository-wide gate separately with Dev 4 if needed.

## Migration Plan

1. Record the five Schedule Event aliases in `design/tokens.md` while retaining the palette assumption.
2. Replace root font variables, then emit/reset theme namespaces and establish the semantic document baseline.
3. Mechanically migrate the stock placeholder away from removed/default/raw colour utilities without changing its information architecture.
4. Run focused token/font inspection and all relevant Tier A/build gates.

Rollback is a normal revert of these CSS, font, and placeholder-class changes; no persisted data, CMS schema, route, or external service requires migration.
