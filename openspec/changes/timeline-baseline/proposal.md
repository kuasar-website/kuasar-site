## Why

KUASAR needs a readable history before the timeline signature animation is built. This DEV 5 change serves credibility for both sponsors and prospective members without ranking either audience.

## What Changes

- Build a native, horizontally scrolling timeline with CSS scroll-snap, keyboard access and explicit present-to-past direction in Turkish and English.
- Provide a reusable home-section variant and a complete timeline variant; hide empty collections and keep single entries legible.
- Integrate `/en/timeline` and `/tr/zaman-cizelgesi` with the upstream git-content and locale-routing contracts when available. Do not implement those other owners' systems here.
- Keep all dates neutral and raw in the zero-JavaScript baseline. No server clock, time-relative filtering or state colouring.

## Capabilities

### New Capabilities
- `timeline-baseline`: Accessible bilingual history, native scrolling and empty-state route behaviour.

### Modified Capabilities
None.

## Impact

DEV 5 components, tests and these OpenSpec artifacts. Timeline Entry remains entirely in git under `content/timeline/`; no CMS schema or server changes and no real content records are invented. No new runtime dependency, animation library or scroll system. Production integration depends on git-content-pipeline and client-time-state as listed in docs/task-assignments.html; shared locale routing and home composition remain their owners' responsibility. The isolated presentation can be prepared before those integrations, but the task must remain incomplete until routes and integration checks are done.
