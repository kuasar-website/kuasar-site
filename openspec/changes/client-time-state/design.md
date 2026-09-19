## Context

See proposal.md and ADR 0001 §3. The current web app is a scaffold; four consumer
features do not exist yet. ADR 0004 describes Tier B but no browser workflow exists.
Read design/content-model.md, design/i18n.md and design/tokens.md for inputs and tokens.

## Goals / Non-Goals

Goals: reusable typed hooks and a date component with deterministic neutral hydration.
Non-goals: production routes, calendar UI, content fetching, CMS changes or motion.

## Decisions

- Use a shared external browser clock with a null server snapshot. Subscribe after
  mount, refresh every second and on focus/visibility, clean up after the last
  subscriber. This avoids one timer per record and server-clock leakage.
- Keep classification pure with an explicitly supplied clock, never a Date.now default.
  Strict ISO parsing rejects impossible dates and datetimes without offsets. Use UTC
  for date-only day boundaries; explicit display timezone defaults to UTC to prevent
  device-dependent hydration. Consumers can request Europe/Istanbul for timed events.
- User-confirmed edge semantics, not pre-existing repository requirements: an instant with
  no end becomes past at start; a date-only record spans its UTC day; ends are exclusive.
  Invalid/missing/reversed dates stay neutral. No invented event duration.
- A collection hook preserves the source array until mount, then returns a filtered,
  stable sorted copy; invalid dates sort last. DateTime applies only semantic tokens,
  with documented fallback values from design/tokens.md because scaffold CSS has not
  installed the full token system yet.
- Test an actual server-rendered React fixture hydrated in Chromium and Firefox using
  Playwright clocks. The fixture is outside production routes; esbuild bundles only
  the test harness. Keep these tools in tests/time/package.json with a separate
  lockfile to isolate test-only dependencies from the existing workspace lockfile.
  Reject a permanent demo route because it pollutes the site.
  Add a focused path-filtered Tier B workflow, without claiming Lighthouse/axe coverage.
- No runtime dependency or animation library. No L1/L2/L3 animation introduced; mobile
  and reduced-motion use the same static form. Existing production routes import none
  of this code, so their first-load JS delta is zero. Future consumers measure their
  bundles under Tier A before merging. No new Strapi field or locale-specific storage.

## Risks / Trade-offs

- Browser clock can be wrong → accepted browser-derived truth per ADR 0001.
- Background timers are throttled → refresh on focus and visibility restoration.
- UTC all-day semantics may differ from event-local days → explicit documented contract;
  consumers can supply offset datetimes for an event-local day instead.
- React fixture does not exercise Next routing → no routing API is changed; future
  consumer routes need their own integration checks.

## Migration Plan

Ship additive primitives and tests on change/client-time-state. Review and merge via PR.
Archive only after merge per docs/workflow.html. Revert the change to roll back; no data
migration exists and no ASSUMPTION line in docs/design is resolved by this change.
