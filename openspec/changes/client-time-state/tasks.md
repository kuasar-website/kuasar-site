## 1. Neutral baseline

- [x] 1.1 Implement strict ISO parsing, explicit-clock classification and localized neutral dates.
- [x] 1.2 Add the date component with raw datetime and no server state markers.

## 2. Browser enhancement

- [x] 2.1 Add shared browser clock, lifecycle cleanup and time-state hooks.
- [x] 2.2 Add stable client collection filtering/sorting and semantic state styling.
- [x] 2.3 Document consumer usage, both locales, timezone and boundary contracts.

## 3. Verification

- [x] 3.1 Add controlled-clock Chromium/Firefox tests for both locales, no-JS, hydration, boundaries, invalid input and zero/one/fifty records.
- [x] 3.2 Add focused Tier B time-state CI gate; existing Tier A cannot prove browser time behavior.
- [ ] 3.3 Run OpenSpec strict validation, browser tests and applicable Tier A checks; record results and limitations for PR review.
