## Why

The reviewed and merged timeline baseline already serves credibility for sponsors and prospective members. Its dedicated route can now add the L1 scroll-linked narrative specified by ADR 0003 without changing the permanent native home section, mobile experience or record ownership.

## What Changes

- Progressively enhance only /en/timeline and /tr/zaman-cizelgesi on eligible desktop: vertical scrolling advances from present to past across the horizontal timeline.
- Dynamically load GSAP, ScrollTrigger and @gsap/react, with scoped useGSAP and one matchMedia lifecycle; restore native behavior on reduced motion, mobile, keyboard use, failure or unmount.
- Keep the baseline readable with JavaScript disabled and every record reachable.
- Add deterministic browser checks, cleanup checks, route/deferred weight measurement and a screen recording for human review.

## Capabilities

### New Capabilities
- timeline-signature: L1 progressive scroll narrative over the native timeline.

### Modified Capabilities
None. Baseline content and storage stay unchanged.

## Impact

New runtime dependencies: gsap and @gsap/react, justified by ADR 0003 for this designated L1 route. No second animation/scroll library, no CMS schema, no content additions. Timeline records remain wholly in git. Gate mappings must recognize both localized timeline routes and their actual route group; no third L1 exemption is introduced. First-load delta must be measured against main; the task's unchanged-first-load criterion must not be claimed passed solely because the 175KB cap passes. Deferred animation cap remains 45KB.
