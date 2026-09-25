## 1. Static baseline

- [x] 1.1 Prepare the server-compatible hero with bilingual audience context, required shared-action slots, exact team subtitle and canonical inline wordmark.
- [x] 1.2 Implement responsive token-based composition with full logo clear space, no motion and no client dependency.
- [x] 1.3 Verify original artwork parity, SSR accessibility and both locales; run TypeScript, ESLint, Stylelint and strict OpenSpec validation.
- [x] 1.4 Run dedicated Tier B hero browser scenarios for no JavaScript, narrow/desktop layouts, both audience actions, keyboard focus, clear space and reduced motion.

## 2. Site-shell integration and release

- [ ] 2.1 Integrate through DEV 2's site shell/home composition when available, supplying the actual shared actions and localized destinations; do not build their systems here.
- [ ] 2.2 Run Tier A and measure both real home routes against the 160KB first-load JS cap.
- [ ] 2.3 Record LCP below 2.5 seconds on a real phone and review bilingual copy, action prominence and layout.
- [ ] 2.4 Review and ship this baseline before proposing hero-signature; keep the baseline as the permanent fallback.

## Verification evidence

- Tier A: https://github.com/kuasar-website/kuasar-site/actions/runs/35617380170
- Tier B hero baseline: https://github.com/kuasar-website/kuasar-site/actions/runs/35617380497
- 3 SSR/artwork tests and 20 Chromium/Firefox browser tests passed.
- These results cover the isolated hero with production token CSS and test-only links, not future shared actions or home integration. Section 2 remains open.

## Integration preparation — 2026-09-25

See integration.md for the inspected upstream interfaces and concrete remaining decisions.
Shared ActionLink composition and shell ownership are documented. The sponsor destination and actual home integration remain unchecked; no production destination is guessed.
