## Why

Static pages must remain truthful as dates pass without a rebuild (ADR 0001 §3).
DEV 5 supplies the common primitive needed by four future consumers. It serves
credibility for sponsors and prospective members equally.

## What Changes

- Add neutral-first date components and browser clock hooks for time state.
- Support locale-aware dates and client-only collection filtering and ordering.
- Add controlled-clock browser coverage, including no-JavaScript rendering, to a
  focused Tier B workflow.
- Document the consumer API and boundary semantics.

## Capabilities

### New Capabilities
- `time-state`: Neutral server dates enhanced with browser-derived status and collections.

### Modified Capabilities
None.

## Impact

Changes live in apps/web/lib/time, apps/web/components/time, test tooling and CI.
No production route, calendar, timeline, CMS field or content record is introduced.
Entity storage remains unchanged. No new runtime dependencies; Playwright and esbuild
are development-only tools for a static React hydration fixture. No animation is added.
