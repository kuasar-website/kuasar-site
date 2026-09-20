## Context

See proposal.md and docs/task-assignments.html. DEV 5 owns presentation; DEV 3 owns git-content-pipeline and locale-routing, DEV 2 owns home-composition. The current base has no content loader or localized routes. Prepare a presentation component without inventing their APIs or taking over their files. Full integration remains explicitly unfinished.

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
- CSS cannot be verified by server snapshots → browser checks must cover overflow, keyboard, mobile and reduced motion separately; Tier A alone does not cover these.
- Turkish control copy → submit for native-speaking review; no translated historical records are invented.
- Optional image accessibility → require caller-provided alt text and intrinsic dimensions in the presentation shape; decorative imagery uses empty alt.

## Migration Plan

Submit an explicitly draft preparation change. Once upstream contracts land, add the DEV 5 route adapter, provide the home component to DEV 2, run Tier A plus dedicated browser scenarios, and obtain baseline review before any signature work. Reverting this preparation removes only its own component and artifacts.
