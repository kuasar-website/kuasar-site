# Timeline signature verification

Run `npm ci --prefix tests/timeline-signature`, install Chromium/Firefox with
Playwright, then `npm --prefix tests/timeline-signature test` from the repository.
The fixture imports the production baseline and route-private enhancement. Synthetic
records are test-only; no production content is added. Videos are saved under this
suite's `test-results/` and uploaded by the dedicated Tier B workflow.

## Current evidence (2026-10-02)

- Web typecheck, ESLint, CSS checks, locale parity, 24 budget-unit tests and strict
  OpenSpec validation passed before the final import-selection optimization.
- In-app browser: narrow native baseline, desktop progression to the final record,
  and Escape removal of pinning/inline transform verified manually.
- Chromium/Firefox automation could not start locally due to host sandbox process
  restrictions. No automated browser pass is claimed. CI must run all 44 cases.
- Earlier production build measured 137.5 KB baseline versus 138.3 KB enhanced first
  load; deferred payload 46.0 KB exceeded 45 KB. Final rebuild is blocked locally by
  Turbopack's denied port binding. Budget limits have NOT been raised.
- Both the 45 KB cap and task's unchanged-first-load criterion remain open blockers.
- A recording and bilingual human motion review are still required. The named
  `/review-animations` skill was not found locally; the official GSAP React,
  ScrollTrigger and core guides were read. This is not a replacement for that review.

Do not mark this change ready or complete based only on successful fixture tests.
