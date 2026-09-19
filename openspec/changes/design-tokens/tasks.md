## 1. Complete the token inventory

- [x] 1.1 Add semantic `--color-event-*` aliases for `talk`, `screening`, `summit`, `workshop`, and `other` to `design/tokens.md`, using only existing palette/ink tokens and not the reserved live, upcoming, or CTA tokens.
- [x] 1.2 Keep the existing palette `ASSUMPTION:` unchanged and confirm the change does not present the provisional colour values as brand-approved.

## 2. Emit the Tailwind theme

- [x] 2.1 Replace the starter colour variables in `apps/web/app/globals.css` with static Tailwind v4 theme declarations for every colour, type-scale, measure, spacing, breakpoint, duration, and easing token in `design/tokens.md`.
- [x] 2.2 Reset Tailwind's default colour and shadow namespaces, then add the semantic surface, ink, state, CTA, Summit, and Schedule Event aliases with correct inline variable resolution and no generic orange token.
- [x] 2.3 Establish the locale-independent dark canvas, semantic body ink, Inter baseline, and shared body size/line-height without adding transitions or animations.

## 3. Configure bilingual typography

- [x] 3.1 Replace Geist with variable Inter and Orbitron definitions in `apps/web/app/layout.tsx`, loading Inter's Turkish-capable subset and Orbitron's available Latin subset through `next/font/google` CSS variables.
- [x] 3.2 Map the generated font variables to `font-sans` and `font-display`, and confirm the root loads each family once with no new runtime dependency or external browser font request.
- [x] 3.3 Mechanically replace the stock placeholder page's raw/default colour and obsolete font utilities with semantic KUASAR tokens without redesigning the page or adding user-facing copy.

## 4. Verify the contract

- [x] 4.1 Build the web workspace and inspect its generated CSS to confirm every documented token is emitted even when unused, semantic utilities resolve, and the default orange and shadow namespaces are absent.
- [x] 4.2 Run a focused source audit for raw colour literals outside `globals.css` and raw transition/animation time values; record that Tier A automates the time-value rule but currently has no repository-wide raw-colour gate.
- [ ] 4.3 In a local browser, verify computed font families for an Inter body specimen, an eligible Orbitron display specimen containing `ı`, and a `--text-5xl` Turkish specimen containing `İ` or `ş`; attach the Inter specimen screenshot to the PR. Record that font selection is a manual review because no existing CI gate proves the rendered family.
- [x] 4.4 Run Tier A checks relevant to this change: typecheck, lint, Stylelint, reduced-motion CSS, locale parity, budget fixtures, production build, and weight budgets; confirm no route first-load JavaScript regression.
- [x] 4.5 Run strict OpenSpec validation for `design-tokens` and review the final diff against `design/tokens.md`, `design/brand.md`, ADR 0004, and the Dev 2 assignment before requesting review.
