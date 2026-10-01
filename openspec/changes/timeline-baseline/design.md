## Context

See proposal.md and docs/task-assignments.html. DEV 5 owns presentation; DEV 3 owns git-content-pipeline and locale-routing, DEV 2 owns home-composition. The 2026-09-28 base includes the merged git-content loader, locale helpers and site shell. The DEV 5 adapter consumes these contracts; home assembly remains DEV 2 scope.

Authority: ADR 0001 (neutral dates), ADR 0002 (git storage), ADR 0003 (native baseline first), ADR 0004 (verification), design/content-model.md, design/i18n.md, design/motion.md and design/tokens.md.

## Goals / Non-Goals

Goals: permanent, readable native baseline shared between the future home section and timeline route; data-driven zero/one/many rendering; bilingual controls and accessible direction.

Non-goals: implementing upstream loaders, locale router, site shell, home composition, CMS, deployment, real history records or timeline-signature. No infrastructure or other developer's change is edited.

## Decisions

- A server-compatible React component accepts a presentation-only entry shape (stable id, raw date, kind, localized title/body, optional image/link and translation notice). This is not a replacement storage schema. The future adapter uses the upstream loader once its actual contract exists.
- A semantic ordered list lives inside a focusable named horizontal scroll region. Cards use CSS scroll-snap proximity and native overflow; native keyboard and touch behaviour avoids a client carousel dependency. Every entry is focusable so keyboard users can reach even image-free and link-free entries.
- Display `Now / Şimdi` as a static axis label, not a clock value. Descending ISO date ordering is independent of wall-clock time; the server never decides which entries are past. Dates stay neutral in the baseline. A later optional state enhancement must reuse client-time-state, not duplicate it, and must not be required by the baseline.
- No animation tier is introduced: this is the non-animated predecessor to L1 on the timeline routes. No use-client directive or animation dependency; incremental application JavaScript is zero for this component when rendered as a Server Component. Whole-route budgets (home 160KB, timeline 175KB) must be measured after route integration; do not claim route budget completion from component tests.
- CSS uses merged semantic tokens and Inter. Native scrolling remains at every viewport; reduced motion explicitly disables snapping and smooth scrolling.
- The home variant requires its caller to provide the actual localized route URL, so it cannot invent navigation before routes exist. Empty input returns nothing. Route 404 behaviour belongs in the eventual route adapter and remains an open task.

## Risks / Trade-offs

- Upstream contracts absent → retain integration tasks, do not publish mock content or create competing loaders/routes.
- CSS cannot be verified by server snapshots → the dedicated Tier B timeline baseline workflow covers overflow, keyboard, touch gestures and reduced motion separately; Tier A alone does not cover these.
- Turkish control copy → submit for native-speaking review; no translated historical records are invented.
- Optional image accessibility → require caller-provided alt text and intrinsic dimensions in the presentation shape; decorative imagery uses empty alt.

## Migration Plan

Submit an explicitly draft preparation change. Once upstream contracts land, add the DEV 5 route adapter, provide the home component to DEV 2, run Tier A plus dedicated browser scenarios, and obtain baseline review before any signature work. Reverting this preparation removes only its own component and artifacts.

## Integration preparation (2026-09-25)

See integration.md for inspected PR contracts and remaining field/rendering decisions.
The presentation now supports an explicit page heading level and locale-stable entry
fragments; this enables route composition without creating routes or duplicating loaders.

## Integration implementation (2026-09-28)

- Two literal localized route folders avoid competing with the missions PR's dynamic
  `[section]` route. Each rejects the other locale and has a localized not-found boundary.
- `timelineViews` consumes the existing entry types and loader, validates title, renders
  MDX on the server, chooses the complete fallback language and labels it explicitly.
- New server-only dependencies: `@mdx-js/mdx` compiles the prose already returned by the
  loader; `sharp` reads actual dimensions from local public assets. No client import path
  reaches either package. No changes to the shared content schema or loader.
- Caption prose is data, not an executable widget: MDX expressions/imports/JSX and raw
  HTML fail with a file path. Standard Markdown is rendered, not printed or stripped.
  Heading markup is demoted to paragraphs to retain the page/entry heading hierarchy.
- Optional images use the facts path and a matching localized Markdown image alternative
  in each body. Missing/duplicate alt, missing assets and paths outside public fail.
- All valid shared ISO formats sort by instant rather than lexical order. Raw dates
  remain visible and no clock value is computed.
- `TimelineSection` provides the home handoff; no home page or navbar is changed.
- The route owner adds only populated timeline sitemap entries, gated by the existing
  site URL environment variable. No placeholder domain or empty timeline is advertised.

Human baseline review, populated production route measurements and home assembly remain
release work; test fixtures do not stand in for actual history or real-phone review.
