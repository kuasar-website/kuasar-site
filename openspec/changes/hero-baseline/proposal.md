## Why

The home hero must be complete before any signature animation is introduced. This DEV 5 change serves sponsors and prospective members equally with a legible team identity and entry points for both audiences.

## What Changes

- Prepare a static, server-compatible hero with the existing KUASAR artwork left-aligned on navy-black, with the exact team name beneath it.
- Support Turkish and English, mobile, reduced motion and JavaScript-disabled visitors without a loading sequence.
- Accept the site shell's audience actions as required composition slots; do not create another button system or invent destination URLs.
- Verify the isolated component before its integration into the localized home pages.

## Capabilities

### New Capabilities
- `hero-baseline`: The permanent static bilingual home hero and its audience entry points.

### Modified Capabilities
None.

## Impact

DEV 5 hero components, tests and OpenSpec artifacts only. No content entity, CMS schema or deployment changes. No new runtime dependency, animation library or scroll system. Site-shell is an upstream dependency in docs/task-assignments.html; its shared buttons, routing and home assembly remain DEV 2/DEV 3 responsibilities. Production integration and real-phone performance remain open until those contracts are available.
