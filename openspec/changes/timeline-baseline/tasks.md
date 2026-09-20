## 1. Native baseline

- [x] 1.1 Build server-compatible presentation and home-section variants with bilingual labels, neutral ISO dates, descending order, optional images and incomplete-translation notices.
- [x] 1.2 Add token-based native horizontal scroll styles, keyboard focus, mobile sizing and a non-animated reduced-motion path.
- [x] 1.3 Verify zero, one and fifty records in both locales with server-rendering tests; run TypeScript, ESLint, stylelint and OpenSpec validation.

## 2. Production integration (upstream contracts required)

- [ ] 2.1 Consume the actual git-content-pipeline loader and locale types after they are available; adding real entries remains data-only. Do not build the upstream pipeline in DEV 5.
- [ ] 2.2 Add DEV 5 timeline routes at /en/timeline and /tr/zaman-cizelgesi, localized not-found for empty data, canonical/hreflang and route-preserving switcher integration through the existing locale system.
- [ ] 2.3 Supply the populated section and localized view-more link to home-composition; verify empty data hides both. Home composition and navbar remain DEV 2 scope.

## 3. Verification and baseline review

- [ ] 3.1 Run Tier A and measure production home/timeline route budgets after integration; verify no application client bundle is added by the native baseline.
- [ ] 3.2 Run dedicated browser checks with JavaScript disabled for both locales, keyboard reachability, mobile overflow, reduced motion and zero/one/fifty records. Existing Tier A and time-state checks do not cover timeline scrolling.
- [ ] 3.3 Review bilingual copy and the native baseline on phone and desktop; ship/review it before proposing timeline-signature. Do not archive this change until integration and verification are complete.
