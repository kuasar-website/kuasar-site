## 1. Baseline and boundaries

- [x] 1.1 Record motion tier `none` before styling: the shell introduces no
      animation/transition and reaches no animation library, so its reduced-motion state
      is identical to its baseline state.
- [x] 1.2 Confirm the two blockers are present on `main`: design tokens supply the
      approved colour/type/spacing variables, and locale-routing supplies `LOCALES`, the
      localized segment map, and switch-resolution helpers.
- [x] 1.3 Keep implementation inside `apps/web/components/shell/**` and
      `apps/web/app/[locale]/layout.tsx`; leave the root layout, pages, public wordmark,
      locale library, Next config, sitemap, robots, CMS, and other file zones untouched.

## 2. Static bilingual shell

- [x] 2.1 Add the nested locale layout with `generateStaticParams()` sourced from
      `LOCALES`, `dynamicParams = false`, a defensive unsupported-locale check, and the
      locale language applied to the complete nested shell subtree.
- [x] 2.2 Add one semantic page frame in reading order: first-focus skip link, header,
      labelled primary navigation, one focusable main landmark, and footer.
- [x] 2.3 Add English/Turkish shell copy and navigation labels. Derive every href from
      `sectionPath()`, keep all links locale-prefixed, exclude Timeline by policy, and
      exclude unresolved Projects.
- [x] 2.4 Render the navigation in Inter at `--text-sm` in both locales. Reflow the list
      responsively while keeping each label unwrapped, unclipped, and in DOM order.
- [x] 2.5 Add a reusable inline wordmark whose viewBox/path data matches the committed
      asset, whose paths use only `currentColor`, whose artwork width is 7.5 rem (120 px
      at the default root size), and whose 2.1 rem padding preserves the exact 0.28 clear-
      space ratio on all four sides.

## 3. Locale switching

- [x] 3.1 Add the visible `TR / EN` switcher with text only, a semantic current-locale
      state, localized accessible names, and no flag imagery.
- [x] 3.2 Resolve home and section-index switches from the current pathname and the
      shared locale-routing contract; verified `/en/missions` → `/tr/gorevler` and the
      reverse direction.
- [x] 3.3 Resolve detail-page switches from the target locale's existing
      `hreflang` discovery link after hydration. If it is absent or unsafe, link to the
      target home with `?notice=unavailable` instead of guessing a slug.
- [x] 3.4 Render a localized status notice when the unavailable-content query contract is
      present; verified on `/tr/?notice=unavailable`.

## 4. Verification

- [x] 4.1 On temporary proof routes (not committed), inspect both locale homes and both
      locale section routes. Confirm one header/nav/main/footer, locale-prefixed hrefs,
      correct subtree language, exact section switching, and the visible fallback notice.
- [x] 4.2 At a 320 px viewport, verify all Turkish labels have `white-space: nowrap`, no
      clipped content, and no document-level horizontal overflow. Confirm Timeline and
      Projects are absent. Repeat the style check for English; computed navigation font
      is Inter in both locales.
- [x] 4.3 Keyboard-check the generated Turkish proof route: the first Tab reveals and
      focuses “Ana içeriğe geç”, then reading/focus order continues through the wordmark,
      navigation, switcher, main, and footer. Run axe-core 4.13.0 against `/en`, `/tr`,
      `/en/missions`, and `/tr/gorevler`; all four report zero violations.
- [x] 4.4 Measure the wordmark in-browser: 120 px rendered width, nine paths, and no path
      colour other than `currentColor`/none. Confirm the document has no horizontal
      overflow at 320 px.
- [x] 4.5 Build with the temporary generated routes and run the budget checker. Both
      locale homes statically generate at 135.2 KB first-load JS against the 160 KB home
      budget; deferred-animation is 0.0 KB against 45 KB.
- [x] 4.6 Run typecheck, ESLint, Stylelint, and the reduced-motion CSS gate. All pass; the
      reduced-motion gate checks two stylesheets.
- [x] 4.7 Remove every temporary proof route and axe harness before commit. Note that
      Tier A does not run axe; the four-route browser scan above is the manual evidence
      required by `docs/workflow.html` until a browser accessibility gate is proposed.
