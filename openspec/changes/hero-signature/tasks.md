## 1. Proposal and baseline

- [x] 1.1 Inspect current main, verify hero/home composition integration and create an isolated DEV 5 branch.
- [x] 1.2 Write proposal, technique decision, bilingual specification and verification tasks without increasing budgets.
- [x] 1.3 Review the proposal before apply, inspect current GSAP guidance and confirm compatible dependency versions.
- [ ] 1.4 Add static decorative SVG artwork while preserving wordmark geometry, clear space and bilingual actions; verify no-JS desktop/mobile baseline first.

## 2. Progressive enhancement

- [x] 2.1 Add home-private deferred GSAP core/useGSAP integration and update the current branch lockfile without changing shared or non-L1 imports.
- [x] 2.2 Implement the bounded four-second ring-to-jets sequence using transform/opacity only, without scroll pinning.
- [x] 2.3 Add visibility eligibility, media-query fallback, Escape interruption, canceled-import handling and scoped cleanup.
- [x] 2.4 Wire only the home hero enhancement, preserving metadata and every other section's order and ownership.

## 3. Verification and review

- [ ] 3.1 Add fixture-only deterministic seeking and reviewed computed-value JSON at five progress points for both locales.
- [ ] 3.2 Add Tier B hero-signature Chromium/Firefox coverage for desktop, mobile, reduced-motion transitions, no JavaScript, import failure, hidden/offscreen pause, keyboard actions, Escape and unmount/remount.
- [ ] 3.3 Run existing hero baseline and home composition checks and Tier A typecheck, lint/import rules, CSS checks, locale parity and production budgets. Compare first-load with a same-base main build; do not loosen caps.
- [x] 3.4 Run strict OpenSpec validation and record actual local/CI outcomes without marking blocked checks passed.
- [ ] 3.5 Attach a production-home recording and request human bilingual/phone review of motion feel, typography and CTA access. Report real-device LCP separately.
- [ ] 3.6 Prepare a separate draft hero-signature PR with tier/routes, mobile/reduced behavior, measured budgets and checks. Do not merge or modify the timeline draft awaiting manager decision.

## Local evidence — 2026-10-05

- Web typecheck and ESLint passed. Stylelint, reduced-motion CSS and locale parity passed.
- Seven hero SSR/wordmark and home composition tests passed.
- Next production build passed; authoritative budgets: home first-load 143.9/160 KB, deferred hero 28.7/45 KB. Same-base first-load comparison remains open.
- Browser fixture builds, but all 28 browser cases are blocked at browser launch by this host (Chromium MachPort permission denied; Firefox SIGABRT). These are NOT passing tests.
- A separate Tier B hero-signature workflow is added; the baseline workflow is unchanged. No remote CI run or production visual review is claimed.
- Static artwork, lifecycle and fallback code are implemented; task 1.4 remains open until mobile/no-JS browser verification. Deterministic progress fixtures and hidden-document assertions remain open under 3.1/3.2.
